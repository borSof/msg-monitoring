const Message = require('../models/Message');

function getField(obj, path) {
  return path.split('.').reduce((acc, key) => acc && acc[key] !== undefined ? acc[key] : null, obj);
}

function parsePeriod(period) {
  const m = period.match(/^(\d+)([smhd])$/);
  if (!m) return 0;
  const val = parseInt(m[1]);
  const unit = m[2];
  return val * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
}

async function checkAggregateCondition(cond, parsed) {
  const since = new Date(Date.now() - parsePeriod(cond.period));
  const keyValue = getField(parsed, cond.keyField);

  if (!keyValue) return false;

const match = {
  [cond.keyField]: keyValue,
  receivedAt: { $gte: since }
};
  const pipeline = [
    { $match: match },
    ...(cond.unique ? [{ $group: { _id: `$${cond.field}` } }] : []),
    { $count: 'count' }
  ];

  // DEBUG
  console.log('AGG PIPELINE:', JSON.stringify(pipeline, null, 2));

  const result = await Message.aggregate(pipeline);
  const count = result[0]?.count || 0;

  // DEBUG
  console.log('AGG COUNT:', count, 'Operator:', cond.operator, 'Threshold:', cond.threshold);

  switch (cond.operator) {
    case 'lt':  return count <  cond.threshold;
    case 'lte': return count <= cond.threshold;
    case 'eq':  return count === cond.threshold;
    case 'gte': return count >= cond.threshold;
    case 'gt':  return count >  cond.threshold;
    default:    return false;
  }
}
module.exports = { checkAggregateCondition };
