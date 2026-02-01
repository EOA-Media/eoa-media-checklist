'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { DraggableTaskRow } from './DraggableTaskRow';
import { TaskRow } from './TaskRow';
import type { TaskWithRecurrence } from '@/lib/supabase/types';
import { isTaskOverdue } from '@/lib/utils/date-helpers';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface TaskListProps {
  tasks: TaskWithRecurrence[];
  onToggleComplete: (id: string, completed: boolean) => Promise<void>;
  onEditTask: (task: TaskWithRecurrence) => void;
  onDeleteTask: (id: string) => Promise<void>;
  onTasksReordered?: () => void;
}

export function TaskList({ tasks, onToggleComplete, onEditTask, onDeleteTask, onTasksReordered }: TaskListProps) {
  const [activeTask, setActiveTask] = useState<TaskWithRecurrence | null>(null);
  const [localTasks, setLocalTasks] = useState(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = localTasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    const oldIndex = localTasks.findIndex((t) => t.id === active.id);
    const newIndex = localTasks.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedTasks = arrayMove(localTasks, oldIndex, newIndex);
    setLocalTasks(reorderedTasks);

    const updates = reorderedTasks.map((task, index) => ({
      id: task.id,
      sort_order: index,
      category_id: task.category_id,
    }));

    await persistReorder(updates);
  };

  const persistReorder = async (updates: Array<{ id: string; sort_order: number; category_id: string | null }>) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('reorder_tasks', {
        task_updates: updates,
      });

      if (error) throw error;

      if (onTasksReordered) {
        onTasksReordered();
      }
    } catch (error) {
      console.error('Error reordering tasks:', error);
      toast.error('Failed to save task order');
      setLocalTasks(tasks);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg">No tasks yet</p>
        <p className="text-sm">Create your first task to get started</p>
      </div>
    );
  }

  const taskIds = localTasks.map((t) => t.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 md:space-y-2">
          {localTasks.map((task) => {
            const isCompleted = !!task.completed_at;
            const isOverdue = !isCompleted && isTaskOverdue(task.due_date, task.due_time);
            const hasRecurrence = !!(task.recurrence && task.recurrence.pattern !== 'none');

            return (
              <DraggableTaskRow
                key={task.id}
                task={task}
                isCompleted={isCompleted}
                isOverdue={isOverdue}
                hasRecurrence={hasRecurrence}
                onToggleComplete={onToggleComplete}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
              />
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeTask ? (
          <TaskRow
            task={activeTask}
            isCompleted={!!activeTask.completed_at}
            isOverdue={isTaskOverdue(activeTask.due_date, activeTask.due_time)}
            hasRecurrence={!!(activeTask.recurrence && activeTask.recurrence.pattern !== 'none')}
            onToggleComplete={() => {}}
            onEditTask={() => {}}
            onDeleteTask={() => {}}
            isDragging={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
