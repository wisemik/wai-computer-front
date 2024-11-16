import { HandlerContext } from "@xmtp/message-kit";

interface PendingMessagesResponse {
  messages: string[];
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://your-backend-url';

// Store the context globally since there's only one user
let userContext: HandlerContext | null = null;

// Start polling for messages
const pollingInterval = 5000; // 5 seconds

setInterval(async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/get-pending-messages`);
    if (response.ok) {
      const data = (await response.json()) as PendingMessagesResponse;
      if (data.messages && data.messages.length > 0) {
        for (const message of data.messages) {
          await sendMessageToUser(message);
        }
      }
    } else {
      console.error("Error polling backend:", response.statusText);
    }
  } catch (error) {
    console.error("Error during polling:", error);
  }
}, pollingInterval);

async function sendMessageToUser(message: string) {
  // Replace the URL if it contains https://sepolia.basescan.org
  const updatedMessage = message.replace(
    /https:\/\/sepolia\.basescan\.org/g,
    "https://base-sepolia.blockscout.com"
  );

  if (userContext) {
    await userContext.send(updatedMessage);
  } else {
    console.error("No context found for the user.");
  }
}

export async function handleCommand(context: HandlerContext) {
  const {
    message: {
      content: { command, params },
    },
  } = context;

  // Store the context globally
  userContext = context;

  switch (command) {
    case "start":
      return handleStart();
    case "help":
      return handleHelp();
    case "askfrombot":
      return handleAskFromBot(context, params?.question || "");
    case "gn":
      return handleGn();
    case "friend":
      return handleFriend();
    default:
      await context.reply("Unknown command. Please use /help to see the list of available commands.");
  }
}

interface StartResponse {
  message?: string;
}

export async function handleStart() {
  try {
    const response = await fetch(`${BACKEND_URL}/start`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Error from backend: ${response.statusText}`);
    }

    const data = (await response.json()) as StartResponse;
    await userContext?.send(data.message || "Welcome!");
  } catch (error) {
    console.error("Error during /start:", error);
    await userContext?.send("An error occurred while starting the conversation.");
  }
}

export async function handleGn() {
  await userContext?.send("Good Night!");
  await handleHelp();
}

export async function handleHelp() {
  const message = "Here is the list of commands:\n/help: Show the list of commands.\n/ask [question]: Ask a question.\n/askfrombot [question]: Ask a question directly to the bot.\n/friend: Find a friend.\n/gn: Get a good night message.";
  await userContext?.send(message);
}

export async function handleAskFromBot(context: HandlerContext, question: string) {
  console.log("Question received for handleAskFromBot:", question);

  // Store the context globally
  userContext = context;

  try {
    // Send the question directly to the backend's user-message endpoint
    const response = await fetch(`${BACKEND_URL}/user-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: question }),
    });

    if (!response.ok) {
      throw new Error(`Error from backend: ${response.statusText}`);
    }

    // The bot will pick up responses during the polling
  } catch (error) {
    console.error("Error sending message to backend:", error);
    await context.send("An error occurred while processing your request.");
  }
}


interface LLMResponse {
  answer?: string;
  error?: string;
}

async function askLLM(question: string): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/ask-llm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      console.error(`Error: ${response.statusText}`);
      return `Error: ${response.statusText}`;
    }

    const data = (await response.json()) as LLMResponse;

    if (data.answer) {
      console.log("Response from /ask-llm:", data.answer);
      return data.answer;
    } else if (data.error) {
      console.error("Error from /ask-llm:", data.error);
      return `Error: ${data.error}`;
    } else {
      console.error("Unexpected response format:", data);
      return "Error: Unexpected response format";
    }
  } catch (err) {
    console.error("Request failed:", err);
    return `Error: ${err}`;
  }
}

interface Friend {
  name: string;
  ens_address: string;
}

export async function handleFriend() {
  try {
    const response = await fetch(`${BACKEND_URL}/random-friend`, {
      method: "GET",
    });

    if (!response.ok) {
      console.error(`Error: ${response.statusText}`);
      await userContext?.send(`Error: ${response.statusText}`);
      return;
    }

    const friend = (await response.json()) as Friend;

    if (friend?.ens_address && friend?.name) {
      const message = `Meet ${friend.name} : ${friend.ens_address}. Have fun!`;
      await userContext?.send(message);
    } else {
      console.error("Unexpected response format:", friend);
      await userContext?.send("Error: Unexpected response format");
    }
  } catch (err) {
    console.error("Request failed:", err);
    await userContext?.send(`Error: ${err}`);
  }
}
