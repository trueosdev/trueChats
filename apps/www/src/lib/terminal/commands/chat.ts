import { CommandHandler } from "./index";
import { getConversations, createConversation } from "@/lib/services/conversations";
import { getUsers } from "@/lib/services/users";

export const chatCommand: CommandHandler = {
  name: "chat",
  aliases: ["open", "c"],
  description: "Open or switch to a conversation",
  usage: "chat [user] | chat list | chat [id]",
  handler: async (args, flags, context) => {
    if (!context.user) {
      return ["Not authenticated. Please log in."];
    }

    if (args.length === 0 || args[0] === "list") {
      // List conversations
      try {
        const conversations = await getConversations(String(context.user.id));
        context.store.setConversations(conversations);
        
        if (conversations.length === 0) {
          return ["No conversations found. Use 'chat <username>' to start a new chat."];
        }

        const lines: string[] = [
          "Your Conversations:",
          "",
        ];

        for (const conv of conversations.filter(c => !c.is_group)) {
          const name = conv.other_user?.fullname || conv.other_user?.username || "Unknown";
          const lastMsg = conv.last_message?.content.slice(0, 50) || "No messages";
          lines.push(`  [${conv.id.slice(0, 8)}] ${name} - ${lastMsg}`);
        }

        lines.push("");
        lines.push("Use 'chat <username>' or 'chat <id>' to open a conversation.");

        return lines;
      } catch (error) {
        return [`Error fetching conversations: ${error}`];
      }
    } else {
      // Open chat with user or by ID
      const identifier = args[0];

      // Check if it's a conversation ID (UUID format)
      if (identifier.length > 20) {
        // Likely a conversation ID
        const conversations = context.store.conversations;
        const conversation = conversations.find(c => c.id === identifier);
        
        if (conversation) {
          context.setCurrentConversationId(conversation.id);
          context.store.setSelectedConversationId(conversation.id);
          
          const name = conversation.other_user?.fullname || conversation.other_user?.username || "Unknown";
          return [`Opened conversation: ${name}`];
        } else {
          return [`Conversation '${identifier}' not found.`];
        }
      } else {
        // Try to find user by username
        try {
          const users = await getUsers();
          const user = users.find(u => 
            u.username?.toLowerCase() === identifier.toLowerCase() ||
            u.email?.toLowerCase() === identifier.toLowerCase()
          );

          if (!user) {
            return [`User '${identifier}' not found. Use 'list users' to see all users.`];
          }

          // Check if conversation already exists
          const conversations = context.store.conversations;
          const existingConv = conversations.find(c => 
            !c.is_group && (
              c.user1_id === user.id || 
              c.user2_id === user.id
            )
          );

          if (existingConv) {
            context.setCurrentConversationId(existingConv.id);
            context.store.setSelectedConversationId(existingConv.id);
            return [`Opened existing conversation with ${user.name || user.username}`];
          } else {
            // Create new conversation
            try {
              const newConv = await createConversation(String(context.user.id), String(user.id));
              if (newConv) {
                // Fetch full conversation details
                const conversations = await getConversations(String(context.user.id));
                const fullConv = conversations.find(c => c.id === newConv.id);
                if (fullConv) {
                  context.store.addConversation(fullConv);
                  context.setCurrentConversationId(fullConv.id);
                  context.store.setSelectedConversationId(fullConv.id);
                  return [`Started new conversation with ${user.name || user.username}`];
                } else {
                  return ["Conversation created but failed to load details."];
                }
              } else {
                return ["Failed to create conversation."];
              }
            } catch (error) {
              return [`Error creating conversation: ${error}`];
            }
          }
        } catch (error) {
          return [`Error: ${error}`];
        }
      }
    }
  },
};

