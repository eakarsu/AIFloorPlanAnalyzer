// Financing options: home-improvement loan connector.
import express from 'express';

const router = express.Router();

const PRODUCTS = [
  { id: 'fha-203k', name: 'FHA 203(k)', max_usd: 35000, apr_pct: 8.5, term_years: 30, eligibility: 'owner_occupied' },
  { id: 'heloc', name: 'HELOC', max_usd: 100000, apr_pct: 9.0, term_years: 10, eligibility: 'equity_15pct' },
  { id: 'personal_unsecured', name: 'Personal Loan', max_usd: 50000, apr_pct: 12.0, term_years: 5, eligibility: 'fico_660' },
  { id: 'contractor_finance', name: 'Contractor Financing', max_usd: 25000, apr_pct: 6.99, term_years: 7, eligibility: 'project_quote' },
];

// POST /api/financing-options/recommend { amount_usd, owner_occupied?, fico?, equity_pct? }
router.post('/recommend', async (req, res) => {
  const b = req.body || {};
  const matches = PRODUCTS.filter(p => Number(b.amount_usd) <= p.max_usd).map(p => {
    const monthly = (Number(b.amount_usd) * (p.apr_pct / 100 / 12)) / (1 - Math.pow(1 + p.apr_pct / 100 / 12, -p.term_years * 12));
    return { ...p, monthly_payment: Math.round(monthly) };
  });
  return res.json({ amount_usd: Number(b.amount_usd) || null, recommendations: matches });
});

export default router;
