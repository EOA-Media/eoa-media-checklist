'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, Calendar as CalendarIcon, Repeat, Edit2, Trash2, MoreVertical, GripVertical } from 'lucide-react';
import type { TaskWithRecurrence } from '@/lib/supabase/types';
import { format } from 'date-fns';

interface TaskRowProps {
  task: TaskWithRecurrence;
  isCompleted: boolean;
  isOverdue: boolean;
  hasRecurrence: boolean;
  onToggleComplete: (id: string, completed: boolean) => void;
  onEditTask: (task: TaskWithRecurrence) => void;
  onDeleteTask: (id: string) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
  style?: React.CSSProperties;
  categoryColor?: string;
}

export function TaskRow({
  task,
  isCompleted,
  isOverdue,
  hasRecurrence,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  dragHandleProps,
  isDragging = false,
  style,
  categoryColor,
}: TaskRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDateTime = (date: string, time: string | null) => {
    if (!time) {
      return format(new Date(date), 'MMM d, yyyy');
    }
    const [hours, minutes] = time.split(':');
    const dateTime = new Date(date);
    dateTime.setHours(parseInt(hours), parseInt(minutes));
    return format(dateTime, 'MMM d, h:mm a');
  };

  const formatTimeBlock = (startTime: string | null, endTime: string | null) => {
    if (!startTime) return null;

    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    };

    if (endTime) {
      return `${formatTime(startTime)} – ${formatTime(endTime)}`;
    }
    return formatTime(startTime);
  };

  const handleRowClick = () => {
    onToggleComplete(task.id, !isCompleted);
  };

  const handleEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onEditTask(task);
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDeleteTask(task.id);
    setShowDeleteConfirm(false);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleDragHandleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <div
        className={`glass-panel border-white/10 rounded-xl hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 cursor-pointer group relative overflow-hidden ${
          isCompleted ? 'opacity-60' : ''
        } ${isDragging ? 'opacity-50 scale-105 shadow-xl shadow-blue-500/30 border-blue-500/50' : ''}`}
        onClick={handleRowClick}
        style={style}
      >
        {categoryColor && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
            style={{ backgroundColor: categoryColor, opacity: 0.8 }}
          />
        )}
        <div className="px-3 py-3.5 md:px-4 md:py-4">
          <div className="flex items-start gap-2.5">
            {dragHandleProps && (
              <div
                {...dragHandleProps}
                className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleDragHandleClick}
              >
                <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-200 transition-colors" />
              </div>
            )}

            <div
              className="pt-0.5 touch-manipulation flex-shrink-0"
              onClick={handleCheckboxClick}
            >
              <Checkbox
                checked={isCompleted}
                onCheckedChange={(checked) => {
                  onToggleComplete(task.id, !!checked);
                }}
                className="h-5 w-5 md:h-[22px] md:w-[22px] rounded-md border-2 border-gray-300 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600 data-[state=checked]:border-transparent data-[state=checked]:shadow-md data-[state=checked]:shadow-purple-500/30 transition-all"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h3
                  className={`font-semibold text-white text-[17px] md:text-lg leading-snug ${
                    isCompleted ? 'line-through' : ''
                  }`}
                >
                  {task.title}
                </h3>
                {hasRecurrence && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-[11px] text-blue-400/80 font-medium flex-shrink-0">
                    <Repeat className="h-2.5 w-2.5" />
                    <span className="hidden sm:inline">
                      {task.recurrence?.pattern === 'daily' ? 'Daily' : 'Weekly'}
                    </span>
                  </span>
                )}
              </div>

              {task.category && !categoryColor && (
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: task.category.color || '#3b82f6' }}
                  >
                    {task.category.name}
                  </span>
                </div>
              )}

              {task.notes && (
                <p className="text-sm text-gray-300 mt-1.5 mb-2.5 line-clamp-2 leading-relaxed">
                  {task.notes}
                </p>
              )}

              {(task.due_date || task.start_time) && (
                <div className="flex items-center gap-4 text-sm">
                  {task.due_date && (
                    <div
                      className={`flex items-center gap-1.5 ${
                        isOverdue ? 'text-red-400' : 'text-gray-400'
                      }`}
                    >
                      {task.due_time ? (
                        <>
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate font-medium">
                            {formatDateTime(task.due_date, task.due_time)}
                          </span>
                        </>
                      ) : (
                        <>
                          <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate font-medium">
                            {formatDateTime(task.due_date, null)}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {task.start_time && (
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate font-medium">
                        {formatTimeBlock(task.start_time, task.end_time)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-shrink-0" onClick={handleMenuClick}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-panel border-white/10 backdrop-blur-xl text-white">
                  <DropdownMenuItem
                    onClick={handleEdit}
                    className="hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="hover:bg-red-500/20 cursor-pointer text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="glass-panel border-white/10 text-white backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">Delete Task</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-input text-white hover:bg-white/10 transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/30 transition-colors"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
