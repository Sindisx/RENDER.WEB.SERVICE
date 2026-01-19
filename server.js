
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fetch = require("node-fetch");
const app = express();
const fs = require('fs');

require("dotenv").config();

const { REST, Routes } = require('discord.js');
const { getCommandsData, sendMessageToChannel } = require('./commands');

const { startBot } = require("./bot");
startBot();

// Загружаем вебхуки из переменных окружения
// Ожидается формат: WEBHOOK_MAIN=https://..., WEBHOOK_SUPPORT=https://..., и т.д.
function loadWebhooks() {
  const webhooks = {};
  const defaultWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const defaultChannelId = process.env.DISCORD_CHANNEL_ID;
  
  // Основной вебхук
  webhooks.main = {
    id: 'main',
    name: process.env.WEBHOOK_MAIN_NAME || 'Основной канал',
    webhookUrl: defaultWebhookUrl,
    channelId: defaultChannelId,
    botName: 'Бот'
  };

  // Загружаем дополнительные вебхуки из переменных окружения
  // Формат переменной: WEBHOOK_KEY_NAME, WEBHOOK_KEY_URL, WEBHOOK_KEY_CHANNEL_ID
  const envKeys = Object.keys(process.env);
  const webhookKeys = new Set();
  
  envKeys.forEach(key => {
    const match = key.match(/^WEBHOOK_(\w+)_URL$/);
    if (match) {
      webhookKeys.add(match[1]);
    }
  });

  webhookKeys.forEach(key => {
    const url = process.env[`WEBHOOK_${key}_URL`];
    const name = process.env[`WEBHOOK_${key}_NAME`] || key;
    const channelId = process.env[`WEBHOOK_${key}_CHANNEL_ID`];
    if (url) {
      webhooks[key.toLowerCase()] = {
        id: key.toLowerCase(),
        name: name,
        webhookUrl: url,
        channelId: channelId,
        botName: `Бот_${key}`
      };
    }
  });

  return webhooks;
}

const WEBHOOKS = loadWebhooks();

// Регистрация Discord слэш-команд
async function deployCommands() {
  try {
    const commands = getCommandsData();

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

deployCommands();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Статические файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));
app.get('/games', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'games.html'));
});
// Редирект на старый сайт
app.get('/old-site', (req, res) => {
  res.redirect(302, 'https://swkgstudio.github.io/');
});

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

async function sendToDiscord(name, message, webhookKey = 'main', useBot = false) {
  const webhook = WEBHOOKS[webhookKey];
  
  if (!webhook) {
    throw new Error(`Чат '${webhookKey}' не найден`);
  }

  const processedMessage = processMentions(message); // заменяем @ на упоминания

  // Если используем бота
  if (useBot) {
    if (!webhook.channelId) {
      throw new Error(`Для канала '${webhookKey}' не задан ID канала. Используйте WEBHOOK_${webhookKey.toUpperCase()}_CHANNEL_ID`);
    }

    try {
      const { sendMessageToChannel } = require('./bot');
      const sentMessage = await sendMessageToChannel(webhook.channelId, processedMessage);
      console.log(`Сообщение отправлено ботом в канал ${webhook.channelId}`);
      return sentMessage;
    } catch (error) {
      console.error("Ошибка при отправке через бота:", error);
      throw new Error(`Не удалось отправить сообщение через бота: ${error.message}`);
    }
  }

  // Используем вебхук
  if (!webhook.webhookUrl) {
    throw new Error(`Для канала '${webhookKey}' не задан вебхук URL`);
  }

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

  console.log("Sending to Discord via webhook:", JSON.stringify(payload, null, 2));

  const res = await fetch(webhook.webhookUrl, {
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
  const { name, message, chatId, useBot } = req.body;

  if (!name || name.trim() === "" || !message || message.trim() === "") {
    return res.status(400).send("Имя и сообщение не могут быть пустыми");
  }

  try {
    await sendToDiscord(name, message, chatId || 'main', useBot || false);
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// API для получения списка доступных чатов
app.get("/api/chats", (req, res) => {
  const chats = Object.entries(WEBHOOKS).map(([key, value]) => ({
    id: key,
    name: value.name
  }));
  res.json(chats);
});


app.get('/', (req, res) => {
  res.send('Бот работает!');
});
