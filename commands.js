const { SlashCommandBuilder } = require('discord.js');

/**
 * Список всех доступных слэш-команд бота
 */
const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Проверка бота - показывает пинг и статус'),
    execute: async (interaction) => {
      await interaction.reply(`🏓 Понг! Пинг: ${interaction.client.ws.ping}ms`);
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('Показывает справку по всем доступным командам'),
    execute: async (interaction) => {
      const helpText = commands
        .map(cmd => `**/${cmd.data.name}** - ${cmd.data.description}`)
        .join('\n');
      await interaction.reply(`📚 Доступные команды:\n${helpText}`);
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('status')
      .setDescription('Показывает статус бота'),
    execute: async (interaction) => {
      const uptime = interaction.client.uptime;
      const hours = Math.floor(uptime / 3600000);
      const minutes = Math.floor((uptime % 3600000) / 60000);
      await interaction.reply(`✅ Бот работает\n⏱️ Время работы: ${hours}ч ${minutes}м`);
    }
  }
];

/**
 * Экспортируем команды для регистрации
 */
function getCommandsData() {
  return commands.map(cmd => cmd.data.toJSON());
}

/**
 * Получить обработчик команды
 */
function getCommandHandler(commandName) {
  const command = commands.find(cmd => cmd.data.name === commandName);
  return command ? command.execute : null;
}

module.exports = {
  commands,
  getCommandsData,
  getCommandHandler
};
