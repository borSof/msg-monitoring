require('dotenv').config();
const axios = require('axios');
const SystemConfig = require('./models/SystemConfig');

// Simple cache for config to avoid constant DB hits
let cachedAIConfig = null;
let lastLoadTime = 0;

async function getAIConfig() {
  const now = Date.now();
  if (!cachedAIConfig || now - lastLoadTime > 60_000) {
    const config = await SystemConfig.findOne() || {};

    cachedAIConfig = {
      enabled: typeof config.aiEnabled === 'boolean' ? config.aiEnabled : true,
      token: String(config.aiToken ?? process.env.HUGGINGFACE_API_TOKEN ?? ''),
      model: String(config.aiModel ?? 'facebook/bart-large-mnli')
    };

    lastLoadTime = now;
    console.log('[AI] Loaded config:', cachedAIConfig);
  }

  return cachedAIConfig;
}

async function aiClassifyMessage(text) {
  const cfg = await getAIConfig();

  if (!cfg.enabled) {
    console.warn('[AI] Skipped: disabled in config');
    return null;
  }

  if (!cfg.token || cfg.token === 'true') {
    console.error('[AI] Invalid or missing API token');
    return null;
  }

  const start = Date.now();

  try {
    const res = await axios.post(
      `https://api-inference.huggingface.co/models/${cfg.model}`,
      {
        inputs: text,
        parameters: {
          candidate_labels: ['Allowed', 'Maybe', 'Forbidden']
        }
      },
      {
        headers: {
          Authorization: `Bearer ${cfg.token}`
        }
      }
    );

    const ms = Date.now() - start;
    console.log(`[AI] API call successful (${ms}ms)`);

    const { labels, scores } = res.data;

    return {
      label: labels?.[0] || null,
      score: scores?.[0] || null,
      raw: res.data
    };

  } catch (err) {
    const ms = Date.now() - start;
    console.error(`[AI] API error after ${ms}ms:`, err.response?.data || err.message || err);
    return null;
  }
}

function resetCache() {
  cachedAIConfig = null;
  lastLoadTime = 0;
  console.log('[AI] Cache cleared.');
}

module.exports = {
  aiClassifyMessage,
  resetCache
};
