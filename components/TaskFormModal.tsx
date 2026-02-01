'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import type { Category, TaskWithRecurrence } from '@/lib/supabase/types';
import { format } from 'date-fns';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
  categoryId: z.string().optional(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  recurrencePattern: z.enum(['none', 'daily', 'weekly']),
  weeklyDay: z.number().min(0).max(6).optional(),
}).refine((data) => {
  if (data.endTime && !data.startTime) {
    return false;
  }
  if (data.startTime && data.endTime) {
    return data.endTime > data.startTime;
  }
  return true;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  task?: TaskWithRecurrence | null;
  categories: Category[];
  loading?: boolean;
}

export function TaskFormModal({
  open,
  onClose,
  onSubmit,
  onDelete,
  task,
  categories,
  loading,
}: TaskFormModalProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      notes: '',
      categoryId: 'none',
      dueDate: '',
      dueTime: '',
      startTime: '',
      endTime: '',
      recurrencePattern: 'none',
      weeklyDay: undefined,
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        notes: task.notes || '',
        categoryId: task.category_id || 'none',
        dueDate: task.due_date || '',
        dueTime: task.due_time || '',
        startTime: task.start_time || '',
        endTime: task.end_time || '',
        recurrencePattern: task.recurrence?.pattern || 'none',
        weeklyDay: task.recurrence?.weekly_day || undefined,
      });
    } else {
      form.reset({
        title: '',
        notes: '',
        categoryId: 'none',
        dueDate: '',
        dueTime: '',
        startTime: '',
        endTime: '',
        recurrencePattern: 'none',
        weeklyDay: undefined,
      });
    }
  }, [task, form]);

  const handleSubmit = async (data: TaskFormValues) => {
    if ((data.dueTime || data.startTime) && !data.dueDate) {
      data.dueDate = format(new Date(), 'yyyy-MM-dd');
    }
    await onSubmit(data);
    form.reset();
    onClose();
  };

  const recurrencePattern = form.watch('recurrencePattern');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {task ? 'Edit Task' : 'New Task'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-200 font-medium">Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Task title"
                      className="glass-input text-white placeholder:text-gray-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-200 font-medium">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional notes..."
                      className="glass-input text-white placeholder:text-gray-400 min-h-[80px] resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-200 font-medium">Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="glass-input text-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-panel border-white/10 backdrop-blur-xl">
                      <SelectItem value="none" className="text-white hover:bg-white/10">None</SelectItem>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id}
                          className="text-white hover:bg-white/10"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color || '#3b82f6' }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200 font-medium">Due Date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="glass-input text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200 font-medium">Due Time</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="time"
                        className="glass-input text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="text-sm text-gray-300 font-medium">
                Time Block (optional)
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200 font-medium">Start Time</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="time"
                          className="glass-input text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200 font-medium">End Time</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="time"
                          className="glass-input text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-gray-400">
                Set start and end times to create a time block. Only tasks with a start time will appear on the calendar.
              </p>
            </div>

            <FormField
              control={form.control}
              name="recurrencePattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-200 font-medium">Recurrence</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="glass-input text-white">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-panel border-white/10 backdrop-blur-xl">
                      <SelectItem value="none" className="text-white hover:bg-white/10">None</SelectItem>
                      <SelectItem value="daily" className="text-white hover:bg-white/10">Repeat Daily</SelectItem>
                      <SelectItem value="weekly" className="text-white hover:bg-white/10">Repeat Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {recurrencePattern === 'weekly' && (
              <FormField
                control={form.control}
                name="weeklyDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200 font-medium">Weekly Day</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="glass-input text-white">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-panel border-white/10 backdrop-blur-xl">
                        <SelectItem value="0" className="text-white hover:bg-white/10">Sunday</SelectItem>
                        <SelectItem value="1" className="text-white hover:bg-white/10">Monday</SelectItem>
                        <SelectItem value="2" className="text-white hover:bg-white/10">Tuesday</SelectItem>
                        <SelectItem value="3" className="text-white hover:bg-white/10">Wednesday</SelectItem>
                        <SelectItem value="4" className="text-white hover:bg-white/10">Thursday</SelectItem>
                        <SelectItem value="5" className="text-white hover:bg-white/10">Friday</SelectItem>
                        <SelectItem value="6" className="text-white hover:bg-white/10">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="flex gap-2 sm:gap-0 pt-4">
              {task && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onDelete}
                  disabled={loading}
                  className="sm:mr-auto bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/30 transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="glass-input text-white hover:bg-white/10 transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="btn-gradient text-white font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    task ? 'Update' : 'Create'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
