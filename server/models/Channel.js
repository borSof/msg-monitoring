const mongoose = require('mongoose')

const ChannelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  callbackUrl: { type: String, required: true },
  format: { type: String, enum: ['json', 'xml'], default: 'json' },
  active: { type: Boolean, default: true },
  triggerOn: [{ type: String, enum: ['Allowed', 'Forbidden', 'Maybe'], default: ['Allowed', 'Forbidden'] }]
}, { timestamps: true })

module.exports = mongoose.model('Channel', ChannelSchema)
