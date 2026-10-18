const {
  ApplicationCommandOptionType,
  CommandInteraction,
  AttachmentBuilder,
} = require("discord.js");
const { fetchRadio } = require("../utils/scrape");

const fs = require("fs");
const path = require("path");

module.exports = {
  name: "radio",
  category: "Music",
  categoryEmoji: "",
  description: "Gives you scraped data!",
  hidden: false,
  options: [
    {
      name: "page",
      description: "Page number that you want to get the data",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
  ],

  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */
  callback: async (client, interaction) => {
    await interaction.deferReply();

    const page = interaction.options.getInteger("page") ?? 0;
    const newRadioData = await fetchRadio(page);

    if (newRadioData.length === 0) {
      return interaction.editReply({
        content: `Failed to scrape data from page **${page}** or no data found.`,
      });
    }

    const filePath = path.join(__dirname, "../assets/radio-list.json");
    let existingData = [];

    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, { encoding: "utf-8" });
        existingData = JSON.parse(fileContent);
      } catch (err) {
        console.error("Error reading existing JSON file:", err);
        existingData = [];
      }
    }

    let addedCount = 0;
    for (const item of newRadioData) {
      const isExist = existingData.some(
        (existing) =>
          (item.radioId && existing.radioId === item.radioId) ||
          existing.radioName === item.radioName,
      );

      if (!isExist) {
        existingData.push(item);
        addedCount++;
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 4), {
      encoding: "utf-8",
    });

    const attachment = new AttachmentBuilder().setFile(filePath);

    await interaction.editReply({
      content: `Scrape success for page **${page}**!\n- Added **${addedCount}** new radio station(s).\n- Total stations stored: **${existingData.length}**`,
      files: [attachment],
    });
  },
};
