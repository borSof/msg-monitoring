const express = require('express');
const Message = require('../models/Message');
const Rule = require('../models/Rule');
const Channel = require('../models/Channel');
const requirePermission = require('../utils/requirePermission');
const { systemLog, errorLog } = require('../utils/fileLogger');
const axios = require('axios');
const { aiClassifyMessage } = require('../ai');

const router = express.Router();

// POST /api/messages with Rule Engine + optional AI classification
router.post('/', requirePermission('view_messages'), async (req, res) => {
  try {
    let parsed = req.body;
    const raw = JSON.stringify(parsed);

    // Unwrap root if needed
    if (Object.keys(parsed).length === 1 && typeof parsed[Object.keys(parsed)[0]] === 'object') {
      parsed = parsed[Object.keys(parsed)[0]];
      systemLog("UNWRAP", `Unwrapped root key to ${JSON.stringify(parsed).substring(0, 200)}`);
    }

    const rules = await Rule.find().sort({ priority: 1, createdAt: 1 });
    const tags = [];
    let matchedRuleName = null;
    let finalAction = 'Allowed';

    // ----- Rule Engine -----
    const getField = (obj, path) =>
      path.split('.').reduce((o, p) => (o && o[p] != null ? o[p] : null), obj);

    function checkCondition(obj, cond) {
      const val = getField(obj, cond.field);
      if (val == null) return false;
      const str = String(val);
      switch (cond.operator) {
        case 'contains': return str.includes(cond.value);
        case 'not contains': return !str.includes(cond.value);
        case 'equals': return str === cond.value;
        case 'regex': return new RegExp(cond.value).test(str);
        case 'gt': return Number(str) > Number(cond.value);
        case 'lt': return Number(str) < Number(cond.value);
        default: return false;
      }
    }

    for (const r of rules) {
      const result = (r.logic === "AND")
        ? r.conditions.every(cond => checkCondition(parsed, cond))
        : r.conditions.some(cond => checkCondition(parsed, cond));
      if (!result) continue;

      if (r.aggregateConditions?.length > 0) {
        const results = await Promise.all(
          r.aggregateConditions.map(c => checkAggregateCondition(c, parsed))
        );
        const passed = r.logic === "AND"
          ? results.every(r => r)
          : results.some(r => r);
        if (!passed) continue;
      }

      if (r.action === 'Tag') {
        if (r.tag) tags.push(r.tag);
        continue;
      }
      if (!matchedRuleName || r.priority < 9999) {
        matchedRuleName = r.name;
        finalAction = r.action;
        break;
      }
    }

    // fallback (ако няма съвпаднало правило)
    if (!matchedRuleName) {
      const low = raw.toLowerCase();
      if (low.includes('ban')) finalAction = 'Forbidden';
      else if (low.includes('allow') || low.includes('ok')) finalAction = 'Allowed';
    }

    // ----- AI Classification (по избор) -----
    let aiResult = null;
    try {
      aiResult = await aiClassifyMessage(raw);
      if (aiResult?.label) {
        tags.push('AI:' + aiResult.label);
      }
    } catch (err) {
      errorLog(err, "AI classification error");
    }

    // ----- Save message -----
    const msg = new Message({
      rawXml: raw,
      parsed,
      status: finalAction,
      tags,
      matchedRule: matchedRuleName,
      aiResult
    });
    await msg.save();

    // --- Trigger webhooks if any ---
    const triggerStatus = finalAction;
    const channels = await Channel.find({ active: true, triggerOn: triggerStatus });
    for (const ch of channels) {
      try {
        await axios.post(ch.callbackUrl, {
          status: finalAction,
          id: msg._id,
          tags,
          matchedRule: matchedRuleName,
          parsed: msg.parsed,
          rawXml: msg.rawXml,
          receivedAt: msg.receivedAt
        });
        systemLog("WEBHOOK_SENT", `Sent to ${ch.callbackUrl} status=${finalAction}`);
      } catch (e) {
        errorLog(e, `Webhook send failed: ${ch.callbackUrl}`);
      }
    }

    systemLog("NEW_MESSAGE", `Message ${msg._id} status: ${finalAction}`);
    res.json({ status: finalAction, id: msg._id, tags, matchedRule: matchedRuleName, aiResult });
  } catch (e) {
    errorLog(e, "Error saving message");
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/paged
router.get('/paged', requirePermission('view_messages'), async (req, res) => {
  const {
    skip = 0,
    limit = 20,
    sort = 'receivedAt',
    dir = 'desc',
    status,
    matchedRule,
    tag,
    q
  } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (matchedRule) filter.matchedRule = matchedRule;
  if (tag) filter.tags = tag;

  if (q) {
    const orFilter = [
      { 'parsed.text':     { $regex: q, $options: 'i' } },
      { 'parsed.clientId': { $regex: q, $options: 'i' } },
      { 'parsed.target':   { $regex: q, $options: 'i' } }
    ];
    if (!isNaN(Number(q))) {
      orFilter.push({ 'parsed.amount': Number(q) });
    }
    filter.$or = orFilter;
  }

  const sortObj = { [sort]: dir === 'asc' ? 1 : -1 };

  const [total, messages] = await Promise.all([
    Message.countDocuments(filter),
    Message.find(filter)
      .sort(sortObj)
      .skip(Number(skip))
      .limit(Number(limit))
  ]);
  res.json({ total, messages });
});

// GET /api/messages
router.get('/', requirePermission('view_messages'), async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find().sort({ receivedAt: -1 }).skip(skip).limit(limit),
    Message.countDocuments()
  ]);

  res.json({ messages, total, page, limit });
});

// PATCH /api/messages/:id/status
router.patch('/:id/status', requirePermission('review_maybe'), async (req, res) => {
  const { status } = req.body;
  if (!status || !["Allowed", "Forbidden", "Maybe"].includes(status))
    return res.status(400).json({ error: "Invalid status" });

  try {
    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      { status: status },
      { new: true }
    );
    if (!updated) {
      errorLog("PATCH_MESSAGE_STATUS", `Message ${req.params.id} not found`);
      return res.status(404).json({ error: "Message not found" });
    }

    const channels = await Channel.find({ active: true, triggerOn: status });
    for (const ch of channels) {
      try {
        await axios.post(ch.callbackUrl, {
          status,
          id: updated._id,
          tags: updated.tags,
          matchedRule: updated.matchedRule,
          parsed: updated.parsed,
          rawXml: updated.rawXml,
          receivedAt: updated.receivedAt
        });
        systemLog("WEBHOOK_SENT", `Status update to ${status}: sent to ${ch.callbackUrl}`);
      } catch (e) {
        errorLog(e, `Webhook send failed (status update): ${ch.callbackUrl}`);
      }
    }

    systemLog("PATCH_MESSAGE_STATUS", `Status of message ${req.params.id} updated to ${status}`);
    res.json({ message: "Status updated", id: req.params.id, status });
  } catch (e) {
    errorLog(e, "Error updating message status");
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET maybe-only messages
router.get('/maybe', requirePermission('view_messages'), async (req, res) => {
  try {
    systemLog("GET_MAYBE_MESSAGES", "Fetching messages with status 'Maybe'");
    const m = await Message.find({ status: 'Maybe' }).sort({ receivedAt: -1 });
    res.json(m);
  } catch (e) {
    errorLog(e, "Error fetching maybe messages");
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
