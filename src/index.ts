import { run, HandlerContext } from "@xmtp/message-kit";
import { handleCommand, handleAskFromBot } from "./handler/wai.js";

run(async (context: HandlerContext) => {
  const {
    message: {
      typeId,
      content: { content: text },
    },
    group,
  } = context;

  // Ignore group messages and non-text messages
  if (group) return;
  if (typeId !== "text") return;

  // Handle commands starting with "/"
  if (text.startsWith("/")) {
    await handleCommand(context);
    return;
  }

  // For regular text messages, invoke handleAskFromBot
  await handleAskFromBot(context, text);
});
