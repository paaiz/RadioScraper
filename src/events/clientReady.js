const { loadSlashCommands } = require("../utils/handler");
const { fetchRadio } = require("../utils/scrape");
const logger = require("../utils/logger");
const { startIdleRotation } = require("../utils/status");
const fs = require("fs");
const path = require("path");

const autoRefreshRadio = async () => {
  const filePath = path.join(__dirname, "../assets/radio-list.json");
  const newData = await fetchRadio(0);

  if (newData.length === 0) {
    logger.warn("Auto-refresh: No data fetched from page 0.");
    return;
  }

  let existingData = [];
  if (fs.existsSync(filePath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }));
    } catch {
      existingData = [];
    }
  }

  let addedCount = 0;
  for (const item of newData) {
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

  fs.writeFileSync(filePath, JSON.stringify(existingData, null, 4), { encoding: "utf-8" });
  logger.log(
    `Auto-refresh complete! Added ${addedCount} new station(s). Total: ${existingData.length}`,
  );
};

module.exports = async (client) => {
  await loadSlashCommands(client);

  const getSlashCommands = client.commands.map((x) => x);

  try {
    await client.application.commands.set(getSlashCommands);
    logger.log("Slash commands deployed globally!");
  } catch (err) {
    logger.error("Failed to deploy slash commands:", err);
  }

  logger.log(`${client.user.tag} is ready!`);
  startIdleRotation(client);

  autoRefreshRadio().catch((err) => logger.error("Auto-refresh failed:", err));
};
