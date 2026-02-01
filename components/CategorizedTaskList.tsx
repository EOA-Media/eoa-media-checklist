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
  DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { CategoryTaskSection } from './CategoryTaskSection';
import { TaskRow } from './TaskRow';
import type { TaskWithRecurrence } from '@/lib/supabase/types';
import { isTaskOverdue } from '@/lib/utils/date-helpers';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface CategorizedTaskListProps {
  tasks: TaskWithRecurrence[];
  categories: Category[];
  onToggleComplete: (id: string, completed: boolean) => Promise<void>;
  onEditTask: (task: TaskWithRecurrence) => void;
  onDeleteTask: (id: string) => Promise<void>;
  onTasksReordered: () => void;
}

export function CategorizedTaskList({
  tasks,
  categories,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onTasksReordered,
}: CategorizedTaskListProps) {
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

  const groupedTasks = localTasks.reduce((acc, task) => {
    const key = task.category_id || 'uncategorized';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(task);
    return acc;
  }, {} as Record<string, TaskWithRecurrence[]>);

  Object.keys(groupedTasks).forEach((key) => {
    groupedTasks[key].sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = localTasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = localTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    if (overId.startsWith('category-')) {
      const targetCategoryId = overId.replace('category-', '');
      const newCategoryId = targetCategoryId === 'uncategorized' ? null : targetCategoryId;

      if (activeTask.category_id !== newCategoryId) {
        setLocalTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === activeId
              ? { ...t, category_id: newCategoryId }
              : t
          )
        );
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = localTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    let targetCategoryId: string | null = activeTask.category_id;

    if (overId.startsWith('category-')) {
      const categoryKey = overId.replace('category-', '');
      targetCategoryId = categoryKey === 'uncategorized' ? null : categoryKey;
    } else {
      const overTask = localTasks.find((t) => t.id === overId);
      if (overTask) {
        targetCategoryId = overTask.category_id;
      }
    }

    const sourceCategoryKey = activeTask.category_id || 'uncategorized';
    const targetCategoryKey = targetCategoryId || 'uncategorized';

    if (sourceCategoryKey === targetCategoryKey && activeId !== overId) {
      const categoryTasks = groupedTasks[sourceCategoryKey] || [];
      const oldIndex = categoryTasks.findIndex((t) => t.id === activeId);
      const newIndex = categoryTasks.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedTasks = arrayMove(categoryTasks, oldIndex, newIndex);

        const updatedTasks = localTasks.map((task) => {
          if ((task.category_id || 'uncategorized') === sourceCategoryKey) {
            const newOrder = reorderedTasks.findIndex((t) => t.id === task.id);
            return { ...task, sort_order: newOrder };
          }
          return task;
        });

        setLocalTasks(updatedTasks);

        const updates = reorderedTasks.map((task, index) => ({
          id: task.id,
          sort_order: index,
          category_id: task.category_id,
        }));

        await persistReorder(updates);
      }
    } else if (sourceCategoryKey !== targetCategoryKey) {
      const targetCategoryTasks = groupedTasks[targetCategoryKey] || [];
      const insertIndex = overId.startsWith('category-')
        ? 0
        : targetCategoryTasks.findIndex((t) => t.id === overId);

      const updatedTasks = localTasks.map((task) => {
        if (task.id === activeId) {
          return {
            ...task,
            category_id: targetCategoryId,
            sort_order: insertIndex >= 0 ? insertIndex : 0,
          };
        }

        if ((task.category_id || 'uncategorized') === targetCategoryKey) {
          const currentIndex = targetCategoryTasks.findIndex((t) => t.id === task.id);
          if (insertIndex >= 0 && currentIndex >= insertIndex) {
            return { ...task, sort_order: task.sort_order + 1 };
          }
        }

        return task;
      });

      setLocalTasks(updatedTasks);

      const sourceUpdates = updatedTasks
        .filter((t) => (t.category_id || 'uncategorized') === sourceCategoryKey)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((task, index) => ({
          id: task.id,
          sort_order: index,
          category_id: task.category_id,
        }));

      const targetUpdates = updatedTasks
        .filter((t) => (t.category_id || 'uncategorized') === targetCategoryKey)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((task, index) => ({
          id: task.id,
          sort_order: index,
          category_id: task.category_id,
        }));

      await persistReorder([...sourceUpdates, ...targetUpdates]);
    }
  };

  const persistReorder = async (updates: Array<{ id: string; sort_order: number; category_id: string | null }>) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('reorder_tasks', {
        task_updates: updates,
      });

      if (error) throw error;

      onTasksReordered();
    } catch (error) {
      console.error('Error reordering tasks:', error);
      toast.error('Failed to save task order');
      setLocalTasks(tasks);
    }
  };

  const categoriesWithTasks = categories
    .map((cat) => ({
      ...cat,
      tasks: groupedTasks[cat.id] || [],
    }))
    .filter((cat) => cat.tasks.length > 0);

  const uncategorizedTasks = groupedTasks['uncategorized'] || [];

  if (localTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-300">
        <p className="text-lg font-semibold">No tasks yet</p>
        <p className="text-sm text-gray-400 mt-1">Create your first task to get started</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {categoriesWithTasks.map((category) => (
          <CategoryTaskSection
            key={category.id}
            categoryId={category.id}
            categoryName={category.name}
            categoryColor={category.color}
            tasks={category.tasks}
            onToggleComplete={onToggleComplete}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}

        {uncategorizedTasks.length > 0 && (
          <CategoryTaskSection
            categoryId={null}
            categoryName="Uncategorized"
            tasks={uncategorizedTasks}
            onToggleComplete={onToggleComplete}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        )}
      </div>

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
