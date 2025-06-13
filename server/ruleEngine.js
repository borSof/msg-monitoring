const Rule = require('./models/Rule');
const { checkAggregateCondition } = require('./utils/aggregateChecker');

function getField(obj, path) {
  return path.split('.').reduce((o, p) => (o && o[p] != null ? o[p] : null), obj);
}

function checkCondition(obj, cond) {
  const val = getField(obj, cond.field);
  if (val == null) return false;
  const str = String(val);
  switch (cond.operator) {
    case 'contains': return str.includes(cond.value);
    case 'not contains': return !str.includes(cond.value);
    case 'equals': return str === cond.value;
    case 'regex': return new RegExp(cond.value).test(str);
    case 'gt': return Number(str) > Number(cond.value);
    case 'lt': return Number(str) < Number(cond.value);
    default: return false;
  }
}

async function runRules(parsed, raw) {
  const rules = await Rule.find().sort({ priority: 1, createdAt: 1 });
  const tags = [];
  let matchedRuleName = null;
  let finalAction = 'Allowed';

  for (const r of rules) {
    console.log('CHECKING RULE:', r.name);
    const result = r.logic === 'AND'
      ? r.conditions.every(cond => checkCondition(parsed, cond))
      : r.conditions.some(cond => checkCondition(parsed, cond));
    console.log('  Standard conditions:', result);
    if (!result) continue;

    if (r.aggregateConditions?.length > 0) {
      const results = await Promise.all(
        r.aggregateConditions.map(c => checkAggregateCondition(c, parsed))
      );
      const passed = r.logic === 'AND'
        ? results.every(r => r)
        : results.some(r => r);
      console.log('  Aggregate conditions:', results, '=> passed:', passed);
      if (!passed) continue;
    }

    if (r.action === 'Tag') {
      if (r.tag) tags.push(r.tag);
      continue;
    }
    if (!matchedRuleName || r.priority < 9999) {
      matchedRuleName = r.name;
      finalAction = r.action;
      console.log('  MATCHED RULE:', matchedRuleName, 'Final action:', finalAction);
      break;
    }
  }

  if (!matchedRuleName) {
    const low = raw.toLowerCase();
    if (low.includes('ban')) finalAction = 'Forbidden';
    else if (low.includes('allow') || low.includes('ok')) finalAction = 'Allowed';
  }

  return { finalAction, matchedRuleName, tags };
}

module.exports = { runRules };
