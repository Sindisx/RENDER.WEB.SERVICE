// bot.js
const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

function startBot() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on("ready", () => {
    console.log(`Бот в сети! Username: ${client.user.tag}`);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === "ping") {
      await interaction.reply("pong!");
    }

    if (commandName === "say") {
      const text = interaction.options.getString("text");
      await interaction.reply(text);
    }
  });

  client.login(process.env.BOT_TOKEN);
}

module.exports = { startBot };