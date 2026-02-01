/*
  # Add time blocks to tasks

  1. Changes
    - Add `start_time` column (time, nullable) to `tasks` table
    - Add `end_time` column (time, nullable) to `tasks` table
    - Migrate existing `due_time` values to `start_time`
    - Add check constraint to ensure end_time > start_time when both are set

  2. Purpose
    - Enable tasks to have time blocks (start to end time ranges)
    - Support calendar time blocking and duration display
    - Maintain backward compatibility with existing due_time field

  3. Migration Strategy
    - Add new columns with nullable constraint
    - Copy existing due_time values to start_time
    - Keep due_time field for backward compatibility during transition

  4. Validation Rules
    - If end_time is set, start_time must also be set
    - end_time must be later than start_time (same-day blocks)
*/

-- Add start_time column to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE tasks ADD COLUMN start_time TIME;
  END IF;
END $$;

-- Add end_time column to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE tasks ADD COLUMN end_time TIME;
  END IF;
END $$;

-- Migrate existing due_time values to start_time
UPDATE tasks
SET start_time = due_time::time
WHERE due_time IS NOT NULL AND start_time IS NULL;

-- Add check constraint to ensure end_time is after start_time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_time_block_valid'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_time_block_valid
    CHECK (
      end_time IS NULL OR 
      start_time IS NOT NULL AND end_time > start_time
    );
  END IF;
END $$;

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_time_block ON tasks(due_date, start_time, end_time) WHERE start_time IS NOT NULL;
