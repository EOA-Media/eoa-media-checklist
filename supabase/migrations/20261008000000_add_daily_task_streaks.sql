/*
  Persist the current completion streak for daily recurring tasks.

  The application updates these fields when a daily task is completed or
  reopened. A streak remains active through the following day and resets
  once a full day is missed.
*/

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS daily_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_streak_date DATE;

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_daily_streak_nonnegative;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_daily_streak_nonnegative CHECK (daily_streak >= 0);

UPDATE tasks
SET
  daily_streak = 1,
  last_streak_date = (completed_at AT TIME ZONE 'UTC')::date
FROM task_recurrence
WHERE task_recurrence.task_id = tasks.id
  AND task_recurrence.pattern = 'daily'
  AND tasks.completed_at IS NOT NULL
  AND tasks.daily_streak = 0;
