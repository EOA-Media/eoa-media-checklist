export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          title: string;
          notes: string | null;
          due_date: string | null;
          due_time: string | null;
          start_time: string | null;
          end_time: string | null;
          completed_at: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          title: string;
          notes?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          title?: string;
          notes?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      task_recurrence: {
        Row: {
          id: string;
          task_id: string;
          pattern: 'none' | 'daily' | 'weekly';
          weekly_day: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          pattern?: 'none' | 'daily' | 'weekly';
          weekly_day?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          pattern?: 'none' | 'daily' | 'weekly';
          weekly_day?: number | null;
          created_at?: string;
        };
      };
    };
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskRecurrence = Database['public']['Tables']['task_recurrence']['Row'];

export type TaskWithRecurrence = Task & {
  recurrence?: TaskRecurrence | null;
  category?: Category | null;
};
