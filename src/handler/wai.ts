import { HandlerContext, ApiResponse } from "@xmtp/message-kit";

import { textGeneration } from "../lib/openai.js";
const chatHistories: Record<string, any[]> = {};

const BACKEND_URL = process.env.BACKEND_URL


export async function handleCommand(context: HandlerContext) {
  const {
    message: {
      content: { command },
    },
  } = context;
    
  switch (command) {
    case "start":
      return handleStart(context);
      case "help":
        return handleHelp(context);
    case "ask":
      return handleAsk(context);
    case "gn":
      return handleGn(context);
    case "friend":
      return handleFriend(context);
    default:
      context.reply("Unknown command. Please use /help to see the list of available commands.");
  }
}


export async function waiAgent(context: HandlerContext) {
  console.log("wai agent called with context:", context);

  if (!process?.env?.OPEN_AI_API_KEY) {
    console.log("No OPEN_AI_API_KEY found in .env");
    return;
  }

  const {
    message: {
      content: { content, params },
      sender,
    },
  } = context;

  console.log("Message content:", content);
  console.log("Message params:", params);
  console.log("Sender address:", sender.address);

  const systemPrompt = generateSystemPrompt(context);
  console.log("Generated system prompt:", systemPrompt);

  try {
    let userPrompt = params?.prompt ?? content;
    console.log("User prompt:", userPrompt);

    const { reply, history } = await textGeneration(
      userPrompt,
      systemPrompt,
      chatHistories[sender.address]
    );

    console.log("Reply from textGeneration:", reply);
    console.log("Updated chat history:", history);

    chatHistories[sender.address] = history; // Update chat history for the user

    const messages = reply
      .split("\n")
      .filter((message) => message.trim() !== "");

    for (const message of messages) {
      console.log("Processing message:", message);

      if (message.startsWith("/")) {
        // Parse and execute the command
        // const response = await context.intent(message);

        const response = await context.intent(message);
        console.log("Response :", response);

        await context.send((response as ApiResponse)?.message);


      } else {
        
        // Send the message as a text response
        await context.send(message);
      }
    }
  } catch (error) {
    console.error("Error during OpenAI call:", error);
    await context.send("An error occurred while processing your request.");
  }
}

function generateSystemPrompt(context: HandlerContext) {
  const systemPrompt = `
    You are a helpful assistant that converts user input into the appropriate command(s) from the list below.

    - Only provide answers by responding with the appropriate command(s) from the list below.
    - Do not provide additional explanations or messages outside of the commands.
    - Users can start a conversation by chatting 1:1.
    - You can respond with multiple messages if needed. Each message should be separated by a newline character.
    - You can execute commands by sending the command as a message.

    ## Commands
    - /help: Show the list of commands
    - /ask [question]: Ask info from LLM.
    - /friend: Find a friend
    - /gn: Get a good night message

    ## Examples
    - User says: "I need a friend."
      Assistant responds:
      /friend
    - User says: "What's the meaninig of 42?"
      Assistant responds: "/ask What's the meaninig of 42?"
  `;
  return systemPrompt;
}


export async function handleGn(context: HandlerContext) {
  context.send("Good Night!");
}


export async function handleHelp(context: HandlerContext) {
  const message = "Here is the list of commands:\n/register [project]: Register a project.\n/friend Find a friend.\n/ask [question]: ask questions about hackathon.\n/help: Show the list of commands";

  context.send(message);
  
  return { code: 200, message };

}

export async function handleStart(context: HandlerContext) {
  // Implement the logic for the /start command
  context.send("Welcome!");
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
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ question }),
    });

    if (!response.ok) {
      console.error(`Error: ${response.statusText}`);
      return `Error: ${response.statusText}`;
    }

    // Explicitly cast the response to the expected type
    const data = (await response.json()) as LLMResponse;

    if (data.answer) {
      console.log("Response from /ask-llm-with-context:", data.answer);
      return data.answer;
    } else if (data.error) {
      console.error("Error from /ask-llm-with-context:", data.error);
      return `Error: ${data.error}`;
    } else {
      console.error("Unexpected response format:", data);
      return "Error: Unexpected response format";
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error("Request failed:", err.message);
      return `Error: ${err.message}`;
    } else {
      console.error("Unknown error occurred:", err);
      return "Error: An unknown error occurred";
    }
  }
}

export async function handleAskFromBot(context: HandlerContext, question: string) {
  const message = await askLLM(question);
  context.send(message);
}

export async function handleAsk(context: HandlerContext) {
  const {
    message: {
      content: { params },
    },
  } = context;
  const { question } = params;
  console.log(question);
  const message = await askLLM(question);
  context.send(message);

}


interface Friend {
  name: string;
  ens_address: string;
}

export async function handleFriend(context: HandlerContext) {
  try {
    const response = await fetch(`${BACKEND_URL}/random-friend`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Error: ${response.statusText}`);
      context.reply(`Error: ${response.statusText}`);
      return;
    }

    const friend = (await response.json()) as Friend;

    if (friend?.ens_address && friend?.name) {
      const message = `Meet ${friend.name} : ${friend.ens_address} . Have fun!`;
      context.send(message);
    } else {
      console.error("Unexpected response format:", friend);
      context.reply("Error: Unexpected response format");
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error("Request failed:", err.message);
      context.reply(`Error: ${err.message}`);
    } else {
      console.error("Unknown error occurred:", err);
      context.reply("Error: An unknown error occurred");
    }
  }
}

