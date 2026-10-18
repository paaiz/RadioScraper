// Centralized session store shared across commands
// Structure: Map<guildId, { connection, player, resource, collector, message, radioObj, voiceChannel, user, allRadio, stationPage, volume }>
const activeSessions = new Map();

module.exports = { activeSessions };
