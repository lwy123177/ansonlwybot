import { config } from "dotenv";
import express from "express";
import fs from "fs";
import TelegramBot from "node-telegram-bot-api";
import { tmpdir } from "os";
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
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "/start") {
    bot.sendMessage(
      chatId,
      "Hello! Just send the youtube url you would like to download for the audio here"
    );
    return;
  }

  // Send back the same message to the user
  if (text) {
    const id = youtubeParser(text);
    if (!id) {
      bot.sendMessage(chatId, "URL Invalid");
    } else {
      const url = `https://www.youtube.com/watch?v=${id}`;
      const promise = youtubeDl(url, {
        dumpJson: true,
        format: M4A_FORMAT_CODE,
      })
        .then((payload) => {
          const fileName = `${payload.title}.m4a`;
          const filePath = join(tmpdir(), fileName);
          youtubeDl(url, {
            format: M4A_FORMAT_CODE,
            output: filePath,
          }).then(() => {
            bot.sendMessage(chatId, "Download Completed" + payload.title);
            bot
              .sendAudio(chatId, filePath, {
                duration: payload.duration,
                title: payload.title,
                thumbnail: payload.thumbnail,
              })
              .then(() => {
                fs.unlinkSync(filePath); // Optionally remove the file after sending
              })
              .catch((error) => {
                console.error("Error sending audio:", error);
              });
          });
        })
        .catch((error) => {
          console.error("Error downloading audio:", error);
          bot.sendMessage(
            chatId,
            "An error occurred while downloading the audio."
          );
        });

      const result = logger(promise, `Obtaining ${url}`);
      bot.sendMessage(chatId, "Download Begin");
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
