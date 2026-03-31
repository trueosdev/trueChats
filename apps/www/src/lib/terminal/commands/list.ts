import { CommandHandler } from "./index";
import { formatTable } from "../output-formatter";
import { getUsers } from "@/lib/services/users";

export const listCommand: CommandHandler = {
  name: "list",
  aliases: ["ls"],
  description: "List conversations or users",
  usage: "list [users|chats]",
  handler: async (args, flags, context) => {
    const type = args[0]?.toLowerCase() || "chats";

    if (type === "users" || type === "user") {
      try {
        const users = await getUsers();
        
        if (users.length === 0) {
          return ["No users found."];
        }

        return [
          "Users:",
          "",
          ...formatTable(
            ["ID", "Name", "Username", "Email"],
            users.map(user => [
              String(user.id).slice(0, 8) + "...",
              user.name || "N/A",
              user.username || "N/A",
              user.email || "N/A",
            ])
          ),
        ];
      } catch (error) {
        return [`Error fetching users: ${error}`];
      }
    } else if (type === "chats" || type === "chat" || type === "conversations") {
      const conversations = context.store.conversations;
      
      if (conversations.length === 0) {
        return ["No conversations found."];
      }

      return [
        "Conversations:",
        "",
        ...formatTable(
          ["ID", "Name", "Last Message"],
          conversations.filter(c => !c.is_group).map(conv => [
            conv.id.slice(0, 8) + "...",
            conv.other_user?.fullname || conv.other_user?.username || "Unknown",
            conv.last_message?.content.slice(0, 30) || "No messages",
          ])
        ),
      ];
    } else {
      return [
        "Usage: list [users|chats]",
        "  users  - List all users",
        "  chats  - List all conversations (default)",
      ];
    }
  },
};

