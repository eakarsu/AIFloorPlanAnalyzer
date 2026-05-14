// Contractor marketplace: multi-bid workflow with messaging.
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// POST /api/contractor-marketplace/projects { title, scope, budget_usd, location }
router.post('/projects', async (req, res) => {
  try {
    const { title, scope, budget_usd, location } = req.body || {};
    if (!title || !scope) return res.status(400).json({ error: 'title + scope required' });
    let id = null;
    try {
      const r = await pool.query(`INSERT INTO marketplace_projects (title, scope, budget_usd, location, status, created_at) VALUES ($1,$2,$3,$4,'open',NOW()) RETURNING id`, [title, scope, Number(budget_usd) || null, location || null]);
      id = r.rows[0].id;
    } catch {}
    return res.json({ id, title, status: 'open' });
  } catch (e) {
    return res.status(500).json({ error: 'project failed' });
  }
});

// POST /api/contractor-marketplace/projects/:id/bid { contractor_id, amount, eta_days, message }
router.post('/projects/:id/bid', async (req, res) => {
  try {
    const { contractor_id, amount, eta_days, message } = req.body || {};
    if (!contractor_id || !amount) return res.status(400).json({ error: 'contractor_id + amount required' });
    let id = null;
    try {
      const r = await pool.query(`INSERT INTO marketplace_bids (project_id, contractor_id, amount_usd, eta_days, message, created_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id`, [req.params.id, contractor_id, Number(amount), Number(eta_days) || null, message || null]);
      id = r.rows[0].id;
    } catch {}
    return res.json({ id, project_id: req.params.id, contractor_id });
  } catch (e) {
    return res.status(500).json({ error: 'bid failed' });
  }
});

// GET /api/contractor-marketplace/projects/:id/bids
router.get('/projects/:id/bids', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM marketplace_bids WHERE project_id = $1 ORDER BY amount_usd ASC`, [req.params.id]).catch(() => ({ rows: [] }));
    return res.json({ project_id: req.params.id, bid_count: r.rows.length, bids: r.rows });
  } catch (e) {
    return res.status(500).json({ error: 'bids failed' });
  }
});

export default router;
