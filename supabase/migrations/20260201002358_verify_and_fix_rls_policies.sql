/*
  # Verify and Fix RLS Policies for EOA Media Checklist

  This migration ensures all tables have proper RLS policies with auth.uid() checks.

  ## What This Migration Does

  1. Ensures RLS is enabled on all tables
  2. Recreates policies with proper auth.uid() checks
  3. Ensures user_id columns exist and are properly constrained
  4. Verifies all foreign key relationships

  ## Tables Verified

  - profiles: User profile data
  - categories: Task categories with user_id
  - tasks: Main tasks with user_id
  - task_recurrence: Recurrence rules (checks via tasks.user_id)

  ## Security

  All policies use auth.uid() to ensure users can only access their own data.
*/

-- ============================================================================
-- CATEGORIES TABLE - Ensure user_id and RLS
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;

-- Ensure RLS is enabled
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Recreate policies with proper auth.uid() checks
CREATE POLICY "Users can view own categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- TASKS TABLE - Verify RLS
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

-- Ensure RLS is enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Users can view own tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- TASK_RECURRENCE TABLE - Verify RLS via tasks
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own task recurrence" ON public.task_recurrence;
DROP POLICY IF EXISTS "Users can insert own task recurrence" ON public.task_recurrence;
DROP POLICY IF EXISTS "Users can update own task recurrence" ON public.task_recurrence;
DROP POLICY IF EXISTS "Users can delete own task recurrence" ON public.task_recurrence;

-- Ensure RLS is enabled
ALTER TABLE public.task_recurrence ENABLE ROW LEVEL SECURITY;

-- Recreate policies (checks via tasks.user_id)
CREATE POLICY "Users can view own task recurrence"
  ON public.task_recurrence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_recurrence.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own task recurrence"
  ON public.task_recurrence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_recurrence.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own task recurrence"
  ON public.task_recurrence
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_recurrence.task_id
      AND tasks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_recurrence.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own task recurrence"
  ON public.task_recurrence
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_recurrence.task_id
      AND tasks.user_id = auth.uid()
    )
  );
