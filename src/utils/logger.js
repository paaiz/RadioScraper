const log = (message) => {
  console.log(`[${new Date().toLocaleString()}] - ${message}`);
};

const warn = (message) => {
  console.warn(`[${new Date().toLocaleString()}] [WARN] - ${message}`);
};

const error = (message, err) => {
  console.error(`[${new Date().toLocaleString()}] [ERROR] - ${message}`, err ?? "");
};

module.exports = { log, warn, error };
