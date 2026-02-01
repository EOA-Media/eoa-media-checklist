# EOA Media Checklist

A full-stack productivity application with task management, categories, recurring tasks, and calendar integration. Built with Next.js, TypeScript, Supabase, and TailwindCSS.

## Features

- **Authentication**: Email/password signup and login with Supabase Auth
- **Task Management**: Create, edit, complete, and delete tasks
- **Categories**: Organize tasks with custom categories and colors
- **Recurring Tasks**: Support for daily and weekly recurring tasks
- **Calendar View**: Visual calendar display for timed tasks with FullCalendar
- **Auto-Cleanup**: Non-recurring tasks are automatically deleted 24 hours after completion
- **Smart Rollover**: Recurring tasks automatically reset after completion
- **Search & Filter**: Search tasks by title/notes and filter by category
- **Responsive Design**: Mobile-ready with touch-friendly controls and bottom navigation
- **Dark Mode**: Beautiful dark theme optimized for long-term use

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui + Radix UI
- **Forms**: React Hook Form + Zod
- **Calendar**: FullCalendar
- **Date Handling**: date-fns
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

The project is pre-configured with Supabase credentials in the `.env` file. The database schema has already been created with all necessary tables and Row Level Security policies.

If you need to use your own Supabase project, update the `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Create an Account

1. Navigate to the signup page
2. Enter your name, email, and password
3. Sign up and start using the app immediately

## Project Structure

```
├── app/
│   ├── (auth)/              # Authentication routes
│   │   ├── login/          # Login page
│   │   └── signup/         # Signup page
│   ├── (app)/              # Authenticated app routes
│   │   ├── layout.tsx      # App layout with navigation
│   │   ├── page.tsx        # Checklist page (default)
│   │   └── calendar/       # Calendar view
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── CategorySidebar.tsx # Category management
│   ├── TaskFormModal.tsx   # Task creation/editing
│   └── TaskList.tsx        # Task list display
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Client-side Supabase client
│   │   ├── server.ts       # Server-side Supabase client
│   │   └── types.ts        # TypeScript database types
│   ├── actions/
│   │   └── tasks.ts        # Server actions for tasks
│   └── utils/
│       └── date-helpers.ts # Date utility functions
└── README.md
```

## Database Schema

The database includes four main tables:

### profiles
Links to Supabase auth.users
- `id` (uuid, PK)
- `name` (text)
- `email` (text)
- `created_at` (timestamptz)

### categories
User-created task categories
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `name` (text)
- `color` (text)
- `created_at` (timestamptz)

### tasks
Main task table
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `category_id` (uuid, FK, nullable)
- `title` (text)
- `notes` (text)
- `due_date` (date, nullable)
- `due_time` (time, nullable)
- `completed_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### task_recurrence
Recurrence rules for tasks
- `id` (uuid, PK)
- `task_id` (uuid, FK, unique)
- `pattern` (text) - 'none', 'daily', or 'weekly'
- `weekly_day` (int, nullable) - 0-6 for day of week
- `created_at` (timestamptz)

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

## Key Features Explained

### Task Recurrence

- **None**: Standard one-time task
- **Daily**: Task reappears every day after completion (automatically resets at midnight)
- **Weekly**: Task reappears on a specific weekday after completion

### Auto-Deletion & Cleanup

Non-recurring completed tasks are automatically deleted 24 hours after completion. The cleanup runs:
- On app load
- When querying tasks
- This keeps your task list clean while preserving recurring tasks

### Calendar Integration

- Only tasks with BOTH a date AND time appear on the calendar
- Tasks display with their category colors
- Click any event to edit the task
- Supports month, week, and day views

### Mobile Support

- Fully responsive design
- Bottom navigation bar on mobile devices
- Touch-friendly controls (44px+ tap targets)
- Optimized layouts for all screen sizes
- Ready to be wrapped for iOS/Android app stores

## Usage Guide

### Creating Tasks

1. Click the "New Task" button
2. Enter a title (required)
3. Optionally add notes, category, date, time
4. Set recurrence if needed
5. Click "Create"

### Managing Categories

1. Use the sidebar (or drawer on mobile)
2. Click "Add Category" to create
3. Hover over categories to edit or delete
4. Choose from 16 color options

### Completing Tasks

- Click the checkbox next to any task
- Completed tasks are dimmed and show for 24 hours
- Non-recurring tasks auto-delete after 24 hours
- Recurring tasks reset for the next occurrence

### Calendar View

- Switch to the Calendar tab
- See all timed tasks in a visual calendar
- Click events to edit tasks
- Toggle between month/week/day views

## Building for Production

```bash
npm run build
npm start
```

## Deployment

This app is optimized for deployment on:

- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- Any platform supporting Next.js 13+

### Deployment Checklist

1. Set environment variables in your hosting platform
2. Build the project to verify no errors
3. Deploy the main branch
4. Test authentication flow
5. Verify database connectivity

## Development Notes

### Server Actions

The app uses Next.js Server Actions for database operations, providing:
- Automatic request deduplication
- Optimistic updates
- Error handling
- Type safety

### Type Safety

All database operations are fully typed using TypeScript, with types generated from the Supabase schema.

### Security

- Row Level Security (RLS) on all tables
- Authentication required for all app routes
- User data isolation
- Secure password handling via Supabase Auth

## Troubleshooting

### Build Errors

If you encounter build errors, try:
```bash
rm -rf .next
npm install
npm run build
```

### Database Connection Issues

Verify your Supabase credentials in the `.env` file are correct.

### Authentication Issues

Clear browser cookies and local storage, then try logging in again.

## Future Enhancements

- iOS/Android native apps (using React Native or Capacitor)
- Push notifications for task reminders
- Task sharing and collaboration
- Custom recurring patterns (every 2 weeks, monthly, etc.)
- Task templates and quick actions
- Attachments and file uploads
- Task priorities and labels
- Dark/light theme toggle
- Export/import functionality
- Task analytics and insights

## License

MIT License

## Support

For issues or questions, please open an issue in the repository.
