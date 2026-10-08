/*
  Explicit per-friend category sharing.

  A friendship allows users to connect, but checklist tasks are visible only
  when the checklist owner selects categories to share with that friend.
*/

CREATE TABLE IF NOT EXISTS public.checklist_category_shares (
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, viewer_id, category_id),
  CHECK (owner_id <> viewer_id)
);

ALTER TABLE public.checklist_category_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and viewers can view category shares"
  ON public.checklist_category_shares;
CREATE POLICY "Owners and viewers can view category shares"
  ON public.checklist_category_shares
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Owners can create category shares"
  ON public.checklist_category_shares;
CREATE POLICY "Owners can create category shares"
  ON public.checklist_category_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.categories
      WHERE categories.id = category_id
        AND categories.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.friendships
      WHERE user_a = LEAST(owner_id, viewer_id)
        AND user_b = GREATEST(owner_id, viewer_id)
    )
  );

DROP POLICY IF EXISTS "Owners can delete category shares"
  ON public.checklist_category_shares;
CREATE POLICY "Owners can delete category shares"
  ON public.checklist_category_shares
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.get_shareable_categories(target_friend_id UUID)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  category_color TEXT,
  shared BOOLEAN
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
    RAISE EXCEPTION 'You can only share with an accepted friend';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.color,
    EXISTS (
      SELECT 1
      FROM public.checklist_category_shares s
      WHERE s.owner_id = auth.uid()
        AND s.viewer_id = target_friend_id
        AND s.category_id = c.id
    )
  FROM public.categories c
  WHERE c.user_id = auth.uid()
  ORDER BY c.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shared_categories(
  target_friend_id UUID,
  shared_category_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_a = LEAST(auth.uid(), target_friend_id)
      AND user_b = GREATEST(auth.uid(), target_friend_id)
  ) THEN
    RAISE EXCEPTION 'You can only share with an accepted friend';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(shared_category_ids, ARRAY[]::UUID[])) requested_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.categories
      WHERE categories.id = requested_id
        AND categories.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'One or more categories do not belong to you';
  END IF;

  DELETE FROM public.checklist_category_shares
  WHERE owner_id = auth.uid()
    AND viewer_id = target_friend_id;

  INSERT INTO public.checklist_category_shares (owner_id, viewer_id, category_id)
  SELECT auth.uid(), target_friend_id, requested_id
  FROM unnest(COALESCE(shared_category_ids, ARRAY[]::UUID[])) requested_id
  ON CONFLICT DO NOTHING;
END;
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
  JOIN public.categories c ON c.id = t.category_id
  JOIN public.checklist_category_shares s
    ON s.category_id = c.id
    AND s.owner_id = target_friend_id
    AND s.viewer_id = auth.uid()
  LEFT JOIN public.task_recurrence tr ON tr.task_id = t.id
  WHERE t.user_id = target_friend_id
  ORDER BY
    t.completed_at IS NOT NULL,
    c.created_at,
    t.sort_order,
    t.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_shareable_categories(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_shared_categories(UUID, UUID[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_shareable_categories(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_shared_categories(UUID, UUID[]) TO authenticated;
