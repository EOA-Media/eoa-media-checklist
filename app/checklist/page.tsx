'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2, Menu } from 'lucide-react';
import { CategorySidebar } from '@/components/CategorySidebar';
import { MobileCategoriesDrawer } from '@/components/MobileCategoriesDrawer';
import { TaskFormModal } from '@/components/TaskFormModal';
import { TaskList } from '@/components/TaskList';
import { CategorizedTaskList } from '@/components/CategorizedTaskList';
import type { Category, TaskWithRecurrence } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { shouldShowRecurringTask, shouldResetDailyTask, shouldDeleteCompletedTask } from '@/lib/utils/date-helpers';
import { AppLayout } from '@/components/AppLayout';

export default function ChecklistPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<TaskWithRecurrence[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRecurrence | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const initialize = async () => {
      await performMaintenance();
      await loadData();
    };

    initialize();

    // Run maintenance every 5 minutes
    const maintenanceInterval = setInterval(() => {
      performMaintenance();
    }, 5 * 60 * 1000);

    // Run maintenance when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performMaintenance();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(maintenanceInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadCategories(), loadTasks()]);
    setLoading(false);
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to load categories');
      return;
    }

    setCategories(data || []);
  };

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        category:categories(*),
        recurrence:task_recurrence(*)
      `)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load tasks');
      return;
    }

    setTasks(data || []);
  };

  const resetDailyRecurringTasks = async () => {
    try {
      const { data: tasksToReset } = await supabase
        .from('tasks')
        .select(`
          *,
          recurrence:task_recurrence(*)
        `)
        .not('completed_at', 'is', null);

      if (!tasksToReset) return;

      const tasksToResetIds = tasksToReset
        .filter((task) => {
          const pattern = task.recurrence?.pattern || 'none';
          return shouldResetDailyTask(task.completed_at, pattern);
        })
        .map((task) => task.id);

      if (tasksToResetIds.length > 0) {
        const { error } = await supabase
          .from('tasks')
          .update({ completed_at: null } as any)
          .in('id', tasksToResetIds);

        if (error) {
          console.error('Error resetting daily tasks:', error);
        } else {
          console.log(`Reset ${tasksToResetIds.length} daily recurring task(s)`);
          await loadTasks();
        }
      }
    } catch (err) {
      console.error('Error in resetDailyRecurringTasks:', err);
    }
  };

  const cleanupOldCompletedTasks = async () => {
    try {
      const { data: completedTasks } = await supabase
        .from('tasks')
        .select(`
          *,
          recurrence:task_recurrence(*)
        `)
        .not('completed_at', 'is', null);

      if (!completedTasks) return;

      const tasksToDelete = completedTasks
        .filter((task) => {
          const pattern = task.recurrence?.pattern || 'none';
          return shouldDeleteCompletedTask(task.completed_at, pattern);
        })
        .map((task) => task.id);

      if (tasksToDelete.length > 0) {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .in('id', tasksToDelete);

        if (error) {
          console.error('Error cleaning up old tasks:', error);
        } else {
          console.log(`Deleted ${tasksToDelete.length} old completed task(s)`);
          await loadTasks();
        }
      }
    } catch (err) {
      console.error('Error in cleanupOldCompletedTasks:', err);
    }
  };

  const performMaintenance = async () => {
    await resetDailyRecurringTasks();
    await cleanupOldCompletedTasks();
  };

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;

    if (selectedCategoryId) {
      filtered = filtered.filter((task) => task.category_id === selectedCategoryId);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.notes?.toLowerCase().includes(query)
      );
    }

    filtered = filtered.filter((task) => {
      const pattern = task.recurrence?.pattern || 'none';
      const weeklyDay = task.recurrence?.weekly_day || null;
      return shouldShowRecurringTask(task.due_date, task.completed_at, pattern, weeklyDay);
    });

    return filtered.sort((a, b) => {
      if (!!a.completed_at !== !!b.completed_at) {
        return a.completed_at ? 1 : -1;
      }

      const aHasTime = !!(a.due_date && a.due_time);
      const bHasTime = !!(b.due_date && b.due_time);

      if (aHasTime !== bHasTime) {
        return aHasTime ? -1 : 1;
      }

      if (a.due_date && b.due_date) {
        return a.due_date.localeCompare(b.due_date);
      }

      if (a.due_date !== b.due_date) {
        return a.due_date ? -1 : 1;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks, selectedCategoryId, searchQuery]);

  const handleCreateCategory = async (name: string, color: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Not authenticated');
        return;
      }

      const { error } = await supabase.from('categories').insert({
        name,
        color,
        user_id: userData.user.id
      } as any);

      if (error) {
        console.error('Category creation error:', error);
        toast.error(`Failed to create category: ${error.message}`);
        return;
      }

      toast.success('Category created');
      loadCategories();
    } catch (err: any) {
      console.error('Category creation error:', err);
      toast.error(`Failed to create category: ${err.message}`);
    }
  };

  const handleUpdateCategory = async (id: string, name: string, color: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name, color } as any)
        .eq('id', id);

      if (error) {
        console.error('Category update error:', error);
        toast.error(`Failed to update category: ${error.message}`);
        return;
      }

      toast.success('Category updated');
      loadCategories();
      loadTasks();
    } catch (err: any) {
      console.error('Category update error:', err);
      toast.error(`Failed to update category: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);

      if (error) {
        console.error('Category deletion error:', error);
        toast.error(`Failed to delete category: ${error.message}`);
        return;
      }

      toast.success('Category deleted');
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
      }
      loadCategories();
      loadTasks();
    } catch (err: any) {
      console.error('Category deletion error:', err);
      toast.error(`Failed to delete category: ${err.message}`);
    }
  };

  const handleCreateOrUpdateTask = async (data: any) => {
    setActionLoading(true);

    try {
      if (editingTask) {
        const { error: taskError } = await supabase
          .from('tasks')
          .update({
            title: data.title,
            notes: data.notes || '',
            category_id: data.categoryId === 'none' ? null : data.categoryId || null,
            due_date: data.dueDate || null,
            due_time: data.dueTime || null,
            start_time: data.startTime || null,
            end_time: data.endTime || null,
          } as any)
          .eq('id', editingTask.id);

        if (taskError) throw taskError;

        if (editingTask.recurrence) {
          const { error: recError } = await supabase
            .from('task_recurrence')
            .update({
              pattern: data.recurrencePattern,
              weekly_day: data.weeklyDay || null,
            } as any)
            .eq('task_id', editingTask.id);

          if (recError) throw recError;
        } else if (data.recurrencePattern !== 'none') {
          const { error: recError } = await supabase
            .from('task_recurrence')
            .insert({
              task_id: editingTask.id,
              pattern: data.recurrencePattern,
              weekly_day: data.weeklyDay || null,
            } as any);

          if (recError) throw recError;
        }

        toast.success('Task updated');
      } else {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .insert({
            user_id: userData.user.id,
            title: data.title,
            notes: data.notes || '',
            category_id: data.categoryId === 'none' ? null : data.categoryId || null,
            due_date: data.dueDate || null,
            due_time: data.dueTime || null,
            start_time: data.startTime || null,
            end_time: data.endTime || null,
          } as any)
          .select()
          .single();

        if (taskError) throw taskError;

        if (data.recurrencePattern !== 'none') {
          const { error: recError } = await supabase
            .from('task_recurrence')
            .insert({
              task_id: taskData.id,
              pattern: data.recurrencePattern,
              weekly_day: data.weeklyDay || null,
            } as any);

          if (recError) throw recError;
        }

        toast.success('Task created');
      }

      setEditingTask(null);
      setIsTaskModalOpen(false);
      loadTasks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask) return;

    setActionLoading(true);

    const { error } = await supabase.from('tasks').delete().eq('id', editingTask.id);

    if (error) {
      toast.error('Failed to delete task');
      setActionLoading(false);
      return;
    }

    toast.success('Task deleted');
    setEditingTask(null);
    setIsTaskModalOpen(false);
    setActionLoading(false);
    loadTasks();
  };

  const handleDeleteTaskById = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete task');
      return;
    }

    toast.success('Task deleted');
    loadTasks();
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed_at: completed ? new Date().toISOString() : null } as any)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update task');
      return;
    }

    toast.success(completed ? 'Task completed' : 'Task reopened');
    loadTasks();
  };

  const handleEditTask = (task: TaskWithRecurrence) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </AppLayout>
    );
  }

  const selectedCategory = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)
    : null;

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 lg:w-80 flex-shrink-0 overflow-y-auto">
          <CategorySidebar
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        </aside>

        {/* Mobile Categories Drawer */}
        <MobileCategoriesDrawer
          open={isMobileDrawerOpen}
          onOpenChange={setIsMobileDrawerOpen}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          onCreateCategory={handleCreateCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Top Controls */}
          <div className="md:hidden p-3 border-b border-white/10 glass-panel">
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="glass-input text-white hover:bg-white/10 h-10 px-3 font-medium"
              >
                <Menu className="h-4 w-4 mr-2" />
                Categories
              </Button>

              {selectedCategory && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg glass-panel border-white/10 flex-1 min-w-0"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedCategory.color || '#3b82f6' }}
                  />
                  <span className="text-sm text-white truncate font-medium">
                    {selectedCategory.name}
                  </span>
                </div>
              )}

              {!selectedCategory && (
                <div className="flex items-center px-3 py-2 rounded-lg glass-panel border-white/10 flex-1">
                  <span className="text-sm text-white font-medium">All Tasks</span>
                </div>
              )}

              <Button
                size="sm"
                onClick={handleNewTask}
                className="btn-gradient h-10 px-3 flex-shrink-0 font-medium"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-10 glass-input text-white placeholder:text-gray-400 h-10"
              />
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block p-6 border-b border-white/10 glass-panel">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">
                {selectedCategoryId
                  ? categories.find((c) => c.id === selectedCategoryId)?.name
                  : 'All Tasks'}
              </h2>
              <Button onClick={handleNewTask} className="btn-gradient font-medium">
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-10 glass-input text-white placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Task List with bottom padding for mobile nav */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6 pb-24 md:pb-6">
            {!selectedCategoryId ? (
              <CategorizedTaskList
                tasks={filteredAndSortedTasks}
                categories={categories}
                onToggleComplete={handleToggleComplete}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTaskById}
                onTasksReordered={loadTasks}
              />
            ) : (
              <TaskList
                tasks={filteredAndSortedTasks}
                onToggleComplete={handleToggleComplete}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTaskById}
                onTasksReordered={loadTasks}
              />
            )}
          </div>
        </main>
      </div>

      <TaskFormModal
        open={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleCreateOrUpdateTask}
        onDelete={editingTask ? handleDeleteTask : undefined}
        task={editingTask}
        categories={categories}
        loading={actionLoading}
      />

      <Toaster theme="dark" />
    </AppLayout>
  );
}
