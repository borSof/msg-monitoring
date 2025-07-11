const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true},
  active: { type: Boolean, default: true }
});
module.exports = mongoose.model('User', userSchema);
