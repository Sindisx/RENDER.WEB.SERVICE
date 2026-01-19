// bot.js
const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

let botClient = null;

function startBot() {
  botClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages] });

  botClient.on("ready", () => {
    console.log(`Бот в сети! Username: ${botClient.user.tag}`);
  });

  botClient.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === "ping") {
      await interaction.reply("Я жив, не ори");
    }

    if (commandName === "say") {
      const text = interaction.options.getString("text");
      await interaction.reply(text);
    }
  });

  botClient.login(process.env.BOT_TOKEN);
}

// Функция для отправки сообщения через бота в канал
async function sendMessageToChannel(channelId, message) {
  if (!botClient) {
    throw new Error("Бот не инициализирован");
  }
  
  try {
    const channel = await botClient.channels.fetch(channelId);
    if (!channel) {
      throw new Error(`Канал ${channelId} не найден`);
    }
    
    const sentMessage = await channel.send(message);
    return sentMessage;
  } catch (error) {
    console.error("Ошибка при отправке сообщения:", error);
    throw error;
  }
}

module.exports = { 
  startBot,
  getBotClient: () => botClient,
  sendMessageToChannel
};