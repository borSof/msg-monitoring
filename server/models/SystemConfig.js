const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema({
  visibleFields: { type: [String], default: [] },
  aiEnabled:    { type: Boolean, default: true },
  aiToken:      { type: String,  default: "" },
  aiModel:      { type: String,  default: "facebook/bart-large-mnli" }
});

module.exports = mongoose.model('SystemConfig', SystemConfigSchema, 'systemconfigs');
