/*
  # Add sort_order column to tasks table

  1. Changes
    - Add `sort_order` column (integer, not null, default 0) to `tasks` table
    - Backfill existing tasks with sort_order based on created_at within each category group
    - Update ordering to include sort_order in queries

  2. Purpose
    - Enable drag-and-drop reordering of tasks within categories
    - Preserve user-defined task order across sessions
    - Support moving tasks between categories while maintaining order

  3. Backfill Strategy
    - For each user_id + category_id combination, assign sequential sort_order (0, 1, 2, ...)
    - Based on existing created_at order (oldest first)
    - Handles NULL category_id for uncategorized tasks
*/

-- Add sort_order column to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Backfill sort_order for existing tasks
-- Group by user_id and category_id (including NULL), order by created_at
DO $$
DECLARE
  task_record RECORD;
  current_user_id UUID;
  current_category_id UUID;
  counter INTEGER;
BEGIN
  -- Process each unique combination of user_id and category_id
  FOR task_record IN
    SELECT DISTINCT user_id, category_id
    FROM tasks
    ORDER BY user_id, category_id NULLS LAST
  LOOP
    counter := 0;
    current_user_id := task_record.user_id;
    current_category_id := task_record.category_id;
    
    -- Update tasks for this user+category combination
    UPDATE tasks
    SET sort_order = subquery.new_order
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 AS new_order
      FROM tasks
      WHERE user_id = current_user_id
        AND (
          (category_id = current_category_id) OR
          (category_id IS NULL AND current_category_id IS NULL)
        )
    ) AS subquery
    WHERE tasks.id = subquery.id;
  END LOOP;
END $$;

-- Create index on sort_order for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(user_id, category_id, sort_order);
