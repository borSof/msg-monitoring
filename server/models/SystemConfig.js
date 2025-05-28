const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema({
  visibleFields: { type: [String], default: [] }
});

module.exports = mongoose.model('SystemConfig', SystemConfigSchema, 'system_config');
