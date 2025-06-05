require('dotenv').config();
const axios = require('axios');
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN;

async function aiClassifyMessage(text) {
  try {
    const res = await axios.post(
      'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
      {
        inputs: text,
        parameters: {
          candidate_labels: ["Allowed", "Maybe", "Forbidden"]
        }
      },
      {
        headers: { Authorization: `Bearer ${HF_TOKEN}` }
      }
    );
    const { labels, scores } = res.data;
    return {
      label: labels?.[0] || null,
      score: scores?.[0] || null,
      raw: res.data
    }
  } catch (err) {
    console.error("AI API error:", err.response?.data || err.message || err);
    return null;
  }
}

module.exports = { aiClassifyMessage };
