// Agentic home designer: NL renovation brief → designs + costs + contractors.
import express from 'express';
import openrouterService from '../services/openrouter.js';

const router = express.Router();

// POST /api/agentic-home-designer/plan { brief, budget_usd, sqft? }
router.post('/plan', async (req, res) => {
  try {
    const { brief, budget_usd, sqft } = req.body || {};
    if (!brief) return res.status(400).json({ error: 'brief required' });
    const system = 'You are a home renovation architect. Output JSON {"designs":[{"name":"...","description":"...","est_cost":num}],"materials":["..."],"contractor_specialties":["..."],"timeline_weeks":int}.';
    let parsed;
    try {
      const raw = await openrouterService.complete(`Brief: ${brief}\nBudget USD: ${budget_usd}\nSquare feet: ${sqft}`, system);
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { raw }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable', detail: e.message });
    }
    return res.json({ brief, budget_usd: Number(budget_usd) || null, plan: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'plan failed' });
  }
});

export default router;
