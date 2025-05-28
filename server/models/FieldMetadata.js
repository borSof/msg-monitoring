const mongoose = require('mongoose');

const FieldMetadataSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true }, // напр. message.text
  label: { type: String, default: '' },                 // напр. "Текст на съобщението"
  description: { type: String, default: '' }            // напр. "Основният текстов payload"
});

module.exports = mongoose.model('FieldMetadata', FieldMetadataSchema, 'field_metadata');
