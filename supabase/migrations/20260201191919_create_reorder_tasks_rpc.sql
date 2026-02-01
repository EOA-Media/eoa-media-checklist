/*
  # Create RPC function for batch task reordering

  1. New Function
    - `reorder_tasks(task_updates jsonb)` - Batch update task sort_order and category_id
    
  2. Purpose
    - Enable efficient drag-and-drop operations with single database call
    - Update multiple tasks' sort_order and category_id simultaneously
    - Ensure atomic updates for consistent state

  3. Security
    - Function respects RLS policies (runs with invoker rights)
    - Only allows updates to tasks owned by the authenticated user

  4. Input Format
    - task_updates: array of objects with {id, sort_order, category_id}
    - Example: [{"id": "uuid", "sort_order": 0, "category_id": "uuid"}]
*/

-- Create function to batch update task ordering
CREATE OR REPLACE FUNCTION reorder_tasks(task_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  task_update jsonb;
BEGIN
  -- Loop through each task update
  FOR task_update IN SELECT * FROM jsonb_array_elements(task_updates)
  LOOP
    -- Update the task with new sort_order and category_id
    UPDATE tasks
    SET 
      sort_order = (task_update->>'sort_order')::integer,
      category_id = CASE 
        WHEN task_update->>'category_id' = 'null' OR task_update->>'category_id' IS NULL 
        THEN NULL 
        ELSE (task_update->>'category_id')::uuid 
      END,
      updated_at = now()
    WHERE id = (task_update->>'id')::uuid
      AND user_id = auth.uid();  -- Security: only update own tasks
  END LOOP;
END;
$$;
