const { systemLog, auditLog, errorLog, getLogPath, logDir } = require('./utils/fileLogger');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const xml2js = require('xml2js');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const FieldMetadata = require('./models/FieldMetadata');

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

// POST /api/messages with Rule Engine
app.post('/api/messages', async (req, res) => {
  try {
    const parsed = req.body;
    const raw = JSON.stringify(parsed);
    const rules = await Rule.find().sort({ priority: 1, createdAt: 1 });
    let status = 'Maybe';
    const tags = [];
    let matchedRuleName = null;

    const getField = (obj, path) =>
      path.split('.').reduce((o, p) => (o && o[p] != null ? o[p] : null), obj);

    for (const r of rules) {
      const fieldValue = getField(parsed, r.field);
      if (fieldValue == null) continue;
      const str = String(fieldValue);
      let match = false;
      switch (r.operator) {
        case 'contains': match = str.includes(r.value); break;
        case 'equals':   match = str === r.value; break;
        case 'regex':    match = new RegExp(r.value).test(str); break;
        case 'gt':       match = Number(str) > Number(r.value); break;
        case 'lt':       match = Number(str) < Number(r.value); break;
      }
     if (!match) continue;
      if (r.action === 'Tag') {
        tags.push(r.tag);
        continue;
      }
      status = r.action;
      matchedRuleName = r.name;
      break;
    }

    if (status === 'Maybe' && !matchedRuleName) {
      const low = raw.toLowerCase();
      if (low.includes('ban')) {
        status = 'Forbidden';
      } else if (low.includes('allow') || low.includes('ok')) {
        status = 'Allowed';
      }
    }

    const msg = new Message({ rawXml: raw, parsed, status, tags, matchedRule: matchedRuleName });
    await msg.save();
    systemLog("NEW_MESSAGE", `Message ${msg._id} status: ${status}`);
    res.json({ status, id: msg._id, tags, matchedRule: matchedRuleName });
  } catch (e) {
    errorLog(e, "Error saving message");
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET all messages
app.get('/api/messages', async (req, res) => {
  try {
    const all = await Message.find().sort({ receivedAt: -1 });
    res.json(all);
  } catch (e) {
    errorLog(e, "Error fetching all messages");
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET maybe-only messages
app.get('/api/messages/maybe', async (req, res) => {
  try {
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
    body('field').isString().notEmpty(),
    body('operator').isIn(['contains','equals','regex','gt','lt']),
    body('value').isString().notEmpty(),
    body('action').isIn(['Allowed','Forbidden','Tag','Maybe']),
    body('priority').isInt({ min: 1 })
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

// Start server
mongoose.connect('mongodb://localhost:27017/msg-monitoring', {
  user: 'admin',
  pass: '1234',
  authSource: 'admin'
})
  .then(() => {
    systemLog("SERVER_START", "MongoDB connected and server started");
    app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
  })
  .catch(err => {
    errorLog(err, "MongoDB error");
    console.error('MongoDB error:', err);
  });

