/*
  PostgreSQL does not implicitly coerce varchar columns to text for a
  RETURNS TABLE function. Cast every returned scalar to the function's
  declared type so the sharing RPCs work with the existing schema.
*/

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
    c.id::UUID,
    c.name::TEXT,
    c.color::TEXT,
    EXISTS (
      SELECT 1
      FROM public.checklist_category_shares s
      WHERE s.owner_id = auth.uid()
        AND s.viewer_id = target_friend_id
        AND s.category_id = c.id
    )::BOOLEAN
  FROM public.categories c
  WHERE c.user_id = auth.uid()
  ORDER BY c.created_at;
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
    t.id::UUID,
    t.title::TEXT,
    t.completed_at::TIMESTAMPTZ,
    t.due_date::DATE,
    t.due_time::TIME,
    c.id::UUID,
    c.name::TEXT,
    c.color::TEXT,
    COALESCE(tr.pattern::TEXT, 'none'::TEXT),
    COALESCE(t.daily_streak, 0)::INTEGER,
    t.sort_order::INTEGER
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
REVOKE ALL ON FUNCTION public.get_friend_checklist(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_shareable_categories(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_checklist(UUID) TO authenticated;
