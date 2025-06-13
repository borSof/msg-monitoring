const express = require('express');
const { body, validationResult } = require('express-validator');
const Rule = require('../models/Rule');
const requirePermission = require('../utils/requirePermission');
const { auditLog } = require('../utils/fileLogger');

const router = express.Router();

// GET: всички правила
router.get('/', requirePermission('edit_rules'), async (req, res) => {
  const rules = await Rule.find().sort({ priority: 1, createdAt: 1 });
  res.json(rules);
});

// POST: създай правило
router.post('/',
  requirePermission('edit_rules'),
  [
    body('name').isString().notEmpty(),
    body('logic').isIn(['AND', 'OR']),
    body('action').isIn(['Allowed','Forbidden','Tag','Maybe']),
    body('priority').isInt({ min: 1 }),
    body('conditions').optional().isArray(),
    body('conditions.*.field').optional().isString().notEmpty(),
    body('conditions.*.operator').optional().isIn(['contains', 'not contains', 'equals','regex','gt','lt']),
    body('conditions.*.value').optional().isString().notEmpty(),
    // агрегатни
    body('aggregateConditions').optional().isArray(),
    body('aggregateConditions.*.field').optional().isString().notEmpty(),
    body('aggregateConditions.*.keyField').optional().isString().notEmpty(),
    body('aggregateConditions.*.period').optional().isString().notEmpty(),
    body('aggregateConditions.*.unique').optional().isBoolean(),
    body('aggregateConditions.*.operator').optional().isIn(['lt', 'lte', 'eq', 'gte', 'gt']),
    body('aggregateConditions.*.threshold').optional().isNumeric()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const rule = new Rule(req.body);
    await rule.save();
    auditLog("CREATE_RULE", req.user?.username || "system", rule.toObject());
    res.status(201).json(rule);
  }
);

// PUT: редактирай правило
router.put('/:id', requirePermission('edit_rules'), async (req, res) => {
  const updated = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  auditLog("UPDATE_RULE", req.user?.username || "system", updated.toObject());
  res.json(updated);
});

// DELETE: триене на правило
router.delete('/:id', requirePermission('edit_rules'), async (req, res) => {
  const deleted = await Rule.findByIdAndDelete(req.params.id);
  auditLog("DELETE_RULE", req.user?.username || "system", deleted?.toObject() || {});
  res.status(204).send();
});

module.exports = router;
