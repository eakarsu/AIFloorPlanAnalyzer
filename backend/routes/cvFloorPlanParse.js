// Computer-vision floor-plan parsing: upload image, auto-detect rooms.
import express from 'express';

const router = express.Router();

async function visionParse(image_url, base64) {
  // TODO: configure credentials — OPENAI_API_KEY (vision)
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const content = [
    { type: 'text', text: 'Parse a floor plan image. Output JSON {"rooms":[{"name":"...","approx_sqft":int,"connections":["..."]}],"total_sqft":int,"orientation":"..."}.' },
    image_url ? { type: 'image_url', image_url: { url: image_url } } : { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
  ];
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content }], max_tokens: 700 }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.choices?.[0]?.message?.content;
}

// POST /api/cv-floor-plan-parse/parse { image_url? base64? }
router.post('/parse', async (req, res) => {
  try {
    const { image_url, image_base64 } = req.body || {};
    if (!image_url && !image_base64) return res.status(400).json({ error: 'image required' });
    const raw = await visionParse(image_url, image_base64);
    if (!raw) return res.status(503).json({ error: 'Vision API not configured' });
    let parsed;
    try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { raw }; }
    return res.json({ parsed });
  } catch (e) {
    return res.status(500).json({ error: 'parse failed' });
  }
});

export default router;
