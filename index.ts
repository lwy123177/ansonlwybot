import { config } from "dotenv";
import express from "express";
import ffmpeg from "fluent-ffmpeg";
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

const parseCommand = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const match = text.match(urlRegex);
  const url = match ? match[0] : "";

  const startRegex = /--start\s*([\d:]+)/;
  const startMatch = text.match(startRegex);
  const startTime = startMatch ? startMatch[1] : null;

  const endRegex = /--end\s*([\d:]+)/;
  const endMatch = text.match(endRegex);
  const endTime = endMatch ? endMatch[1] : null;

  return { url, startTime, endTime };
};

const getDurationSeconds = (startTime: string, endTime: string) => {
  const [startMin, startSec] = startTime
    .split(":")
    .map((x) => Number.parseInt(x));
  const [endMin, endSec] = endTime.split(":").map((x) => Number.parseInt(x));
  return (endMin - startMin) * 60 + (endSec - startSec);
};

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
      "Hello! Just send the youtube url you would like to download for the audio here\n" +
        "You can also specify start or end of the audio, e.g. https://www.youtube.com/watch?v=abcd1234 --start 0:15 --end 1:23"
    );
    return;
  }

  // Send back the same message to the user
  if (text) {
    const { url, startTime, endTime } = parseCommand(text);
    const promise = youtubeDl(url, {
      dumpJson: true,
      format: M4A_FORMAT_CODE,
    })
      .then((payload) => {
        const fileName = `${payload.title.replace(/[^a-zA-Z0-9]/g, "")}.m4a`;
        const filePath = join(tmpdir(), fileName);
        const options = {
          duration: payload.duration,
          title: payload.title,
          thumbnail: payload.thumbnail,
        };
        youtubeDl(url, {
          format: M4A_FORMAT_CODE,
          output: filePath,
        }).then(() => {
          bot.sendMessage(chatId, "Download Completed" + payload.title);
          let sendPath = filePath;
          if (startTime || endTime) {
            const trimmedFileName = `trimmed-${fileName}`;
            const trimmedFilePath = join(tmpdir(), trimmedFileName);
            const newDuration = getDurationSeconds(
              startTime || "0:00",
              endTime || payload.duration_string
            );
            bot.sendMessage(chatId, "Trimming Begin" + payload.title);
            ffmpeg(filePath)
              .setStartTime(startTime || "0:00")
              .setDuration(newDuration)
              .save(trimmedFilePath)
              .on("progress", function (progress) {
                if (progress.percent) {
                  const percent = Math.min(
                    99.9,
                    Math.max(0, Math.round(progress.percent))
                  );
                  bot.sendMessage(chatId, `Progress: ${percent}%`);
                }
              })
              .on("error", (e) => {
                bot.sendMessage(chatId, e.message);
              })
              .on("end", () => {
                bot.sendMessage(chatId, "Trimming Completed" + payload.title);
                bot
                  .sendAudio(chatId, trimmedFilePath, {
                    ...options,
                    duration: newDuration,
                  })
                  .then(() => {
                    fs.unlinkSync(filePath);
                    fs.unlinkSync(trimmedFilePath);
                  })
                  .catch((error) => {
                    console.error("Error sending audio:", error);
                  });
              });
          } else {
            bot
              .sendAudio(chatId, sendPath, options)
              .then(() => {
                fs.unlinkSync(filePath); // Optionally remove the file after sending
              })
              .catch((error) => {
                console.error("Error sending audio:", error);
              });
          }
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
