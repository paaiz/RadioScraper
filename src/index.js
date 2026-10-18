require("dotenv/config");
const dns = require("node:dns");
dns.setDefaultResultOrder("ipv4first");

const { Client, Collection } = require("discord.js");
const client = new Client({
  intents: [
    "Guilds",
    "DirectMessages",
    "GuildMessages",
    "MessageContent",
    "GuildMembers",
    "GuildVoiceStates",
  ],
});

const { eventListener } = require("../src/utils/handler");

client.commands = new Collection();
eventListener(client);

client.login(process.env.BOT_TOKEN);
