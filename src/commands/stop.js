const { activeSessions } = require("../utils/session");

module.exports = {
  name: "stop",
  category: "Music",
  description: "Stop the radio playback and disconnect from voice channel",
  hidden: false,
  options: [],

  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */
  callback: async (client, interaction) => {
    const guildId = interaction.guildId;
    const session = activeSessions.get(guildId);

    if (!session) {
      return interaction.reply({
        content: "There is no radio currently playing in this server.",
        ephemeral: true,
      });
    }

    try {
      session.collector?.stop("stopped");
      session.player.stop();
      session.connection.destroy();
    } catch {}

    session.message
      ?.edit({ content: "Playback stopped.", embeds: [], components: [] })
      .catch(() => {});

    activeSessions.delete(guildId);

    await interaction.reply({
      content: "Playback stopped.",
      ephemeral: true,
    });
  },
};
