import {
  Message,
  ConversationWithUser,
  Loom,
  Thread,
  ThreadFolder,
  ThreadMessage,
} from "@/app/data";
import { create } from "zustand";

type ViewMode = 'dms' | 'looms';

interface State {
  input: string;
  messages: Message[];
  conversations: ConversationWithUser[];
  selectedConversationId: string | null;
  loading: boolean;
  unreadCounts: Record<string, number>;
  replyingTo: Message | null;
  pendingRequestCount: number;
  // Loom state
  viewMode: ViewMode;
  looms: Loom[];
  selectedLoomId: string | null;
  threads: Thread[];
  threadFolders: ThreadFolder[];
  selectedThreadId: string | null;
  threadMessages: ThreadMessage[];
  loomLoading: boolean;
  loomUnreadCounts: Record<string, number>;
}

interface Actions {
  setInput: (input: string) => void;
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>,
  ) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  setConversations: (conversations: ConversationWithUser[]) => void;
  addConversation: (conversation: ConversationWithUser) => void;
  updateConversation: (conversationId: string, updates: Partial<ConversationWithUser>) => void;
  setSelectedConversationId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setUnreadCounts: (counts: Record<string, number>) => void;
  setUnreadCount: (conversationId: string, count: number) => void;
  setReplyingTo: (message: Message | null) => void;
  setPendingRequestCount: (count: number) => void;
  // Loom actions
  setViewMode: (mode: ViewMode) => void;
  setLooms: (looms: Loom[]) => void;
  addLoom: (loom: Loom) => void;
  updateLoom: (loomId: string, updates: Partial<Loom>) => void;
  setSelectedLoomId: (id: string | null) => void;
  setThreads: (threads: Thread[]) => void;
  addThread: (thread: Thread) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  removeThread: (threadId: string) => void;
  setThreadFolders: (folders: ThreadFolder[]) => void;
  addThreadFolder: (folder: ThreadFolder) => void;
  updateThreadFolder: (folderId: string, updates: Partial<ThreadFolder>) => void;
  removeThreadFolder: (folderId: string) => void;
  setSelectedThreadId: (id: string | null) => void;
  setThreadMessages: (messages: ThreadMessage[]) => void;
  addThreadMessage: (message: ThreadMessage) => void;
  setLoomLoading: (loading: boolean) => void;
  setLoomUnreadCounts: (counts: Record<string, number>) => void;
  setLoomUnreadCount: (loomId: string, count: number) => void;
}

const useChatStore = create<State & Actions>()((set) => ({
  input: "",
  messages: [],
  conversations: [],
  selectedConversationId: null,
  loading: false,
  unreadCounts: {},
  replyingTo: null,
  pendingRequestCount: 0,
  viewMode: 'dms',
  looms: [],
  selectedLoomId: null,
  threads: [],
  threadFolders: [],
  selectedThreadId: null,
  threadMessages: [],
  loomLoading: false,
  loomUnreadCounts: {},

  setInput: (input) => set({ input }),
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>,
  ) => set({ input: e.target.value }),

  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => {
    const exists = state.messages.some(m => m.id === message.id);
    if (exists) return state;
    
    return { messages: [...state.messages, message] };
  }),
  updateMessage: (messageId, updates) => set((state) => ({
    messages: state.messages.map((msg) =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    ),
  })),

  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) => set((state) => {
    const exists = state.conversations.some(c => c.id === conversation.id);
    if (exists) return state;
    
    return { 
      conversations: [conversation, ...state.conversations] 
    };
  }),
  updateConversation: (conversationId, updates) => set((state) => {
    const updatedConversations = state.conversations.map((conv) =>
      conv.id === conversationId ? { ...conv, ...updates } : conv
    );
    
    updatedConversations.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
    
    return { conversations: updatedConversations };
  }),
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setLoading: (loading) => set({ loading }),
  setUnreadCounts: (counts) => set({ unreadCounts: counts }),
  setUnreadCount: (conversationId, count) => set((state) => ({
    unreadCounts: { ...state.unreadCounts, [conversationId]: count },
  })),
  setReplyingTo: (message) => set({ replyingTo: message }),
  setPendingRequestCount: (count) => set({ pendingRequestCount: count }),

  // Loom actions
  setViewMode: (mode) => set({ viewMode: mode }),
  setLooms: (looms) => set({ looms }),
  addLoom: (loom) => set((state) => {
    const exists = state.looms.some(l => l.id === loom.id);
    if (exists) return state;
    return { looms: [loom, ...state.looms] };
  }),
  updateLoom: (loomId, updates) => set((state) => ({
    looms: state.looms.map((l) =>
      l.id === loomId ? { ...l, ...updates } : l
    ),
  })),
  setSelectedLoomId: (id) =>
    set({
      selectedLoomId: id,
      selectedThreadId: null,
      threadMessages: [],
      threadFolders: [],
    }),
  setThreads: (threads) => set({ threads }),
  addThread: (thread) => set((state) => {
    const exists = state.threads.some(t => t.id === thread.id);
    if (exists) return state;
    return { threads: [...state.threads, thread] };
  }),
  updateThread: (threadId, updates) => set((state) => ({
    threads: state.threads.map((t) =>
      t.id === threadId ? { ...t, ...updates } : t
    ),
  })),
  removeThread: (threadId) => set((state) => ({
    threads: state.threads.filter((t) => t.id !== threadId),
  })),
  setThreadFolders: (threadFolders) => set({ threadFolders }),
  addThreadFolder: (folder) => set((state) => {
    const exists = state.threadFolders.some((f) => f.id === folder.id);
    if (exists) return state;
    return { threadFolders: [...state.threadFolders, folder].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)) };
  }),
  updateThreadFolder: (folderId, updates) => set((state) => ({
    threadFolders: state.threadFolders
      .map((f) => (f.id === folderId ? { ...f, ...updates } : f))
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)),
  })),
  removeThreadFolder: (folderId) => set((state) => ({
    threadFolders: state.threadFolders.filter((f) => f.id !== folderId),
    threads: state.threads.map((t) =>
      t.folder_id === folderId ? { ...t, folder_id: null } : t
    ),
  })),
  setSelectedThreadId: (id) => set({ selectedThreadId: id, threadMessages: [] }),
  setThreadMessages: (messages) => set({ threadMessages: messages }),
  addThreadMessage: (message) => set((state) => {
    const exists = state.threadMessages.some(m => m.id === message.id);
    if (exists) return state;
    return { threadMessages: [...state.threadMessages, message] };
  }),
  setLoomLoading: (loading) => set({ loomLoading: loading }),
  setLoomUnreadCounts: (counts) => set({ loomUnreadCounts: counts }),
  setLoomUnreadCount: (loomId, count) => set((state) => ({
    loomUnreadCounts: { ...state.loomUnreadCounts, [loomId]: count },
  })),
}));

export default useChatStore;
