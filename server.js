
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fetch = require("node-fetch");
const app = express();
const fs = require('fs');

require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const { startBot } = require("./bot");
startBot();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Регистрация Discord слэш-команд
async function deployCommands() {
  try {
    const commands = [
        new SlashCommandBuilder()
            .setName('ping')
            .setDescription('Проверка бота'),
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

    console.log('Регистрирую Discord команды...');

    await rest.put(
        Routes.applicationGuildCommands(
            process.env.CLIENT_ID,
            process.env.GUILD_ID
        ),
        { body: commands }
    );

    console.log('Discord команды успешно зарегистрированы');
  } catch (error) {
    console.error('Ошибка при регистрации команд:', error);
  }
}

// Вызываем регистрацию команд при старте
deployCommands();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Автопинг для предотвращения засыпания на Render (каждые 25 минут)
setInterval(() => {
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  fetch(baseUrl)
    .then(() => console.log(`[${new Date().toISOString()}] Автопинг выполнен`))
    .catch(err => console.error(`[${new Date().toISOString()}] Ошибка автопинга:`, err.message));
}, 25 * 60 * 1000);



app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat.html"));
});

const mentionMap = {
  "банда": { id: "1442400197950046289", type: "role" },
  "sindband": { id: "1442107423891652741", type: "role" },
  "sindisx": { id: "333194397023993859", type: "user" }
};

function processMentions(text) {
  if (!text || typeof text !== "string") return text || "";
  
  let processed = text;

  Object.entries(mentionMap).forEach(([name, {id, type}]) => {
    const regex = new RegExp(`@${name}\\b`, "gi");
    const mentionSyntax = type === "role" ? `<@&${id}>` : `<@${id}>`;
    processed = processed.replace(regex, mentionSyntax);
  });

  return processed;
}

async function sendToDiscord(name, message) {
  const processedMessage = processMentions(message); // заменяем @на ID
  
  // Извлекаем только ID ролей из mentionMap
  const roleIds = Object.values(mentionMap)
    .filter(item => item.type === "role")
    .map(item => item.id);

  const userIds = Object.values(mentionMap)
    .filter(item => item.type === "user")
    .map(item => item.id);

  const payload = {
    username: name,  // это имя будет "от кого" сообщение
    content: processedMessage,
    allowed_mentions: {
      roles: roleIds,
      users: userIds
    }
  };

  console.log("Sending to Discord:", JSON.stringify(payload, null, 2));

  const res = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Discord error response:", error);
    throw new Error(`Discord error: ${res.status} - ${error}`);
  }
}

app.post("/webhook/chat", async (req, res) => {
  const { name, message } = req.body;

  if (!name || name.trim() === "" || !message || message.trim() === "") {
    return res.status(400).send("Имя и сообщение не могут быть пустыми");
  }

  try {
    await sendToDiscord(name, message);
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Не долетело");
  }
});


app.get('/', (req, res) => {
  res.send('Бот работает!');
});

const newData = req.body;
// Записываем новые данные в файл nativeads.json
fs.writeFile("nativeads.json", JSON.stringify(newData, null, 2), err => {
  if (err) {
    console.error("Error saving data:", err);
    res.status(500).send("Error saving data");
  } else {
    res.send("Data saved successfully");
  }
});
