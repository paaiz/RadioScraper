const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Client,
  CommandInteraction,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

module.exports = {
  name: "play",
  category: "Music",
  categoryEmoji: "",
  description: "Make the bot play some radio for you!",
  hidden: false,

  /**
   *
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */
  callback: async (client, interaction) => {
    if (!fs.existsSync(path.join(__dirname, `../assets/radio-list.json`))) {
      return interaction.reply({ content: "There are no radio list being made!", ephemeral: true });
    }

    const getRadio = JSON.parse(
      fs.readFileSync(path.join(__dirname, `../assets/radio-list.json`), { encoding: "utf-8" })
    );

    if (getRadio.length === 0) {
      return interaction.reply({ content: "There are no radio data!", ephemeral: true });
    }

    const radioList = getRadio.map((item) => ({
      label: item.nativeRadioName,
      value: item.radioName,
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("initial_radio_list")
        .setPlaceholder("Nothing selected")
        .addOptions(radioList)
    );

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `Radio channel list for: ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setColor("#F1E05A")
      .setDescription(`There are **${getRadio.length}** radio channels that you can listen!`)
      .setFields({
        name: "📝 Notes",
        value: [
          ">>> This Radio command are still being tested, so bugs may appear!",
          `To report a bug, you can dm **Paiz#5599**`,
        ].join("\n"),
      });

    interaction.reply({ embeds: [embed], components: [row] });
  },
};
