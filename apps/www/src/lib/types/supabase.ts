export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          created_at: string
          user1_id: string
          user2_id: string
          is_group: boolean
          name: string | null
          created_by: string | null
          last_message: {
            id: string
            content: string
            sender_id: string
            created_at: string
          } | null
        }
        Insert: {
          id?: string
          created_at?: string
          user1_id?: string
          user2_id?: string
          is_group?: boolean
          name?: string | null
          created_by?: string | null
          last_message?: any
        }
        Update: {
          id?: string
          created_at?: string
          user1_id?: string
          user2_id?: string
          is_group?: boolean
          name?: string | null
          created_by?: string | null
          last_message?: any
        }
      }
      conversation_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          joined_at: string
          role: 'admin' | 'member'
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          joined_at?: string
          role?: 'admin' | 'member'
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          joined_at?: string
          role?: 'admin' | 'member'
        }
      }
      messages: {
        Row: {
          id: string
          created_at: string
          sender_id: string
          conversation_id: string
          content: string
        }
        Insert: {
          id?: string
          created_at?: string
          sender_id?: string
          conversation_id: string
          content: string
        }
        Update: {
          id?: string
          created_at?: string
          sender_id?: string
          conversation_id?: string
          content?: string
        }
      }
      looms: {
        Row: {
          id: string
          name: string
          description: string | null
          icon_name: string | null
          icon_url: string | null
          banner_url: string | null
          visibility: 'public' | 'private' | 'invite_only'
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon_name?: string | null
          icon_url?: string | null
          banner_url?: string | null
          visibility?: 'public' | 'private' | 'invite_only'
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon_name?: string | null
          icon_url?: string | null
          banner_url?: string | null
          visibility?: 'public' | 'private' | 'invite_only'
          created_by?: string
          created_at?: string
        }
      }
      loom_members: {
        Row: {
          id: string
          loom_id: string
          user_id: string
          role: 'owner' | 'admin' | 'moderator' | 'member'
          status: 'invited' | 'active'
          joined_at: string
          invited_by: string | null
          invited_at: string | null
        }
        Insert: {
          id?: string
          loom_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'moderator' | 'member'
          status?: 'invited' | 'active'
          joined_at?: string
          invited_by?: string | null
          invited_at?: string | null
        }
        Update: {
          id?: string
          loom_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'moderator' | 'member'
          status?: 'invited' | 'active'
          joined_at?: string
          invited_by?: string | null
          invited_at?: string | null
        }
      }
      threads: {
        Row: {
          id: string
          loom_id: string
          name: string
          description: string | null
          icon_emoji: string | null
          type: 'open' | 'private'
          is_pinned: boolean
          is_archived: boolean
          created_by: string
          created_at: string
          last_message: {
            id: string
            content: string
            sender_id: string
            created_at: string
          } | null
        }
        Insert: {
          id?: string
          loom_id: string
          name: string
          description?: string | null
          icon_emoji?: string | null
          type?: 'open' | 'private'
          is_pinned?: boolean
          is_archived?: boolean
          created_by: string
          created_at?: string
          last_message?: any
        }
        Update: {
          id?: string
          loom_id?: string
          name?: string
          description?: string | null
          icon_emoji?: string | null
          type?: 'open' | 'private'
          is_pinned?: boolean
          is_archived?: boolean
          created_by?: string
          created_at?: string
          last_message?: any
        }
      }
      thread_messages: {
        Row: {
          id: string
          thread_id: string
          sender_id: string
          content: string
          created_at: string
          read_at: string | null
          reply_to: string | null
          edited_at: string | null
          likes: string[]
          attachment_url: string | null
          attachment_type: string | null
          attachment_name: string | null
          attachment_size: number | null
        }
        Insert: {
          id?: string
          thread_id: string
          sender_id?: string
          content: string
          created_at?: string
          read_at?: string | null
          reply_to?: string | null
          edited_at?: string | null
          likes?: string[]
          attachment_url?: string | null
          attachment_type?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
        }
        Update: {
          id?: string
          thread_id?: string
          sender_id?: string
          content?: string
          created_at?: string
          read_at?: string | null
          reply_to?: string | null
          edited_at?: string | null
          likes?: string[]
          attachment_url?: string | null
          attachment_type?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
        }
      }
    }
    Views: {
      users: {
        Row: {
          id: string
          email: string
          username: string | null
          fullname: string | null
          avatar_url: string | null
          bio: string | null
        }
      }
      usernames: {
        Row: {
          username: string
        }
      }
    }
  }
}

export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type User = Database['public']['Views']['users']['Row']
export type Username = Database['public']['Views']['usernames']['Row']

