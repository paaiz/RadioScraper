const { CommandInteraction, Client } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");

module.exports = {
  name: "stop",
  category: "Music",
  categoryEmoji: "",
  description: "Stop the playing radio!",
  hidden: false,

  /**
   *
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */
  callback: async (client, interaction) => {
    if (!interaction.guild) {
      return interaction.reply({ content: "This is a guild specific command!", ephemeral: true });
    }
    // ! SHOULD CHECK IF THE CHANNEL ARE THE SAME WITH THE USER THAT RUN THIS COMMAND!

    const connection = getVoiceConnection(interaction.guild.id);
    if (!connection) {
      return interaction.reply({ content: "No active connection!", ephemeral: true });
    }

    connection.destroy();
    return interaction.reply({ content: "Destroyed voice connection!", ephemeral: true });
  },
};
