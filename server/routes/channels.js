const express = require('express');
const Channel = require('../models/Channel');
const SystemConfig = require('../models/SystemConfig');
const requirePermission = require('../utils/requirePermission');
const { resetCache } = require('../ai');

const router = express.Router();


// GET: all
router.get('/', requirePermission('manage_channels'), async (req, res) => {
  const channels = await Channel.find();
  res.json(channels);
});

// POST: създай нов канал
router.post('/', requirePermission('manage_channels'), async (req, res) => {
  const { name, callbackUrl, format, active, triggerOn } = req.body;
  if (!name || !callbackUrl) return res.status(400).json({ error: "Missing required fields" });
  const exists = await Channel.findOne({ name });
  if (exists) return res.status(409).json({ error: "Channel already exists" });
  const channel = new Channel({ name, callbackUrl, format, active, triggerOn });
  await channel.save();
  res.status(201).json(channel);
});

// PUT: редактирай канал
router.put('/:id', requirePermission('manage_channels'), async (req, res) => {
  const { name, callbackUrl, format, active, triggerOn } = req.body;
  const channel = await Channel.findByIdAndUpdate(
    req.params.id,
    { name, callbackUrl, format, active, triggerOn },
    { new: true }
  );
  res.json(channel);
});

// DELETE: триене на канал
router.delete('/:id', requirePermission('manage_channels'), async (req, res) => {
  await Channel.findByIdAndDelete(req.params.id);
  res.json({ message: "Channel deleted" });
});

// === AI CONFIG ===
// GET current AI config
router.get('/config/ai', requirePermission('manage_channels'), async (req, res) => {
  const config = await SystemConfig.findOne() || {};
  res.json({
    aiEnabled: config.aiEnabled ?? true,
    aiToken: config.aiToken ?? '',
    aiModel: config.aiModel ?? 'facebook/bart-large-mnli'
  });
});

// PUT update AI config
router.put('/config/ai', requirePermission('manage_channels'), async (req, res) => {
  let config = await SystemConfig.findOne();
  if (!config) config = new SystemConfig();
  if (req.body.aiEnabled !== undefined) config.aiEnabled = req.body.aiEnabled;
  if (req.body.aiModel !== undefined) config.aiModel = req.body.aiModel;
  if (req.body.aiToken) config.aiToken = req.body.aiToken;
  await config.save();
 resetCache();
  res.json({ success: true });
});

module.exports = router;
