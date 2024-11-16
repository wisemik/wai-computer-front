import type { CommandGroup } from "@xmtp/message-kit";
import { handleFriend, handleGn, handleStart,
   } from "./handler/wai.js";

export const commands: CommandGroup[] = [
  {
    name: "Wai Bot",
    description: "Wai Wai Wai",
    triggers: [
      "/start",
      "/help",
      "/friend",
      "/gn"
    ],
    image: true,
    commands: [
      {
        command: "/help",
        handler: undefined,
        description: "Get help with the bot.",
        params: {},
      },
      {
        command: "/start",
        handler: handleStart, 
        description: "Start the bot.",
        params: {},
      },
      {
        command: "/friend",
        handler: handleFriend,
        description: "Find a friend.",
        params: {},
      },
      {
        command: "/gn",
        handler: handleGn, // Add appropriate handler
        description: "Send a good night wishes.",
        params: {},
      },     
    ],
  },
];
