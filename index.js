require("dotenv/config");

const fs = require("fs");
const path = require("path");

const { Client, AttachmentBuilder } = require("discord.js");
const client = new Client({
  intents: ["Guilds", "DirectMessages", "GuildMessages", "MessageContent", "GuildMembers"],
});

const { fetchRadio } = require("./scrape");

client.on("ready", () => {
  console.log(`${client.user.tag} is ready!`);
});

let MAIN_PREFIX = "!";

client.on("messageCreate", async (message) => {
  const args = message.content.slice(MAIN_PREFIX.length).trim().split(/ +/g);

  if (!message.content.startsWith(MAIN_PREFIX)) return;

  if (args[0] === "radio") {
    const pages = args[1];
    const getRadio = await fetchRadio(pages);

    fs.writeFileSync(`./radio-list.json`, JSON.stringify(getRadio, null, 4), { encoding: "utf-8" });

    const getJSONFile = path.join(__dirname, `./radio-list.json`);
    const attachment = new AttachmentBuilder().setFile(getJSONFile);

    message.channel.send({ content: "Here is the scraped data!", files: [attachment] });
  }
});

client.login(process.env.BOT_TOKEN);
