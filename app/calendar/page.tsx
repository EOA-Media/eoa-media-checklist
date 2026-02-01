'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { TaskFormModal } from '@/components/TaskFormModal';
import type { Category, TaskWithRecurrence } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';
import { combineDateAndTime, shouldResetDailyTask, shouldDeleteCompletedTask } from '@/lib/utils/date-helpers';
import { AppLayout } from '@/components/AppLayout';
import './calendar.css';

export default function CalendarPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<TaskWithRecurrence[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRecurrence | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
      .not('due_date', 'is', null)
      .not('start_time', 'is', null)
      .order('due_date', { ascending: true });

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

  const calendarEvents = tasks
    .filter((task) => task.due_date && task.start_time && !task.completed_at)
    .map((task) => {
      const startDateTime = combineDateAndTime(task.due_date!, task.start_time!);

      let endDateTime;
      if (task.end_time) {
        endDateTime = combineDateAndTime(task.due_date!, task.end_time!);
      } else {
        const start = new Date(startDateTime);
        start.setMinutes(start.getMinutes() + 30);
        endDateTime = start.toISOString();
      }

      return {
        id: task.id,
        title: task.title,
        start: startDateTime,
        end: endDateTime,
        backgroundColor: task.category?.color || '#3b82f6',
        borderColor: task.category?.color || '#3b82f6',
        extendedProps: {
          task,
        },
      };
    });

  const handleEventClick = (info: any) => {
    const task = info.event.extendedProps.task;
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleDateClick = (info: any) => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] overflow-hidden">
        <div className="h-full p-4 md:p-6 overflow-auto pb-24 md:pb-6">
          <div className="glass-panel border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-xl">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              events={calendarEvents}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              height="auto"
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short',
              }}
              slotLabelFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short',
              }}
              nowIndicator={true}
              editable={false}
              selectable={true}
              contentHeight="auto"
              aspectRatio={1.8}
            />
          </div>
        </div>
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
