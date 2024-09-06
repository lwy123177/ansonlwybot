import { config } from "dotenv";
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import { join } from "path";
import youtubeDl from "youtube-dl-exec";
import createLogger = require("progress-estimator");

// All configuration keys are optional, but it's recommended to specify a storage location.
// Learn more about configuration options below.
const logger = createLogger({
  storagePath: join(__dirname, ".progress-estimator"),
});

config();

// Retrieve the token from the environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const M4A_FORMAT_CODE = "140";

if (!token) {
  throw new Error(
    "TELEGRAM_BOT_TOKEN is not defined in the environment variables"
  );
}

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

const youtubeParser = (url: string) => {
  var regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  var match = url.match(regExp);
  return match && match[7].length == 11 ? match[7] : null;
};

console.log("bot starts listening", bot);

// Listen for any kind of message. There are different kinds of messages.
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Send back the same message to the user
  if (text) {
    const id = youtubeParser(text);
    if (!id) {
      bot.sendMessage(chatId, "URL Invalid");
    } else {
      const url = `https://www.youtube.com/watch?v=${id}`;
      const promise = youtubeDl(url, {
        dumpSingleJson: true,
        format: M4A_FORMAT_CODE,
      }).then((x) => {
        console.log("Download Completed");
        console.log(x);
      });
      const result = logger(promise, `Obtaining ${url}`);
      console.log(result);
    }
  }
});

// Create an instance of the Express application
const app = express();

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Listen on port 80
app.listen(80, () => {
  console.log("HTTP server is listening on port 80");
});
