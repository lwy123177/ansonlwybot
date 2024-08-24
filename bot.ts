import TelegramBot from "node-telegram-bot-api";

const token = "7434441265:AAGPENDvxIINUbJDeUjC2OUB6oIjhWqcf5M";

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
