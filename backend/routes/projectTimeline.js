// Project timeline: auto-generate schedule from scope + contractor availability.
import express from 'express';

const router = express.Router();

const PHASE_DURATIONS = { demo: 2, framing: 3, electrical: 2, plumbing: 2, drywall: 3, flooring: 2, painting: 2, finish: 2 };

// POST /api/project-timeline/build { phases:[name], start_date? }
router.post('/build', async (req, res) => {
  try {
    const { phases = [], start_date } = req.body || {};
    if (!Array.isArray(phases) || !phases.length) return res.status(400).json({ error: 'phases[] required' });
    let cursor = start_date ? new Date(start_date) : new Date();
    const schedule = [];
    for (const p of phases) {
      const weeks = PHASE_DURATIONS[p] || 2;
      const start = new Date(cursor);
      cursor = new Date(cursor.getTime() + weeks * 7 * 86400000);
      schedule.push({ phase: p, weeks, start: start.toISOString().slice(0, 10), end: cursor.toISOString().slice(0, 10) });
    }
    return res.json({ start_date: schedule[0]?.start, end_date: schedule[schedule.length - 1]?.end, total_weeks: schedule.reduce((a, b) => a + b.weeks, 0), schedule });
  } catch (e) {
    return res.status(500).json({ error: 'build failed' });
  }
});

export default router;
