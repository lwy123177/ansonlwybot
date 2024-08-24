import { config } from "dotenv";

config();

import TelegramBot from "node-telegram-bot-api";

// Retrieve the token from the environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error(
    "TELEGRAM_BOT_TOKEN is not defined in the environment variables"
  );
}

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Listen for any kind of message. There are different kinds of messages.
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Send back the same message to the user
  if (text) {
    bot.sendMessage(chatId, text);
  }
});
