# trueChats

A modern, real-time chat application built with Next.js, Supabase, and reusable chat UI components.

## 🚀 Features

- **Real-time Messaging**: Instant message delivery powered by Supabase Realtime
- **Authentication**: Secure user authentication with email/password
- **Direct Conversations**: One-on-one messaging between users
- **File Attachments**: Share images and files in conversations
- **Read Receipts**: Track message read status
- **User Presence**: See when users are online
- **Avatar Management**: Customizable user avatars with image cropping
- **Theme Support**: Dark and light mode with next-themes
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Emoji Picker**: Express yourself with emojis
- **Component Library**: Reusable chat components built on Radix UI

## 📦 Monorepo Structure

```
trueChats/
├── apps/
│   └── www/           # Main chat application
├── packages/
│   ├── ui/            # @shadcn-chat/ui - Reusable chat components
│   └── cli/           # CLI tool for adding components
└── supabase/          # Database migrations and schema
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Build System**: Turborepo
- **Language**: TypeScript


## 🔗 Links

- [Supabase Docs](https://supabase.com/docs) - Learn more about Supabase
- [Next.js Docs](https://nextjs.org/docs) - Learn more about Next.js
