import { format, parseISO, isAfter, isBefore, addHours, startOfDay, startOfToday } from 'date-fns';

export function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch {
    return '';
  }
}

export function formatTime(timeString: string | null): string {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  } catch {
    return '';
  }
}

export function formatDateTime(dateString: string | null, timeString: string | null): string {
  if (!dateString) return '';
  const datePart = formatDate(dateString);
  const timePart = formatTime(timeString);
  return timePart ? `${datePart} at ${timePart}` : datePart;
}

export function combineDateAndTime(date: string, time: string): Date {
  const [hours, minutes] = time.split(':');
  const combined = parseISO(date);
  combined.setHours(parseInt(hours), parseInt(minutes));
  return combined;
}

export function isTaskOverdue(dueDate: string | null, dueTime: string | null): boolean {
  if (!dueDate) return false;

  const now = new Date();
  if (dueTime) {
    const taskDateTime = combineDateAndTime(dueDate, dueTime);
    return isBefore(taskDateTime, now);
  }

  const taskDate = startOfDay(parseISO(dueDate));
  const today = startOfDay(now);
  return isBefore(taskDate, today);
}

export function shouldAutoDelete(completedAt: string, pattern: string): boolean {
  if (!completedAt || pattern !== 'none') return false;

  const completed = parseISO(completedAt);
  const deletionTime = addHours(completed, 24);
  const now = new Date();

  return isAfter(now, deletionTime);
}

export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

export function shouldShowRecurringTask(
  dueDate: string | null,
  completedAt: string | null,
  pattern: string,
  weeklyDay: number | null
): boolean {
  // All non-recurring tasks are always shown (they handle their own 24h deletion)
  if (pattern === 'none') return true;

  // Daily recurring tasks: ALWAYS show them, whether completed or not
  // They will be reset at midnight by the reset function
  if (pattern === 'daily') {
    return true;
  }

  // Weekly recurring tasks: show on the designated day
  if (pattern === 'weekly') {
    if (weeklyDay === null) return true;

    const now = new Date();
    const todayDay = getDayOfWeek(now);

    // Only show on the designated weekly day
    return todayDay === weeklyDay;
  }

  return true;
}

export function shouldResetDailyTask(completedAt: string | null, pattern: string): boolean {
  // Only reset daily recurring tasks
  if (pattern !== 'daily' || !completedAt) return false;

  const completed = startOfDay(parseISO(completedAt));
  const today = startOfToday();

  // If completed before today, it should be reset
  return isBefore(completed, today);
}

export function shouldDeleteCompletedTask(
  completedAt: string | null,
  pattern: string
): boolean {
  // Only delete non-recurring tasks
  if (!completedAt || pattern !== 'none') return false;

  const completed = parseISO(completedAt);
  const deletionTime = addHours(completed, 24);
  const now = new Date();

  // Delete if completed more than 24 hours ago
  return isAfter(now, deletionTime);
}
