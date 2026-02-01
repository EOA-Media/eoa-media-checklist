'use client';

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { DraggableTaskRow } from './DraggableTaskRow';
import type { TaskWithRecurrence } from '@/lib/supabase/types';
import { isTaskOverdue } from '@/lib/utils/date-helpers';

interface CategoryTaskSectionProps {
  categoryId: string | null;
  categoryName: string;
  categoryColor?: string | null;
  tasks: TaskWithRecurrence[];
  onToggleComplete: (id: string, completed: boolean) => Promise<void>;
  onEditTask: (task: TaskWithRecurrence) => void;
  onDeleteTask: (id: string) => Promise<void>;
}

export function CategoryTaskSection({
  categoryId,
  categoryName,
  categoryColor,
  tasks,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
}: CategoryTaskSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const storageKey = `category-expanded-${categoryId || 'uncategorized'}`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      setIsExpanded(stored === 'true');
    }
  }, [storageKey]);

  const toggleExpanded = () => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    localStorage.setItem(storageKey, String(newValue));
  };

  const { setNodeRef, isOver } = useDroppable({
    id: `category-${categoryId || 'uncategorized'}`,
    data: {
      type: 'category',
      categoryId,
    },
  });

  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="mb-4">
      <div
        ref={setNodeRef}
        className={`flex items-center gap-3 px-4 py-3 glass-panel border-white/10 rounded-xl cursor-pointer hover:border-white/20 hover:bg-white/[0.08] transition-all duration-200 ${
          isOver && !isExpanded ? 'border-blue-500/50 bg-blue-500/10' : ''
        }`}
        onClick={toggleExpanded}
      >
        <ChevronRight
          className={`h-4 w-4 text-gray-300 transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />

        {categoryColor && (
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
            style={{ backgroundColor: categoryColor }}
          />
        )}

        <h3 className="flex-1 font-semibold text-white">
          {categoryName}
        </h3>

        <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-white/5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => {
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
                  categoryColor={categoryColor || (categoryId ? undefined : '#64748b')}
                />
              );
            })}
          </SortableContext>

          {tasks.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              No tasks in this category
            </div>
          )}
        </div>
      )}
    </div>
  );
}
