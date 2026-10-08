'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
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

const categoryKey = (categoryId: string | null) => categoryId || 'uncategorized';

const categoryIdFromDropTarget = (
  overId: string,
  currentTasks: TaskWithRecurrence[]
): string | null | undefined => {
  if (overId.startsWith('category-')) {
    const id = overId.replace('category-', '');
    return id === 'uncategorized' ? null : id;
  }

  return currentTasks.find((task) => task.id === overId)?.category_id;
};

const sortCategoryTasks = (categoryTasks: TaskWithRecurrence[]) =>
  [...categoryTasks].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

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
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const groupedTasks = localTasks.reduce((groups, task) => {
    const key = categoryKey(task.category_id);
    groups[key] = groups[key] || [];
    groups[key].push(task);
    return groups;
  }, {} as Record<string, TaskWithRecurrence[]>);

  Object.keys(groupedTasks).forEach((key) => {
    groupedTasks[key] = sortCategoryTasks(groupedTasks[key]);
  });

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = localTasks.find((item) => item.id === active.id);
    if (task) setActiveTask({ ...task });
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setLocalTasks((currentTasks) => {
      const draggedTask = currentTasks.find((task) => task.id === activeId);
      const targetCategoryId = categoryIdFromDropTarget(overId, currentTasks);

      if (!draggedTask || targetCategoryId === undefined || draggedTask.category_id === targetCategoryId) {
        return currentTasks;
      }

      const targetTasks = sortCategoryTasks(
        currentTasks.filter(
          (task) => task.id !== activeId && categoryKey(task.category_id) === categoryKey(targetCategoryId)
        )
      );
      const overIndex = targetTasks.findIndex((task) => task.id === overId);
      const nextOrder = overIndex >= 0 ? overIndex : targetTasks.length;

      return currentTasks.map((task) =>
        task.id === activeId
          ? { ...task, category_id: targetCategoryId, sort_order: nextOrder }
          : task
      );
    });
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveTask(null);
    setLocalTasks(tasks);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    const originalTask = activeTask || tasks.find((task) => task.id === active.id) || null;
    setActiveTask(null);

    if (!over || !originalTask) {
      setLocalTasks(tasks);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    const targetCategoryId = categoryIdFromDropTarget(overId, localTasks);

    if (targetCategoryId === undefined) {
      setLocalTasks(tasks);
      return;
    }

    const sourceKey = categoryKey(originalTask.category_id);
    const targetKey = categoryKey(targetCategoryId);

    const sourceTasks = sortCategoryTasks(
      localTasks.filter(
        (task) => task.id !== activeId && categoryKey(task.category_id) === sourceKey
      )
    );
    const targetTasks = sourceKey === targetKey
      ? sourceTasks
      : sortCategoryTasks(
          localTasks.filter(
            (task) => task.id !== activeId && categoryKey(task.category_id) === targetKey
          )
        );

    const overIndex = targetTasks.findIndex((task) => task.id === overId);
    const insertIndex = overId.startsWith('category-')
      ? targetTasks.length
      : overIndex >= 0
        ? overIndex
        : targetTasks.length;

    const movedTask = {
      ...originalTask,
      category_id: targetCategoryId,
    };
    const reorderedTarget = [...targetTasks];
    reorderedTarget.splice(insertIndex, 0, movedTask);

    const sourceOrder = new Map(sourceTasks.map((task, index) => [task.id, index]));
    const targetOrder = new Map(reorderedTarget.map((task, index) => [task.id, index]));

    const updatedTasks = localTasks.map((task) => {
      if (task.id === activeId) {
        return {
          ...task,
          category_id: targetCategoryId,
          sort_order: targetOrder.get(task.id) ?? 0,
        };
      }

      const key = categoryKey(task.category_id);
      if (key === targetKey) {
        return { ...task, sort_order: targetOrder.get(task.id) ?? task.sort_order };
      }
      if (sourceKey !== targetKey && key === sourceKey) {
        return { ...task, sort_order: sourceOrder.get(task.id) ?? task.sort_order };
      }
      return task;
    });

    setLocalTasks(updatedTasks);

    const affectedKeys = new Set([sourceKey, targetKey]);
    const updates = updatedTasks
      .filter((task) => affectedKeys.has(categoryKey(task.category_id)))
      .map((task) => ({
        id: task.id,
        sort_order: task.sort_order,
        category_id: task.category_id,
      }));

    await persistReorder(updates);
  };

  const persistReorder = async (
    updates: Array<{ id: string; sort_order: number; category_id: string | null }>
  ) => {
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

  if (localTasks.length === 0 && categories.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-slate-300">
        <p className="text-lg font-semibold">No tasks yet</p>
        <p className="mt-1 text-sm text-slate-500">Create your first task to get started</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {categories.map((category) => (
          <CategoryTaskSection
            key={category.id}
            categoryId={category.id}
            categoryName={category.name}
            categoryColor={category.color}
            tasks={groupedTasks[category.id] || []}
            onToggleComplete={onToggleComplete}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}

        <CategoryTaskSection
          categoryId={null}
          categoryName="Uncategorized"
          tasks={groupedTasks.uncategorized || []}
          onToggleComplete={onToggleComplete}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
        />
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
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
