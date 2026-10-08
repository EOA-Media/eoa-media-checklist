export interface FriendProfile {
  friend_id: string;
  username: string;
  display_name: string;
  friends_since: string;
}

export interface FriendRequest {
  request_id: string;
  direction: 'incoming' | 'outgoing';
  other_user_id: string;
  username: string;
  display_name: string;
  requested_at: string;
}

export interface UserSearchResult {
  user_id: string;
  username: string;
  display_name: string;
  relationship: 'none' | 'pending' | 'friends';
}

export interface SharedTask {
  task_id: string;
  title: string;
  completed_at: string | null;
  due_date: string | null;
  due_time: string | null;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  recurrence_pattern: 'none' | 'daily' | 'weekly';
  daily_streak: number;
  sort_order: number;
}

export interface ShareableCategory {
  category_id: string;
  category_name: string;
  category_color: string | null;
  shared: boolean;
}
