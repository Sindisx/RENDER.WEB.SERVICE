
const express = require('express');
const multer = require('multer');
const path = require('path');
const fetch = require("node-fetch");
const http = require('http');
const app = express();
const fs = require('fs');
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1462398256632955047/6zIBGMyPKQH9VfqKK3mV4kTuQnNVFHNNpYPsI5Er_qkoN1JgFu0iLRQe1ScMrY9F3lWt";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

app.use(express.static('public')); // Папка со статическими файлами

app.post('/upload', upload.array('files'), (req, res) => {
  console.log('Uploaded files:', req.files);
  res.send('Files uploaded successfully');
});

// Добавляем маршрут для отображения странички
app.get('/games', (req, res) => {
  // Отправляем файл games.html из папки public
  res.sendFile(path.join(__dirname, 'public', 'games.html'));
});

const server = http.createServer((req, res) => {
  // Redirect to the specified URL
  res.writeHead(302, { 'Location': 'https://swkgstudio.github.io/' });
  res.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get('/nativeads', (req, res) => {
  fs.readFile('nativeads.json', 'utf8', (err, data) => {
      if (err) {
          console.error(err);
          res.status(500).json({ error: 'Internal Server Error', details: err.message });
          return;
      }
      res.json(JSON.parse(data));
  });
});

app.post('/nativeads', async (req, res) => {
  try {
      const newData = req.body;
      await fs.writeFile('nativeads.json', JSON.stringify(newData, null, 2));
      res.send('Data updated successfully');
  } catch (error) {
      console.error('Error updating data:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.get("/nativeadssite", (req, res) => {
const filePath = path.join(__dirname, "nativeads.html");
res.sendFile(filePath);
});

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

app.get("/native_ads_load.php", (req, res) => {
// Читаем содержимое файла nativeads.json
fs.readFile("nativeads.json", "utf8", (err, data) => {
  if (err) {
    console.error("Error loading data:", err);
    res.status(500).send("Error loading data");
  } else {
    // Отправляем содержимое как JSON
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  }
});
});

app.post("/native_ads_save.php", (req, res) => {
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
});