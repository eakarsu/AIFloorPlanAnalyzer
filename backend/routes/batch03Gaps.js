// ============================================================
// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated Gap-feature endpoints (lean v0).
// TODO: configure credentials (set OPENROUTER_API_KEY).
// ============================================================
const express = require('express');
const router = express.Router();

let _gfReady = false;
async function ensureGapTable(pool) {
  if (_gfReady || !pool) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS gap_features (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(120) NOT NULL,
      user_id INT,
      input JSONB,
      output JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    _gfReady = true;
  } catch (_) { /* tolerant of missing DB */ }
}

async function callAI(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { ok: false, status: 503, error: 'AI service unavailable. Set OPENROUTER_API_KEY (TODO: configure credentials).' };
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
      }),
    });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return { ok: r.ok, status: r.status, text, raw: data };
  } catch (e) {
    return { ok: false, status: 500, error: String(e.message || e) };
  }
}

function buildHandler(slug, label, hint) {
  return async (req, res) => {
    const body = req.body || {};
    const userId = req.user?.id || null;
    const prompt = `Feature: ${label}\nContext hint: ${hint}\nUser input:\n${JSON.stringify(body, null, 2)}\n\nProduce a concise, actionable response.`;
    const ai = await callAI(prompt);
    try {
      const pool = req.app.locals.pool || req.app.get('pool') || null;
      if (pool) {
        await ensureGapTable(pool);
        await pool.query('INSERT INTO gap_features(slug, user_id, input, output) VALUES ($1,$2,$3,$4)',
          [slug, userId, body, { text: ai.text || ai.error || null }]);
      }
    } catch (_) { /* tolerant */ }
    if (!ai.ok) return res.status(ai.status || 500).json({ error: ai.error || ai.text || `Upstream error (${ai.status})`, slug });
    res.json({ slug, label, result: ai.text });
  };
}

router.post('/gap-no-ar-vr-rendering-endpoint', buildHandler('gap-ai-no-ar-vr-rendering-endpoint', 'No AR/VR rendering endpoint', 'No AR/VR rendering endpoint'));
router.post('/gap-no-sustainability-material-agent', buildHandler('gap-ai-no-sustainability-material-agent', 'No sustainability-material agent', 'No sustainability-material agent'));
router.post('/gap-no-nl-kitchen-renovation-for-30k-full-brief-agent', buildHandler('gap-ai-no-nl-kitchen-renovation-for-30k-full-brief-agent', 'No NL "kitchen renovation for $30k" full-brief agent', 'No NL "kitchen renovation for $30k" full-brief agent'));
router.post('/gap-no-webhooks-no-contractor-bid-push-back', buildHandler('gap-non-no-webhooks-no-contractor-bid-push-back', 'No webhooks (no contractor bid push-back)', 'No webhooks (no contractor bid push-back)'));
router.post('/gap-no-notifications-subsystem-observed', buildHandler('gap-non-no-notifications-subsystem-observed', 'No notifications subsystem observed', 'No notifications subsystem observed'));
router.post('/gap-no-payment-escrow-for-contractor-engagement', buildHandler('gap-non-no-payment-escrow-for-contractor-engagement', 'No payment/escrow for contractor engagement', 'No payment/escrow for contractor engagement'));
router.post('/gap-no-project-management-gantt-module', buildHandler('gap-non-no-project-management-gantt-module', 'No project-management / Gantt module', 'No project-management / Gantt module'));
router.post('/gap-limited-contractor-marketplace-bidding-only-contractor-dire', buildHandler('gap-non-limited-contractor-marketplace-bidding-only-contractor-dire', 'Limited contractor-marketplace bidding (only contractor dire', 'Limited contractor-marketplace bidding (only contractor directory)'));

module.exports = router;
