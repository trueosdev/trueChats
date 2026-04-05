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
  reply_to?: string | null;
  edited_at?: string | null;
  likes?: string[];
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

// Loom & Thread types
export type LoomVisibility = 'public' | 'private' | 'invite_only';
export type LoomMemberRole = 'owner' | 'admin' | 'moderator' | 'member';
export type ThreadType = 'open' | 'private';
export type ThreadCategory = 'text' | 'voice';

export interface Loom {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  icon_url: string | null;
  banner_url: string | null;
  visibility: LoomVisibility;
  created_by: string;
  created_at: string;
  member_count?: number;
  thread_count?: number;
}

export interface LoomMember {
  id: string;
  loom_id: string;
  user_id: string;
  role: LoomMemberRole;
  joined_at: string;
  user: {
    id: string;
    username: string | null;
    fullname: string | null;
    avatar_url: string | null;
    email: string;
  };
}

export interface ThreadFolder {
  id: string;
  loom_id: string;
  name: string;
  position: number;
  created_by: string;
  created_at: string;
}

export interface Thread {
  id: string;
  loom_id: string;
  name: string;
  description: string | null;
  icon_emoji: string | null;
  type: ThreadType;
  category: ThreadCategory;
  is_pinned: boolean;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  /** When set, thread appears under this folder in the loom sidebar. */
  folder_id: string | null;
  last_message: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
  } | null;
}

export interface ThreadMessage extends Message {
  thread_id: string;
  content: string;
  sender: {
    id: string;
    username: string | null;
    fullname: string | null;
    avatar_url: string | null;
  };
}
