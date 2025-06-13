const Role = require('../models/Role');

function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      // Винаги зареждай permissions за текущата роля от базата
      const roleDoc = await Role.findOne({ name: req.user.role });
      if (!roleDoc || !roleDoc.permissions.includes(permission)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  };
}

module.exports = requirePermission;
