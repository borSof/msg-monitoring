const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Role = require('../models/Role');
const requirePermission = require('../utils/requirePermission');
const { systemLog, auditLog, errorLog, getLogPath, logDir } = require('../utils/fileLogger');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

// GET: всички потребители
router.get('/', requirePermission('manage_users'), async (req, res) => {
  const users = await User.find({}, { passwordHash: 0 });
  res.json(users);
});

// POST: създай потребител
router.post('/', requirePermission('manage_users'), async (req, res) => {
  const { username, password, role, active } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ error: "Username exists" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ username, passwordHash, role, active });
  await user.save();
  auditLog("CREATE_USER", req.user?.username || "system", { username, role, active });
  res.status(201).json({ message: "User created" });
});

// PUT: редактирай потребител
router.put('/:id', requirePermission('manage_users'), async (req, res) => {
  const { password, role, active } = req.body;
  const update = { role, active };
  if (password) update.passwordHash = await bcrypt.hash(password, 10);
  await User.findByIdAndUpdate(req.params.id, update);
  auditLog("UPDATE_USER", req.user?.username || "system", { id: req.params.id, ...update });
  res.json({ message: "User updated" });
});

// DELETE: триене на потребител
router.delete('/:id', requirePermission('manage_users'), async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  auditLog("DELETE_USER", req.user?.username || "system", { id: req.params.id });
  res.json({ message: "User deleted" });
});

router.put('/self/change-password', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Няма токен' });
  if (!oldPassword || !newPassword)
    return res.status(400).json({ error: 'Липсва стара/нова парола' });

  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    const user   = await User.findById(id);
    if (!user)   return res.status(404).json({ error: 'Не е намерен' });

    if (!await bcrypt.compare(oldPassword, user.passwordHash))
      return res.status(400).json({ error: 'Невалидна стара парола' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    auditLog('CHANGE_PASSWORD', user.username);
    res.json({ message: 'Паролата е променена успешно' });
  } catch (err) {
    errorLog(err, 'change-password');
    res.status(500).json({ error: 'Грешка при смяна на паролата' });
  }
});

module.exports = router;
