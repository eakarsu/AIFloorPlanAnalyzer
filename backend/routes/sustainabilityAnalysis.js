// Sustainability analysis: material carbon footprint + eco alternatives.
import express from 'express';

const router = express.Router();

// kg CO2e per m² (rough industry averages)
const CO2 = {
  concrete: 200, brick: 240, plywood: 50, drywall: 30, hardwood: 70, bamboo: 18, recycled_metal: 90, virgin_aluminium: 380, reclaimed_wood: 8,
};
const ECO_ALT = {
  concrete: ['hempcrete', 'AAC blocks', 'low-carbon concrete (GGBS)'],
  brick: ['compressed earth blocks', 'reclaimed brick'],
  hardwood: ['bamboo', 'reclaimed_wood'],
  virgin_aluminium: ['recycled_metal', 'FSC wood frame'],
};

// POST /api/sustainability-analysis/score { materials:[{name, m2}] }
router.post('/score', async (req, res) => {
  try {
    const { materials = [] } = req.body || {};
    if (!Array.isArray(materials)) return res.status(400).json({ error: 'materials[] required' });
    const lines = materials.map(m => {
      const factor = CO2[m.name] || 100;
      const co2_kg = Math.round(factor * Number(m.m2 || 0));
      return { material: m.name, m2: Number(m.m2), co2_kg, alternatives: ECO_ALT[m.name] || [] };
    });
    const total = lines.reduce((a, b) => a + b.co2_kg, 0);
    return res.json({ lines, total_co2_kg: total, grade: total < 5000 ? 'A' : total < 15000 ? 'B' : total < 40000 ? 'C' : 'D' });
  } catch (e) {
    return res.status(500).json({ error: 'score failed' });
  }
});

export default router;
