const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'topsecret';

function authMiddleware(req, res, next) {
  if (
    req.path === '/api/login' ||
    req.path === '/api/status' ||
    req.path === '/ping' ||
    req.method === 'OPTIONS'
  ) {
    return next();
  }
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
