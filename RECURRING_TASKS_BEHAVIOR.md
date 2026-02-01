# Recurring Tasks Behavior Documentation

This document explains how recurring tasks work in the EOA Media Checklist app, including completion behavior, visibility rules, and automatic reset/cleanup logic.

## Overview

The app supports three types of tasks:
1. **Non-recurring tasks** (`pattern: 'none'`) - One-time tasks
2. **Daily recurring tasks** (`pattern: 'daily'`) - Repeat every day
3. **Weekly recurring tasks** (`pattern: 'weekly'`) - Repeat on a specific day of the week

## Task Completion Behavior

### When ANY Task is Checked Complete

1. ✅ Set `completed_at = now()`
2. ✅ Task remains visible in the list
3. ✅ Apply "completed" UI styling:
   - Checkbox shows checked state
   - Title has strikethrough (`line-through`)
   - Task has reduced opacity (`opacity-60`)
   - Faded appearance

### Non-Recurring Tasks

**Auto-Delete After 24 Hours**
- Non-recurring tasks automatically delete 24 hours after being marked complete
- Cleanup runs automatically:
  - On app load (both checklist and calendar pages)
  - Every 5 minutes while app is open
  - When user returns focus to the tab (visibility change)

**Example Timeline:**
```
Monday 10:00 AM - Task "Buy groceries" marked complete
Tuesday 10:00 AM - Task automatically deleted (24 hours later)
```

### Daily Recurring Tasks

**Never Auto-Delete**
- Daily recurring tasks are NEVER automatically deleted
- They remain visible even when completed (with faded/strikethrough styling)

**Midnight Reset**
- At midnight, daily recurring tasks automatically reset:
  - `completed_at` is set to `null`
  - Task becomes unchecked and appears active again
- Reset happens automatically:
  - On app load (checks if any tasks need reset)
  - Every 5 minutes while app is open
  - When user returns focus to the tab

**Example Timeline:**
```
Monday 10:00 AM - Task "Morning exercise" marked complete (stays visible, faded)
Monday 11:59 PM - Task still shows as completed
Tuesday 12:00 AM - Task automatically resets (becomes unchecked)
Tuesday 10:00 AM - User can complete it again
```

### Weekly Recurring Tasks

**Show Only on Designated Day**
- Weekly recurring tasks only appear on their designated day (0-6, where 0 = Sunday)
- On other days, they are hidden from the list
- When completed, they remain visible until the day changes
- They reset when their designated day comes around again

**Example:**
- Task set to repeat on Wednesdays (day 3)
- Only visible on Wednesdays
- Completing it on Wednesday keeps it visible (faded) until Thursday
- Disappears on Thursday-Tuesday
- Reappears unchecked next Wednesday

## Visual Indicators

### Completed Task Appearance
- ✅ Checkbox checked
- ~~Strikethrough text~~
- Reduced opacity (60%)
- Still visible in the list

### Recurring Task Badge
All recurring tasks show a badge indicating their pattern:
- 🔄 "Daily" badge for daily tasks
- 🔄 "Weekly" badge for weekly tasks
- Badge appears next to the task title in blue text
- Repeat icon (🔄) helps identify recurring tasks at a glance

## Implementation Details

### UI Filtering Logic

**File:** `lib/utils/date-helpers.ts`

Function: `shouldShowRecurringTask()`

```typescript
// Non-recurring tasks: always show (they handle their own 24h deletion)
if (pattern === 'none') return true;

// Daily recurring: ALWAYS show, whether completed or not
if (pattern === 'daily') return true;

// Weekly recurring: show only on designated day
if (pattern === 'weekly') {
  return todayDay === weeklyDay;
}
```

### Midnight Reset Logic

**Files:**
- `app/checklist/page.tsx`
- `app/calendar/page.tsx`

Function: `resetDailyRecurringTasks()`

```typescript
// Find all completed daily recurring tasks
// Check if completed_at is before today (startOfToday)
// If yes, set completed_at = null
// Result: task becomes unchecked and active
```

**Trigger Conditions:**
1. On page load/mount
2. Every 5 minutes (automatic interval)
3. When user returns to tab (visibility change event)

### 24-Hour Cleanup Logic

Function: `cleanupOldCompletedTasks()`

```typescript
// Find all completed tasks
// Filter to only non-recurring (pattern === 'none')
// Check if completed_at is more than 24 hours ago
// If yes, delete the task from database
```

**Trigger Conditions:**
1. On page load/mount
2. Every 5 minutes (automatic interval)
3. When user returns to tab (visibility change event)

### Maintenance Routine

Both checklist and calendar pages run a combined maintenance routine:

```typescript
const performMaintenance = async () => {
  await resetDailyRecurringTasks();
  await cleanupOldCompletedTasks();
};

// Called on app load
await performMaintenance();
await loadData();

// Called every 5 minutes
setInterval(() => performMaintenance(), 5 * 60 * 1000);

// Called when user returns to tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    performMaintenance();
  }
});
```

## User Experience Flow

### Creating a Daily Task

1. User creates task "Morning meditation"
2. Sets recurrence to "Daily"
3. Task appears in list with "Daily" badge 🔄
4. User can complete it any time

### Completing a Daily Task

1. User checks off "Morning meditation" at 8:00 AM
2. Task immediately shows:
   - ✅ Checkbox checked
   - ~~Strikethrough title~~
   - Faded appearance (60% opacity)
   - Still visible in the list with "Daily" badge
3. Task remains visible and completed all day

### Next Day Reset

1. At midnight (or when user opens app next morning):
   - App runs maintenance routine
   - Detects "Morning meditation" was completed yesterday
   - Automatically resets `completed_at` to `null`
2. Task now appears:
   - ☐ Checkbox unchecked
   - Normal title (no strikethrough)
   - Full opacity (100%)
   - Ready to be completed again

### Completing a Non-Recurring Task

1. User checks off "Buy birthday gift"
2. Task shows completed styling (faded, strikethrough)
3. Task remains visible for 24 hours
4. After 24 hours:
   - App runs maintenance routine
   - Detects task is non-recurring and >24h old
   - Automatically deletes task from database
   - Task disappears from list

## Database Schema

### Tasks Table

```sql
CREATE TABLE tasks (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  completed_at timestamptz,  -- When task was completed (NULL = not completed)
  -- ... other fields
);
```

### Task Recurrence Table

```sql
CREATE TABLE task_recurrence (
  id uuid PRIMARY KEY,
  task_id uuid UNIQUE NOT NULL REFERENCES tasks(id),
  pattern text NOT NULL,  -- 'none', 'daily', or 'weekly'
  weekly_day int,         -- 0-6 for weekly tasks (0 = Sunday)
  -- ... other fields
);
```

## Testing Scenarios

### Test Case 1: Normal Task Lifecycle
```
✓ Create normal task → complete it → stays visible (faded)
✓ Wait 24 hours → task auto-deletes
```

### Test Case 2: Daily Task Lifecycle
```
✓ Create daily task → complete it → stays visible (faded)
✓ Badge shows "Daily"
✓ Task does NOT disappear after 24 hours
✓ Next day → task resets (unchecked, active)
✓ Can complete again
```

### Test Case 3: Daily Task Never Deletes
```
✓ Create daily task → complete it
✓ Wait 24 hours → task still visible (completed)
✓ Wait 48 hours → task still visible
✓ Daily task only resets, never deletes
```

### Test Case 4: Weekly Task Visibility
```
✓ Create weekly task for Wednesday
✓ On Wednesday → task visible
✓ Complete task → stays visible (faded)
✓ On Thursday → task disappears
✓ On next Wednesday → task reappears (unchecked)
```

### Test Case 5: Maintenance Triggers
```
✓ Open app → maintenance runs → old tasks cleaned/reset
✓ Leave app open 5 minutes → maintenance runs automatically
✓ Switch to another tab → switch back → maintenance runs
```

### Test Case 6: Multiple Daily Tasks
```
✓ Create "Morning routine", "Evening routine" (both daily)
✓ Complete morning routine at 8 AM → faded
✓ Complete evening routine at 8 PM → faded
✓ Both stay visible all day
✓ Next day at midnight → both reset
✓ Both appear unchecked and active
```

## Edge Cases Handled

1. **Timezone Handling**: Uses `startOfToday()` from date-fns for consistent "today" calculation
2. **Rapid Toggling**: Maintenance runs safely even if triggered multiple times
3. **No Data Loss**: Recurring tasks never auto-delete, only reset
4. **Graceful Errors**: Maintenance functions catch and log errors without breaking the UI
5. **Offline Behavior**: When app comes back online, maintenance catches up on missed resets

## Performance Considerations

- Maintenance operations are lightweight (simple date comparisons)
- Only updates tasks that actually need reset/cleanup
- Batches updates with `.in()` queries
- Runs in background without blocking UI
- Console logs help monitor activity

## Console Output

When maintenance runs, you'll see console logs:

```
Reset 3 daily recurring task(s)
Deleted 2 old completed task(s)
```

This helps verify the system is working correctly.

## Summary

**Key Points:**
- ✅ Completed tasks always stay visible (with faded styling)
- 🔄 Daily recurring tasks reset at midnight (never delete)
- 🗑️ Non-recurring tasks auto-delete after 24 hours
- 📅 Weekly recurring tasks show only on their designated day
- ⚡ Maintenance runs automatically (load, interval, visibility change)
- 👁️ All task types are visible when completed (no instant disappearing)
- 🎨 Completed styling: checkbox checked, strikethrough, faded opacity

This design ensures:
- Users can see what they've accomplished
- Daily tasks automatically reset for the next day
- Non-recurring tasks clean up after themselves
- Weekly tasks appear on the right days
- No manual intervention needed
- Reliable, automatic maintenance
