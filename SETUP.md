# Setup Guide - EOA Media Checklist

This guide will help you get the EOA Media Checklist app running on your local machine.

## Prerequisites

Before you begin, ensure you have:
- Node.js 18 or higher installed
- npm (comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

## Installation Steps

### Step 1: Install Dependencies

Open your terminal in the project directory and run:

```bash
npm install
```

This will install all required packages including Next.js, Supabase, TailwindCSS, FullCalendar, and more.

### Step 2: Verify Environment Variables

The project comes pre-configured with a Supabase database. Check that the `.env` file exists in the root directory with these variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Note**: The database schema has already been created with all necessary tables and security policies.

### Step 3: Run the Development Server

Start the development server:

```bash
npm run dev
```

You should see output similar to:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Step 4: Open the App

Open your browser and navigate to:
```
http://localhost:3000
```

You'll be redirected to the login page since you're not authenticated yet.

### Step 5: Create Your Account

1. Click on "Sign up" at the bottom of the login page
2. Fill in the form:
   - **Name**: Your full name
   - **Email**: A valid email address
   - **Password**: At least 6 characters
   - **Confirm Password**: Same as password
3. Click "Create Account"
4. You'll be automatically logged in and redirected to the checklist

### Step 6: Start Using the App

**Create Your First Category**:
1. In the sidebar (left on desktop, drawer on mobile), click "Add Category"
2. Enter a category name like "Work" or "Personal"
3. Choose a color
4. Click "Create"

**Create Your First Task**:
1. Click the "New Task" button at the top
2. Enter a task title (required)
3. Optionally add:
   - Notes
   - Category (select from dropdown)
   - Due date
   - Due time (if you want it on the calendar)
   - Recurrence pattern
4. Click "Create"

**Explore the Calendar**:
1. Click the "Calendar" tab in the navigation
2. You'll see any tasks that have both a date and time
3. Toggle between month, week, and day views
4. Click any event to edit it

## Database Schema

The app uses these Supabase tables (already created):

### Tables

1. **profiles** - User profile information
2. **categories** - Task categories with colors
3. **tasks** - All tasks with dates, times, and completion status
4. **task_recurrence** - Recurrence rules for repeating tasks

### Security

All tables have Row Level Security (RLS) enabled:
- Users can only see and modify their own data
- Authentication is required for all operations
- Profiles are linked to Supabase auth users

## Features Overview

### Task Management
- Create, edit, delete, and complete tasks
- Add notes and categorize tasks
- Set due dates and times
- Mark tasks as complete with a checkbox

### Recurring Tasks
- **Daily**: Task reappears every day
- **Weekly**: Task reappears on a specific weekday
- Non-recurring tasks are auto-deleted 24 hours after completion

### Categories
- Create unlimited categories
- Choose from 16 colors
- Edit or delete categories anytime
- Filter tasks by category

### Calendar Integration
- Visual monthly/weekly/daily views
- Only shows tasks with both date AND time
- Click events to edit tasks
- Color-coded by category

### Mobile Support
- Fully responsive design
- Bottom navigation on mobile
- Touch-friendly controls
- Works great on iOS and Android browsers

## Common Issues & Solutions

### Issue: "Module not found" errors

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 3000 already in use

**Solution**: Either:
- Stop the other process using port 3000
- Or run on a different port:
```bash
npm run dev -- -p 3001
```

### Issue: Can't log in or create account

**Solution**:
- Check that the `.env` file has valid Supabase credentials
- Verify your internet connection
- Clear browser cache and cookies
- Try a different browser

### Issue: Changes not appearing

**Solution**:
- Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
- Restart the development server
- Clear browser cache

## Building for Production

To create an optimized production build:

```bash
npm run build
```

To run the production build locally:

```bash
npm start
```

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## Technology Stack

- **Next.js 13** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Supabase** - Backend, database, and authentication
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful UI components
- **FullCalendar** - Interactive calendar component
- **React Hook Form** - Form validation
- **Zod** - Schema validation
- **date-fns** - Date manipulation
- **Lucide React** - Icon library

## Next Steps

1. Explore all features by creating tasks and categories
2. Try the different recurrence patterns
3. Test the mobile view by resizing your browser
4. Customize the app by modifying the code
5. Deploy to Vercel, Netlify, or your preferred hosting platform

## Need Help?

- Check the main README.md for detailed documentation
- Review the code comments for implementation details
- Open an issue if you find bugs or have questions

Enjoy using EOA Media Checklist! 🎉
