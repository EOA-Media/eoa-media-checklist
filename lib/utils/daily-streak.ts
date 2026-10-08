import { format, subDays } from 'date-fns';

export interface DailyStreakState {
  count: number;
  lastCompletedDate: string | null;
}

const STORAGE_KEY = 'eoa-daily-task-streaks';

export const getLocalDateKey = (date = new Date()) => format(date, 'yyyy-MM-dd');

export const getYesterdayDateKey = (date = new Date()) =>
  format(subDays(date, 1), 'yyyy-MM-dd');

export function completeDailyStreak(
  current: DailyStreakState,
  now = new Date()
): DailyStreakState {
  const today = getLocalDateKey(now);
  const yesterday = getYesterdayDateKey(now);

  if (current.lastCompletedDate === today) return current;

  return {
    count: current.lastCompletedDate === yesterday ? current.count + 1 : 1,
    lastCompletedDate: today,
  };
}

export function reopenDailyStreak(
  current: DailyStreakState,
  now = new Date()
): DailyStreakState {
  const today = getLocalDateKey(now);
  if (current.lastCompletedDate !== today) return current;

  const count = Math.max(0, current.count - 1);
  return {
    count,
    lastCompletedDate: count > 0 ? getYesterdayDateKey(now) : null,
  };
}

export function isDailyStreakExpired(
  lastCompletedDate: string | null,
  now = new Date()
): boolean {
  if (!lastCompletedDate) return false;
  return lastCompletedDate < getYesterdayDateKey(now);
}

const readStoredStreaks = (): Record<string, DailyStreakState> => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

export const getStoredDailyStreak = (taskId: string): DailyStreakState =>
  readStoredStreaks()[taskId] || { count: 0, lastCompletedDate: null };

export const setStoredDailyStreak = (taskId: string, streak: DailyStreakState) => {
  if (typeof window === 'undefined') return;
  const streaks = readStoredStreaks();
  if (streak.count > 0 && streak.lastCompletedDate) {
    streaks[taskId] = streak;
  } else {
    delete streaks[taskId];
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(streaks));
};

export const clearStoredDailyStreak = (taskId: string) => {
  if (typeof window === 'undefined') return;
  const streaks = readStoredStreaks();
  delete streaks[taskId];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(streaks));
};

export const hasDatabaseStreakFields = (task: object) =>
  Object.prototype.hasOwnProperty.call(task, 'daily_streak');
