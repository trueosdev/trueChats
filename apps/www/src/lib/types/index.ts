// Legacy types for backward compatibility (will be replaced with Supabase types)
export interface Message {
  id: number | string;
  avatar: string;
  name: string;
  message?: string;
  isLoading?: boolean;
  timestamp?: string;
  isLiked?: boolean;
  sender_id?: string;
  conversation_id?: string;
  created_at?: string;
  read_at?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
}

export interface User {
  id: number | string;
  avatar: string;
  messages: Message[];
  name: string;
  email?: string;
  username?: string;
  fullname?: string;
  avatar_url?: string;
  bio?: string;
}

// Supabase-compatible types
export interface ConversationWithUser {
  id: string;
  created_at: string;
  user1_id: string;
  user2_id: string;
  is_group: boolean;
  name: string | null;
  created_by: string | null;
  last_message: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
  } | null;
  other_user?: {
    id: string;
    username: string | null;
    fullname: string | null;
    avatar_url: string | null;
    email: string;
  };
}

