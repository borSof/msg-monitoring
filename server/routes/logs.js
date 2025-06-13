const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const requirePermission = require('../utils/requirePermission');

const logDir = path.join(__dirname, '..', 'logs');

// Вземи текуща дата във формат YYYY-MM-DD
function getDateString() {
  const now = new Date();
  return now.toISOString().slice(0,10);
}

// System log
router.get('/system-log', requirePermission('view_status'), (req, res) => {
  const date = req.query.date || getDateString();
  const logPath = path.join(logDir, `system-${date}.log`);
  let log = [];
  try { log = fs.readFileSync(logPath, 'utf8').split('\n'); } catch {}
  res.json(log.slice(-100));
});

// Audit log
router.get('/audit-log', requirePermission('view_status'), (req, res) => {
  const date = req.query.date || getDateString();
  const logPath = path.join(logDir, `audit-${date}.log`);
  let log = [];
  try { log = fs.readFileSync(logPath, 'utf8').split('\n'); } catch {}
  res.json(log.slice(-100));
});

// Error log
router.get('/error-log', requirePermission('view_status'), (req, res) => {
  const date = req.query.date || getDateString();
  const logPath = path.join(logDir, `error-${date}.log`);
  let log = [];
  try { log = fs.readFileSync(logPath, 'utf8').split('\n'); } catch {}
  res.json(log.slice(-100));
});

// Дни с логове по тип
router.get('/log-dates/:type', requirePermission('view_status'), (req, res) => {
  const type = req.params.type;
  let files = [];
  try {
    files = fs.readdirSync(logDir)
      .filter(f => f.startsWith(type + "-") && f.endsWith(".log"))
      .map(f => f.slice(type.length + 1, -4));
  } catch {}
  res.json(files);
});

module.exports = router;
