const { systemLog } = require('../utils/fileLogger');

module.exports = (req, res, next) => {
  systemLog('API_CALL', `${req.method} ${req.url}`);
  next();
};
