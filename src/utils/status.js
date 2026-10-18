const { ActivityType } = require("discord.js");
const { activeSessions } = require("./session");

// Template status saat ada radio yang sedang diputar.
// Gunakan {station} sebagai placeholder nama stasiun radio.
const PLAYING_STATUSES = [
  "Now Playing: {station}",
  "Vibing with you 🎵",
  "Streaming {station} 📻",
  "Listening to {station} 🎶",
];

// Status saat bot sedang idle (tidak ada radio yang diputar)
const IDLE_STATUSES = [
  "Vibing with you 🎵",
  "Tuning in...",
  "Finding your frequency 📻",
  "On the airwaves",
  "Your radio companion",
];

let statusInterval = null;
let currentIndex = 0;
let currentStation = null;

const stopStatusRotation = () => {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
};

/**
 * Mulai rotasi status saat idle
 * @param {Client} client
 */
const startIdleRotation = (client) => {
  stopStatusRotation();
  currentStation = null;
  currentIndex = Math.floor(Math.random() * IDLE_STATUSES.length);

  const cycle = () => {
    if (!client.user) return;
    const text = IDLE_STATUSES[currentIndex];
    client.user.setActivity({
      name: "Custom Status",
      state: text,
      type: ActivityType.Custom,
    });
    currentIndex = (currentIndex + 1) % IDLE_STATUSES.length;
  };

  cycle();
  statusInterval = setInterval(cycle, 15_000);
};

/**
 * Set status dan mulai rotasi saat radio sedang diputar
 * @param {Client} client
 * @param {string} radioName
 */
const setNowPlaying = (client, radioName) => {
  stopStatusRotation();
  currentStation = radioName;
  currentIndex = 0;

  const cycle = () => {
    if (!client.user) return;
    const template = PLAYING_STATUSES[currentIndex];
    const text = template.replace(/{station}/g, currentStation);

    client.user.setActivity({
      name: "Custom Status",
      state: text,
      type: ActivityType.Custom,
    });
    currentIndex = (currentIndex + 1) % PLAYING_STATUSES.length;
  };

  cycle();
  statusInterval = setInterval(cycle, 15_000);
};

/**
 * Bersihkan status Now Playing dan kembali ke status idle.
 * Jika masih ada session di server lain, ambil stasiun radio terakhir.
 * @param {Client} client
 */
const clearNowPlaying = (client) => {
  if (activeSessions.size > 0) {
    const lastSession = [...activeSessions.values()].pop();
    setNowPlaying(client, lastSession.radioObj.nativeRadioName);
  } else {
    startIdleRotation(client);
  }
};

module.exports = {
  PLAYING_STATUSES,
  IDLE_STATUSES,
  setNowPlaying,
  clearNowPlaying,
  startIdleRotation,
};
