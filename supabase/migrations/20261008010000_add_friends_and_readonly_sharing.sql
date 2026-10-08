/*
  Friends and read-only checklist sharing.

  This migration deliberately keeps the existing owner-only task policies.
  Friend checklist data is exposed only through a narrow security-definer
  function that verifies an accepted friendship and returns safe fields.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CHECK (sender_id <> receiver_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_pending_pair_unique
  ON public.friend_requests (
    LEAST(sender_id::text, receiver_id::text),
    GREATEST(sender_id::text, receiver_id::text)
  )
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_a::text < user_b::text),
  UNIQUE (user_a, user_b)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view friend requests" ON public.friend_requests;
CREATE POLICY "Participants can view friend requests"
  ON public.friend_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Participants can view friendships" ON public.friendships;
CREATE POLICY "Participants can view friendships"
  ON public.friendships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE OR REPLACE FUNCTION public.set_username(requested_username TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_username TEXT := lower(trim(requested_username));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF normalized_username !~ '^[a-z0-9_]{3,24}$' THEN
    RAISE EXCEPTION 'Username must be 3-24 characters using letters, numbers, or underscores';
  END IF;

  UPDATE public.profiles
  SET username = normalized_username
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'That username is already taken';
END;
$$;

CREATE OR REPLACE FUNCTION public.search_profiles(search_term TEXT)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  relationship TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.name,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE (f.user_a = auth.uid() AND f.user_b = p.id)
           OR (f.user_b = auth.uid() AND f.user_a = p.id)
      ) THEN 'friends'
      WHEN EXISTS (
        SELECT 1 FROM public.friend_requests r
        WHERE r.status = 'pending'
          AND ((r.sender_id = auth.uid() AND r.receiver_id = p.id)
            OR (r.receiver_id = auth.uid() AND r.sender_id = p.id))
      ) THEN 'pending'
      ELSE 'none'
    END
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND p.username IS NOT NULL
    AND length(trim(search_term)) >= 3
    AND p.username ILIKE trim(search_term) || '%'
  ORDER BY
    CASE WHEN lower(p.username) = lower(trim(search_term)) THEN 0 ELSE 1 END,
    p.username
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.send_friend_request(target_username TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO target_id
  FROM public.profiles
  WHERE lower(username) = lower(trim(target_username));

  IF target_id IS NULL OR target_id = auth.uid() THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user_a = LEAST(auth.uid(), target_id) AND user_b = GREATEST(auth.uid(), target_id))
  ) THEN
    RAISE EXCEPTION 'You are already friends';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE status = 'pending'
      AND ((sender_id = auth.uid() AND receiver_id = target_id)
        OR (sender_id = target_id AND receiver_id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'A friend request is already pending';
  END IF;

  INSERT INTO public.friend_requests (sender_id, receiver_id)
  VALUES (auth.uid(), target_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_friend_request(
  request_id UUID,
  accept_request BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.friend_requests%ROWTYPE;
BEGIN
  SELECT * INTO request_row
  FROM public.friend_requests
  WHERE id = request_id
    AND receiver_id = auth.uid()
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found';
  END IF;

  IF accept_request THEN
    INSERT INTO public.friendships (user_a, user_b)
    VALUES (
      LEAST(request_row.sender_id, request_row.receiver_id),
      GREATEST(request_row.sender_id, request_row.receiver_id)
    )
    ON CONFLICT (user_a, user_b) DO NOTHING;
  END IF;

  UPDATE public.friend_requests
  SET
    status = CASE WHEN accept_request THEN 'accepted' ELSE 'declined' END,
    responded_at = now()
  WHERE id = request_row.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_friends()
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  display_name TEXT,
  friends_since TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.name,
    f.created_at
  FROM public.friendships f
  JOIN public.profiles p
    ON p.id = CASE WHEN f.user_a = auth.uid() THEN f.user_b ELSE f.user_a END
  WHERE f.user_a = auth.uid() OR f.user_b = auth.uid()
  ORDER BY lower(p.name), lower(p.username);
$$;

CREATE OR REPLACE FUNCTION public.get_friend_requests()
RETURNS TABLE (
  request_id UUID,
  direction TEXT,
  other_user_id UUID,
  username TEXT,
  display_name TEXT,
  requested_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    CASE WHEN r.receiver_id = auth.uid() THEN 'incoming' ELSE 'outgoing' END,
    p.id,
    p.username,
    p.name,
    r.created_at
  FROM public.friend_requests r
  JOIN public.profiles p
    ON p.id = CASE WHEN r.receiver_id = auth.uid() THEN r.sender_id ELSE r.receiver_id END
  WHERE r.status = 'pending'
    AND (r.sender_id = auth.uid() OR r.receiver_id = auth.uid())
  ORDER BY r.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.remove_friend(target_friend_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.friendships
  WHERE user_a = LEAST(auth.uid(), target_friend_id)
    AND user_b = GREATEST(auth.uid(), target_friend_id);
$$;

CREATE OR REPLACE FUNCTION public.get_friend_checklist(target_friend_id UUID)
RETURNS TABLE (
  task_id UUID,
  title TEXT,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  due_time TIME,
  category_id UUID,
  category_name TEXT,
  category_color TEXT,
  recurrence_pattern TEXT,
  daily_streak INTEGER,
  sort_order INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_a = LEAST(auth.uid(), target_friend_id)
      AND user_b = GREATEST(auth.uid(), target_friend_id)
  ) THEN
    RAISE EXCEPTION 'You can only view an accepted friend''s checklist';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.completed_at,
    t.due_date,
    t.due_time,
    c.id,
    c.name,
    c.color,
    COALESCE(tr.pattern, 'none')::TEXT,
    COALESCE(t.daily_streak, 0),
    t.sort_order
  FROM public.tasks t
  LEFT JOIN public.categories c ON c.id = t.category_id
  LEFT JOIN public.task_recurrence tr ON tr.task_id = t.id
  WHERE t.user_id = target_friend_id
  ORDER BY
    t.completed_at IS NOT NULL,
    c.created_at NULLS LAST,
    t.sort_order,
    t.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.set_username(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_profiles(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_friend_request(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_to_friend_request(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_friends() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_friend_requests() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_friend(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_friend_checklist(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.set_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_friend_request(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_checklist(UUID) TO authenticated;
