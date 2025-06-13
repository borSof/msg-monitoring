const express = require('express');
const Role = require('../models/Role');
const requirePermission = require('../utils/requirePermission');

const router = express.Router();

// Get all roles
router.get('/', requirePermission('manage_roles'), async (req, res) => {
  const roles = await Role.find();
  res.json(roles);
});

// Create role
router.post('/', requirePermission('manage_roles'), async (req, res) => {
  const { name, permissions } = req.body;
  if (!name) return res.status(400).json({ error: "Missing role name" });
  const exists = await Role.findOne({ name });
  if (exists) return res.status(409).json({ error: "Role exists" });
  const role = new Role({ name, permissions });
  await role.save();
  res.status(201).json(role);
});

// Update role
router.put('/:id', requirePermission('manage_roles'), async (req, res) => {
  const { permissions } = req.body;
  const updated = await Role.findByIdAndUpdate(req.params.id, { permissions }, { new: true });
  res.json(updated);
});

// Delete role
router.delete('/:id', requirePermission('manage_roles'), async (req, res) => {
  await Role.findByIdAndDelete(req.params.id);
  res.json({ message: "Role deleted" });
});

module.exports = router;
