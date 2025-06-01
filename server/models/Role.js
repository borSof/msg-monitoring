const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  permissions: [String] // Например ["view_messages", "edit_rules"]
});

module.exports = mongoose.model('Role', RoleSchema);
