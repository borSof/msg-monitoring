const xml2js = require('xml2js');
const { systemLog, errorLog } = require('../utils/fileLogger');

module.exports = (req, res, next) => {
  if (req.is('application/xml')) {
    systemLog('XML_RECEIVED', req.body ? req.body.substring(0, 200) : '');
    xml2js.parseString(req.body, { explicitArray: false }, (err, result) => {
      if (err) {
        errorLog(err, 'XML parse failed');
        return res.status(400).send('Invalid XML');
      }
      req.body = result;
      next();
    });
  } else {
    next();
  }
};
