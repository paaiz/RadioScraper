const { EmbedBuilder } = require("discord.js");
const { activeSessions } = require("../utils/session");

module.exports = {
  name: "nowplaying",
  category: "Music",
  description: "Show the currently playing radio station info",
  hidden: false,
  options: [],

  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */
  callback: async (client, interaction) => {
    const session = activeSessions.get(interaction.guildId);

    if (!session) {
      return interaction.reply({
        content: "There is no radio currently playing in this server.",
        ephemeral: true,
      });
    }

    const { radioObj, voiceChannel, user, volume } = session;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: radioObj.nativeRadioName,
        iconURL:
          radioObj.radioImg && radioObj.radioImg.startsWith("http") ? radioObj.radioImg : undefined,
      })
      .setColor("#57F287")
      .setThumbnail(
        radioObj.radioImg && radioObj.radioImg.startsWith("http") ? radioObj.radioImg : null,
      )
      .setDescription(
        `Status: **PLAYING**\nChannel: <#${voiceChannel.id}>\nVolume: **${volume}%**`,
      )
      .setFooter({
        text: `Requested by ${user.username}`,
        iconURL: user.displayAvatarURL({ dynamic: true }),
      });

    await interaction.reply({ embeds: [embed] });
  },
};
