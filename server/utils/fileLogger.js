const fs = require('fs');
const path = require('path');

function getDateString() {
  const now = new Date();
  return now.toISOString().slice(0,10); // "2025-05-28"
}

const logDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

function getLogPath(name) {
  const date = getDateString();
  return path.join(logDir, `${name}-${date}.log`);
}

function logToFile(filename, line) {
  fs.appendFile(getLogPath(filename), line + '\n', err => {
    if (err) console.error("Log write error:", err);
  });
}

// Logging functions
function systemLog(event, message, level = "info", meta = {}) {
  const line = `[${new Date().toISOString()}][${level}] ${event}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  logToFile('system', line);
}
function auditLog(action, user, details = {}) {
  const line = `[${new Date().toISOString()}][${user}] ${action}: ${JSON.stringify(details)}`;
  logToFile('audit', line);
}
function errorLog(err, context = "") {
  const line = `[${new Date().toISOString()}][ERROR] ${context} ${err.stack || err}`;
  logToFile('error', line);
}

module.exports = { systemLog, auditLog, errorLog, getLogPath, logDir };
