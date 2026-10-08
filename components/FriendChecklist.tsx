'use client';

import { CheckCircle2, Circle, Flame, ListChecks } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { FriendProfile, SharedTask } from '@/lib/social/types';

interface FriendChecklistProps {
  friend: FriendProfile;
  tasks: SharedTask[];
  loading: boolean;
}

export function FriendChecklist({ friend, tasks, loading }: FriendChecklistProps) {
  if (loading) {
    return (
      <div className="surface-card flex min-h-[360px] items-center justify-center rounded-2xl text-sm text-slate-500">
        Loading checklist...
      </div>
    );
  }

  const completedCount = tasks.filter((task) => task.completed_at).length;
  const completionPercent = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  const groups = tasks.reduce((result, task) => {
    const key = task.category_id || 'uncategorized';
    if (!result[key]) {
      result[key] = {
        name: task.category_name || 'Uncategorized',
        color: task.category_color || '#64748b',
        tasks: [],
      };
    }
    result[key].tasks.push(task);
    return result;
  }, {} as Record<string, { name: string; color: string; tasks: SharedTask[] }>);

  return (
    <div className="space-y-5">
      <div className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow mb-1.5">Read-only checklist</div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {friend.display_name}&apos;s progress
            </h2>
            <p className="mt-1 text-sm text-slate-500">@{friend.username}</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-950/35 px-4 py-3">
            <div className="text-right">
              <div className="text-lg font-bold text-white">{completedCount}/{tasks.length}</div>
              <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Completed</div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/10 text-sm font-bold text-indigo-300">
              {completionPercent}%
            </div>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="surface-card flex min-h-[280px] flex-col items-center justify-center rounded-2xl text-center">
          <ListChecks className="mb-3 h-8 w-8 text-slate-600" />
          <p className="font-semibold text-slate-300">No shared tasks yet</p>
          <p className="mt-1 text-sm text-slate-500">
            This friend has not shared any category tasks with you.
          </p>
        </div>
      ) : (
        Object.entries(groups).map(([key, group]) => (
          <section key={key} className="surface-card overflow-hidden rounded-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800/70 px-4 py-3.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />
              <h3 className="flex-1 text-sm font-semibold text-slate-100">{group.name}</h3>
              <span className="rounded-md bg-slate-800/60 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {group.tasks.length}
              </span>
            </div>
            <div className="divide-y divide-slate-800/60">
              {group.tasks.map((task) => {
                const completed = !!task.completed_at;
                return (
                  <div key={task.task_id} className="flex items-center gap-3 px-4 py-3.5">
                    {completed ? (
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                    ) : (
                      <Circle className="h-5 w-5 flex-shrink-0 text-slate-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-medium ${completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                        {task.title}
                      </div>
                      {task.due_date && (
                        <div className="mt-0.5 text-[11px] text-slate-600">
                          {format(parseISO(task.due_date), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                    {task.recurrence_pattern === 'daily' && task.daily_streak > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/20 bg-orange-500/10 px-2 py-0.5 text-[11px] font-bold text-orange-300">
                        <Flame className="h-3 w-3 fill-orange-400 text-orange-400" />
                        {task.daily_streak}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      completed
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-800/70 text-slate-500'
                    }`}>
                      {completed ? 'Done' : 'Open'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
