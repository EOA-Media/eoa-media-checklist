'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskRow } from './TaskRow';
import type { TaskWithRecurrence } from '@/lib/supabase/types';

interface DraggableTaskRowProps {
  task: TaskWithRecurrence;
  isCompleted: boolean;
  isOverdue: boolean;
  hasRecurrence: boolean;
  onToggleComplete: (id: string, completed: boolean) => Promise<void>;
  onEditTask: (task: TaskWithRecurrence) => void;
  onDeleteTask: (id: string) => Promise<void>;
  categoryColor?: string;
}

export function DraggableTaskRow({
  task,
  isCompleted,
  isOverdue,
  hasRecurrence,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  categoryColor,
}: DraggableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskRow
        task={task}
        isCompleted={isCompleted}
        isOverdue={isOverdue}
        hasRecurrence={hasRecurrence}
        onToggleComplete={onToggleComplete}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        dragHandleProps={listeners}
        isDragging={isDragging}
        categoryColor={categoryColor}
      />
    </div>
  );
}
