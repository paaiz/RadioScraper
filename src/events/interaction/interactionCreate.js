const { CommandInteraction } = require("discord.js");

/**
 * @param {Client} client
 * @param {CommandInteraction} interaction
 */
module.exports = async (client, interaction) => {
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;

    try {
      await command.autocomplete(client, interaction);
    } catch (err) {
      console.error(`[Autocomplete Error] - ${interaction.commandName}:`, err);
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.callback(client, interaction);
    } catch (err) {
      console.error(`[Command Error] - ${interaction.commandName}:`, err);
    }
  }
};
