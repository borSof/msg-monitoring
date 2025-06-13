const mongoose = require('mongoose')

const ConditionSchema = new mongoose.Schema({
  field:    { type: String, required: true },
  operator: { type: String, enum: ['contains','not contains','equals','regex','gt','lt'], required: true },
  value:    { type: String, required: true }
}, { _id: false });

const AggregateConditionSchema = new mongoose.Schema({
  field:     { type: String, required: true },  // напр. parsed.location
  keyField:  { type: String, required: true },  // напр. parsed.customerId
  period:    { type: String, required: true },  // напр. 5d, 1h
  unique:    { type: Boolean, default: true },
  operator:  { type: String, enum: ['lt', 'lte', 'eq', 'gte', 'gt'], required: true },
  threshold: { type: Number, required: true }
}, { _id: false });

const RuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  conditions: { type: [ConditionSchema], required: true },
  aggregateConditions: { type: [AggregateConditionSchema], default: [] }, // 👉 тук
  logic: { type: String, enum: ['AND', 'OR'], default: 'AND' },
  action: { type: String, enum: ['Allowed', 'Forbidden', 'Tag', 'Maybe'], required: true },
  tag: String,
  priority: { type: Number, default: 100 },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Rule', RuleSchema)
