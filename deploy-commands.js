const { REST, Routes } = require("discord.js");
require("dotenv").config();

const commands = [
  {
    name: "ping",
    description: "Проверка связи"
  },
  {
    name: "say",
    description: "Бот скажет что-то",
    options: [
      {
        name: "text",
        type: 3, // STRING
        description: "Текст для отправки",
        required: true
      }
    ]
  }
];

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log("Регистрация команд...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("Команды зарегистрированы ✅");
  } catch (err) {
    console.error(err);
  }
})();