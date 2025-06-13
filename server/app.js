const { systemLog, auditLog, errorLog, getLogPath, logDir } = require('./utils/fileLogger');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const xml2js = require('xml2js');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { checkAggregateCondition } = require('./utils/aggregateChecker');

const app = express();
const PORT = process.env.PORT || 3000;
const FieldMetadata = require('./models/FieldMetadata');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const JWT_SECRET = process.env.JWT_SECRET || 'topsecret'; // Използвай ENV на продукция!
const Role = require('./models/Role');
const Channel = require('./models/Channel');
const axios = require('axios');

const { aiClassifyMessage } = require('./ai');

require('dotenv').config();


// CORS and body parsing middleware
app.use(cors({ origin: ['http://localhost:3001', 'http://192.168.199.129:3001'] }));
app.use(express.json());
app.use(express.text({ type: 'application/xml' }));

// Logging middleware
app.use((req, res, next) => {
  systemLog("API_CALL", `${req.method} ${req.url}`);
  next();
});

// XML parsing middleware
app.use((req, res, next) => {
  if (req.is('application/xml')) {
    systemLog("XML_RECEIVED", req.body ? req.body.substring(0,200) : "");
    xml2js.parseString(req.body, { explicitArray: false }, (err, result) => {
      if (err) {
        errorLog(err, "XML parse failed");
        return res.status(400).send('Invalid XML');
      }
      req.body = result;
      next();
    });
  } else {
    next();
  }
});
// Import models
const Message = require('./models/Message');
const Rule = require('./models/Rule');
const SystemConfig = require('./models/SystemConfig');

// LOGIN
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  // Търсим потребителя в базата данни
  const user = await User.findOne({ username });
  if (!user || !user.active)
    return res.status(401).json({ error: "Invalid credentials" });

  // Сравняваме паролата
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  // ВЗИМАМЕ ПРАВАТА ДИНАМИЧНО
  const roleDoc = await Role.findOne({ name: user.role });
  const permissions = roleDoc ? roleDoc.permissions : [];

  // Генерираме токен с ID-то на потребителя
  const token = jwt.sign(
    { username: user.username, role: user.role, id: user._id },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  console.log('Generated Token:', token); // Логваме токена за проверка

  // Изпращаме токена в отговора и записваме в `localStorage` на клиента
  res.json({
    token,
    username: user.username,
    role: user.role,
    permissions
  });

  // Логваме успешния вход
  auditLog("LOGIN", user.username, { time: new Date().toISOString() });
});

//+++++Callback
// --- CHANNEL (webhook) MANAGEMENT API ---
// GET: всички канали
app.get('/api/channels', async (req, res) => {
  const channels = await Channel.find();
  res.json(channels);
});

// POST: създай нов канал
app.post('/api/channels', async (req, res) => {
  const { name, callbackUrl, format, active, triggerOn } = req.body;
  if (!name || !callbackUrl) return res.status(400).json({ error: "Missing required fields" });
  const exists = await Channel.findOne({ name });
  if (exists) return res.status(409).json({ error: "Channel already exists" });
  const channel = new Channel({ name, callbackUrl, format, active, triggerOn });
  await channel.save();
  res.status(201).json(channel);
});

// PUT: редактирай канал
app.put('/api/channels/:id', async (req, res) => {
  const { name, callbackUrl, format, active, triggerOn } = req.body;
  const channel = await Channel.findByIdAndUpdate(
    req.params.id,
    { name, callbackUrl, format, active, triggerOn },
    { new: true }
  );
  res.json(channel);
});

// DELETE: триене на канал
app.delete('/api/channels/:id', async (req, res) => {
  await Channel.findByIdAndDelete(req.params.id);
  res.json({ message: "Channel deleted" });
});
// GET current AI config
app.get('/api/config/ai', async (req, res) => {
  const config = await SystemConfig.findOne() || {};
  res.json({
    aiEnabled: config.aiEnabled ?? true,
    aiToken: config.aiToken ?? '',
    aiModel: config.aiModel ?? 'facebook/bart-large-mnli'
  });
});

// PUT update AI config
app.put('/api/config/ai', async (req, res) => {
  let config = await SystemConfig.findOne();
  if (!config) config = new SystemConfig();
  if (req.body.aiEnabled !== undefined) config.aiEnabled = req.body.aiEnabled;
  if (req.body.aiModel !== undefined) config.aiModel = req.body.aiModel;
  if (req.body.aiToken) config.aiToken = req.body.aiToken; // само ако е подаден!
  await config.save();
  res.json({ success: true });
});

// === USER MANAGEMENT API (CRUD) ===

// GET: всички потребители (production: сложи проверка за роля!)
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, { passwordHash: 0 });
  res.json(users);
});

// POST: създай потребител
app.post('/api/users', async (req, res) => {
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
app.put('/api/users/:id', async (req, res) => {
  const { password, role, active } = req.body;
  const update = { role, active };
  if (password) update.passwordHash = await bcrypt.hash(password, 10);
  await User.findByIdAndUpdate(req.params.id, update);
  auditLog("UPDATE_USER", req.user?.username || "system", { id: req.params.id, ...update });
  res.json({ message: "User updated" });
});

// DELETE: триене на потребител
app.delete('/api/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  auditLog("DELETE_USER", req.user?.username || "system", { id: req.params.id });
  res.json({ message: "User deleted" });
});

//Roles
// Get all roles
app.get('/api/roles', async (req, res) => {
  const roles = await Role.find();
  res.json(roles);
});

// Create role
app.post('/api/roles', async (req, res) => {
  const { name, permissions } = req.body;
  if (!name) return res.status(400).json({ error: "Missing role name" });
  const exists = await Role.findOne({ name });
  if (exists) return res.status(409).json({ error: "Role exists" });
  const role = new Role({ name, permissions });
  await role.save();
  res.status(201).json(role);
});

// Update role
app.put('/api/roles/:id', async (req, res) => {
  const { permissions } = req.body;
  const updated = await Role.findByIdAndUpdate(req.params.id, { permissions }, { new: true });
  res.json(updated);
});

// Delete role
app.delete('/api/roles/:id', async (req, res) => {
  await Role.findByIdAndDelete(req.params.id);
  res.json({ message: "Role deleted" });
});
// ---------------------------Health-check endpoint
app.get('/', (req, res) => res.send('Server is running'));

//Status page
app.get('/api/status', async (req, res) => {
  let mongoStatus = "disconnected";
  let mongoPing = null;
  try {
    mongoPing = await mongoose.connection.db.admin().ping();
    mongoStatus = "connected";
  } catch {}

  // Последни 10 реда от error log (safe read)
  let lastErrors = [];
  try {
    // За дневните error логове:
    const errorLogPath = getLogPath('error');
    if (fs.existsSync(errorLogPath)) {
      const log = fs.readFileSync(errorLogPath, 'utf8').split('\n');
      lastErrors = log.slice(-10);
    }
  } catch {}

  res.json({
    server: {
      status: "up",
      uptime: process.uptime(),
      node: process.version,
      memory: process.memoryUsage().rss,
      cpu: os.loadavg()[0],
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      time: new Date().toISOString()
    },
    os: {
      uptime: os.uptime(),
      freemem: os.freemem(),
      totalmem: os.totalmem(),
      cpus: os.cpus().length,
      user: os.userInfo().username
    },
    mongo: {
      status: mongoStatus,
      ping: mongoPing,
      name: mongoose.connection.name
    },
    endpoints: [
      "/api/messages",
      "/api/rules",
      "/api/fields",
      "/api/messages/fields",
      "/api/config/visible-fields"
    ],
    lastErrors
  });
});
// /ping endpoint
app.get('/ping', (req, res) => res.send('pong'));

// POST /api/messages with Rule Engine + optional AI classification
app.post('/api/messages', async (req, res) => {
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
    let finalAction = 'Allowed'; //.env?

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
 console.log("CHECKING RULE:", r.name)
const result = (r.logic === "AND")
  ? r.conditions.every(cond => checkCondition(parsed, cond))
  : r.conditions.some(cond => checkCondition(parsed, cond));
  console.log("  Standard conditions:", result)
if (!result) continue;

if (r.aggregateConditions?.length > 0) {
  const results = await Promise.all(
    r.aggregateConditions.map(c => checkAggregateCondition(c, parsed))
  );
  const passed = r.logic === "AND"
    ? results.every(r => r)
    : results.some(r => r);
    console.log("  Aggregate conditions:", results, "=> passed:", passed)
  if (!passed) continue;
}

if (r.action === 'Tag') {
  if (r.tag) tags.push(r.tag);
  continue;
}
 if (!matchedRuleName || r.priority < 9999) {
    matchedRuleName = r.name;
    finalAction = r.action;
 console.log("  MATCHED RULE:", matchedRuleName, "Final action:", finalAction)
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
      aiResult = await aiClassifyMessage(raw); // async функция, връща { label, score }
      if (aiResult?.label) {
        tags.push('AI:' + aiResult.label);
        // AI Override?
        // if (aiResult.label === 'Forbidden') finalAction = 'Forbidden';
        // else if (aiResult.label === 'Maybe' && finalAction === 'Allowed') finalAction = 'Maybe';
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
// GET /api/messages/paged?skip=0&limit=20&sort=receivedAt&dir=desc&status=Maybe
app.get('/api/messages/paged', async (req, res) => {
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

// GET /api/messages?page=1&limit=50
app.get('/api/messages', async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 50, 500); //500 max
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find().sort({ receivedAt: -1 }).skip(skip).limit(limit),
    Message.countDocuments()
  ]);

  res.json({ messages, total, page, limit });
});

app.patch('/api/messages/:id/status', async (req, res) => {
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
app.get('/api/messages/maybe', async (req, res) => {
  try {
    systemLog("GET_MAYBE_MESSAGES", "Fetching messages with status 'Maybe'");
    const m = await Message.find({ status: 'Maybe' }).sort({ receivedAt: -1 });
    res.json(m);
  } catch (e) {
    errorLog(e, "Error fetching maybe messages");
    res.status(500).json({ error: 'Internal server error' });
  }
});
// CRUD for rules
app.get('/api/rules', async (req, res) => {
  const rules = await Rule.find().sort({ priority: 1, createdAt: 1 });
  res.json(rules);
});

app.post('/api/rules',
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

app.put('/api/rules/:id', async (req, res) => {
  const updated = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  auditLog("UPDATE_RULE", req.user?.username || "system", updated.toObject());
  res.json(updated);
});

app.delete('/api/rules/:id', async (req, res) => {
  const deleted = await Rule.findByIdAndDelete(req.params.id);
  auditLog("DELETE_RULE", req.user?.username || "system", deleted?.toObject() || {});
  res.status(204).send();
});

// ---- НОВО: visibleFields API ----

app.get('/api/config/visible-fields', async (req, res) => {
  const config = await SystemConfig.findOne() || { visibleFields: [] }
  res.json(config.visibleFields)
});

app.put('/api/config/visible-fields', async (req, res) => {
  const { visibleFields } = req.body
  if (!Array.isArray(visibleFields)) return res.status(400).json({ error: "visibleFields must be array" })
  let config = await SystemConfig.findOne()
  if (!config) config = new SystemConfig()
  config.visibleFields = visibleFields
  await config.save()
  systemLog("VISIBLE_FIELDS_UPDATE", JSON.stringify(visibleFields));
  res.json(config.visibleFields)
});

// GET всички полета с label и description
app.get('/api/fields', async (req, res) => {
  const fields = await FieldMetadata.find();
  res.json(fields);
});

// POST - добавя или обновява field metadata
app.post('/api/fields', async (req, res) => {
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

app.delete('/api/fields/:name', async (req, res) => {
  await FieldMetadata.deleteOne({ name: req.params.name });
  auditLog("FIELD_METADATA_DELETE", req.user?.username || "system", { name: req.params.name });
  res.status(204).send();
});

// API endpoint: дневни логове по тип и дата
function getDateString() {
  const now = new Date();
  return now.toISOString().slice(0,10); // "2025-05-28"
}

app.get('/api/system-log', (req, res) => {
  const date = req.query.date || getDateString();
  const logPath = path.join(logDir, `system-${date}.log`);
  let log = [];
  try { log = fs.readFileSync(logPath, 'utf8').split('\n'); } catch {}
  res.json(log.slice(-100));
});
app.get('/api/audit-log', (req, res) => {
  const date = req.query.date || getDateString();
  const logPath = path.join(logDir, `audit-${date}.log`);
  let log = [];
  try { log = fs.readFileSync(logPath, 'utf8').split('\n'); } catch {}
  res.json(log.slice(-100));
});
app.get('/api/error-log', (req, res) => {
  const date = req.query.date || getDateString();
  const logPath = path.join(logDir, `error-${date}.log`);
  let log = [];
  try { log = fs.readFileSync(logPath, 'utf8').split('\n'); } catch {}
  res.json(log.slice(-100));
});

// Endpoint за налични дни (файлове) по тип лог
app.get('/api/log-dates/:type', (req, res) => {
  const type = req.params.type;
  let files = [];
  try {
    files = fs.readdirSync(logDir)
      .filter(f => f.startsWith(type + "-") && f.endsWith(".log"))
      .map(f => f.slice(type.length + 1, -4));
  } catch {}
  res.json(files);
});

// -----------------------------------------------------------
// Helper: рекурсивно извлича всички key-paths от един обект
function extractPaths(obj, prefix = '') {
  let paths = []
  for (const k in obj) {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      paths = paths.concat(extractPaths(obj[k], path))
    } else {
      paths.push(path)
    }
  }
  return paths
}

// API endpoint: всички уникални полета (key-paths) от parsed
app.get('/api/messages/fields', async (req, res) => {
  const messages = await Message.find({}, { parsed: 1 })
  const allPaths = new Set()
  for (const m of messages) {
    extractPaths(m.parsed).forEach(p => allPaths.add(p))
  }
  res.json(Array.from(allPaths))
});

// ---------------------------------
// PUT /api/users/change-password
app.put('/api/users/self/change-password', async (req, res) => {
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
// Start server
mongoose.connect(process.env.MONGO_URL, {
  user: process.env.MONGO_USER,
  pass: process.env.MONGO_PASS,
  authSource: process.env.MONGO_AUTH_SOURCE
})
  .then(() => {
    systemLog("SERVER_START", "MongoDB connected and server started");
    app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
  })
  .catch(err => {
    errorLog(err, "MongoDB error");
    console.error('MongoDB error:', err);
  });

const messageTimeoutTask = require('./cronTasks/messageTimeout');  // Път към cron задача
messageTimeoutTask();  // Стартиране на cron задачата
