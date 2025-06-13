require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const xml2js     = require('xml2js');
const os         = require('os');
const fs         = require('fs');
const path       = require('path');

const { systemLog, auditLog, errorLog, getLogPath, logDir } = require('./utils/fileLogger');
const authMiddleware    = require('./utils/authMiddleware');
const requirePermission = require('./utils/requirePermission');

const app  = express();
const PORT = process.env.PORT || 3000;

// ==== Middlewares ====
// CORS и body parsing (задавай адресите според средата)
app.use(cors({ origin: ['http://localhost:3001', 'http://192.168.199.129:3001'] }));
app.use(express.json());
app.use(express.text({ type: 'application/xml' }));

// JWT и роли
app.use(authMiddleware);

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

// ==== ROUTES ====
// Auth/login
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const User   = require('./models/User');
const Role   = require('./models/Role');
const JWT_SECRET = process.env.JWT_SECRET;

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  const user = await User.findOne({ username });
  if (!user || !user.active)
    return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const roleDoc = await Role.findOne({ name: user.role });
  const permissions = roleDoc ? roleDoc.permissions : [];

  const token = jwt.sign(
    { username: user.username, role: user.role, id: user._id },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.json({ token, username: user.username, role: user.role, permissions });
  auditLog("LOGIN", user.username, { time: new Date().toISOString() });
});

// Health endpoints
app.get('/',      (req, res) => res.send('Server is running'));
app.get('/ping',  (req, res) => res.send('pong'));

// Status page
app.get('/api/status', async (req, res) => {
  let mongoStatus = "disconnected", mongoPing = null;
  try {
    mongoPing = await mongoose.connection.db.admin().ping();
    mongoStatus = "connected";
  } catch {}

  let lastErrors = [];
  try {
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

// ==== Modular routes (ресурсни endpoints) ====
app.use('/api/messages',  require('./routes/messages'));
app.use('/api/rules',     require('./routes/rules'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/roles',     require('./routes/roles'));
app.use('/api/channels',  require('./routes/channels'));
app.use('/api',           require('./routes/fields'));
app.use('/api',           require('./routes/logs'));

// ==== Start server ====
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

// ==== Start cron tasks ====
const messageTimeoutTask = require('./cronTasks/messageTimeout');
messageTimeoutTask();
