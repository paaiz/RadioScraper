const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const getAllFiles = (dirPath) => {
  const files = fs.readdirSync(dirPath, {
    withFileTypes: true,
  });
  let commandFiles = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);

    if (file.isDirectory()) {
      commandFiles = [...commandFiles, ...getAllFiles(filePath)];
      continue;
    }

    commandFiles.push(filePath);
  }

  return commandFiles;
};

const loadSlashCommands = async (client) => {
  const cmdPath = path.join(__dirname, "../commands");
  const files = getAllFiles(cmdPath);

  for (let file of files) {
    const commandObject = require(file);

    let commandName = file.split(/[/\\]/);
    commandName = commandName.pop();
    commandName = commandName.split(".")[0];

    client.commands.set(commandName, commandObject);
  }

  logger.log(`Loaded ${files.length} (/) commands!`);
};

const eventListener = (client) => {
  const eventPath = path.join(__dirname, "../events");
  const files = getAllFiles(eventPath);

  for (let file of files) {
    const eventObject = require(file);

    let eventName = file.split(/[/\\]/);
    eventName = eventName.pop();
    eventName = eventName.split(".")[0];

    try {
      client.on(eventName, eventObject.bind(null, client));
    } catch {
      if (Object.entries(eventObject).length === 0) {
        throw new Error(`event "${eventName}" does not have a callback function!`);
      }
    }
  }
};

module.exports = { loadSlashCommands, eventListener, getAllFiles };
