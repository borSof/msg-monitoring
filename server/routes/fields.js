const express = require('express');
const router = express.Router();

const FieldMetadata = require('../models/FieldMetadata');
const SystemConfig = require('../models/SystemConfig');
const Message = require('../models/Message');
const { systemLog, auditLog } = require('../utils/fileLogger');
const requirePermission = require('../utils/requirePermission');

// ----- visible-fields -----
router.get('/config/visible-fields', requirePermission('manage_fields'), async (req, res) => {
  const config = await SystemConfig.findOne() || { visibleFields: [] }
  res.json(config.visibleFields)
});

router.put('/config/visible-fields', requirePermission('manage_fields'), async (req, res) => {
  const { visibleFields } = req.body
  if (!Array.isArray(visibleFields)) return res.status(400).json({ error: "visibleFields must be array" })
  let config = await SystemConfig.findOne()
  if (!config) config = new SystemConfig()
  config.visibleFields = visibleFields
  await config.save()
  systemLog("VISIBLE_FIELDS_UPDATE", JSON.stringify(visibleFields));
  res.json(config.visibleFields)
});

// ----- Field Metadata -----
router.get('/fields', requirePermission('manage_fields'), async (req, res) => {
  const fields = await FieldMetadata.find();
  res.json(fields);
});

router.post('/fields', requirePermission('manage_fields'), async (req, res) => {
  const { name, label, description } = req.body;
  if (!name) return res.status(400).json({ error: "Field 'name' is required" });
  let field = await FieldMetadata.findOne({ name });
  if (!field) field = new FieldMetadata({ name });
  if (label !== undefined) field.label = label;
  if (description !== undefined) field.description = description;
  await field.save();
  auditLog("FIELD_METADATA_UPDATE", req.user?.username || "system", { name, label, description });
  res.json(field);
});

router.delete('/fields/:name', requirePermission('manage_fields'), async (req, res) => {
  await FieldMetadata.deleteOne({ name: req.params.name });
  auditLog("FIELD_METADATA_DELETE", req.user?.username || "system", { name: req.params.name });
  res.status(204).send();
});

// ----- Helper: extractPaths -----
function extractPaths(obj, prefix = '') {
  let paths = [];
  for (const k in obj) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      paths = paths.concat(extractPaths(obj[k], path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

// ----- All unique fields in messages -----
router.get('/messages/fields', requirePermission('manage_fields'), async (req, res) => {
  const messages = await Message.find({}, { parsed: 1 });
  const allPaths = new Set();
  for (const m of messages) {
    extractPaths(m.parsed).forEach(p => allPaths.add(p));
  }
  res.json(Array.from(allPaths));
});

module.exports = router;
