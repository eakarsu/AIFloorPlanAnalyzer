# Apply Pass 5 — AIFloorPlanAnalyzer

- **Date:** 2026-05-08
- **Audit source:** `_AUDIT/reports/batch_03.md` (#34)
- **Stack:** Node.js Express monolith (`backend/server.js`, ~3500 lines) + Vite/React.
- **Action:** VERIFIED — audit's "0 routes" claim is a stale false-negative. All 8 audit-recommended AI counterparts plus several extras already shipped in passes 2-4. No new code applied.

## Verified-present (audit "missing AI counterparts")

| Recommended | Status | Path |
|---|---|---|
| `/detect-rooms` | DONE | `backend/server.js:2091` |
| `/estimate-materials` | DONE | `/api/ai/materials:1748` (and `/estimate:1682` for cost) |
| `/cost-estimate` | DONE | `/api/ai/estimate:1682` |
| `/optimize-layout` | DONE | `/api/ai/optimize:1810` |
| `/energy-audit` | DONE | `/api/ai/energy-audit:2455` |
| `/staging-suggestions` | DONE | `/api/ai/home-staging:2183` |
| `/furniture-place` | DONE | `/api/ai/furniture-placement:2273` |
| `/accessibility-check` | DONE | `/api/ai/accessibility-check:2937` (added pass 2) |

## Verified-present (audit "Custom feature suggestions")

| Recommended | Status | Path |
|---|---|---|
| Sustainability / carbon footprint | DONE | `/api/ai/sustainability-analysis:3067` (pass 4) |
| Multi-bid contractor marketplace | DONE | `/api/ai/contractor-bid-comparison:3164` (pass 4) |
| Renovation roadmap (agentic designer) | DONE | `/api/ai/renovation-roadmap:3370` |
| Space planning | DONE | `/api/ai/space-plan:3300` |
| Zoning compliance | DONE | `/api/ai/zoning-compliance:3336` |
| Insurance risk review | DONE | `/api/ai/insurance-risk-review:3411` |
| Resale value projection | DONE | `/api/ai/resale-value-projection:3445` |
| Maintenance prediction | DONE | `/api/ai/maintenance-prediction:2362` |
| Home inspection | DONE | `/api/ai/home-inspection:2549` |

19 distinct AI endpoints total (`grep -c "app.post('/api/ai"`).

FE pages: `AccessibilityChecker.jsx`, `SustainabilityAnalyzer.jsx`, `ContractorBidComparison.jsx`, plus all the original room/material/cost/staging/furniture pages.

## Implemented this pass

None. Audit list is fully covered.

## Deferred

- **NEEDS-CREDS:** AR visualization mobile SDK (e.g., ARKit/ARCore) — out of pass-5 web-additive scope.
- **NEEDS-CREDS:** Loan/financing partner integrations.
- **NEEDS-CREDS:** Local-contractor data feeds (Yelp/Angi/HomeAdvisor APIs).
- **NEEDS-PRODUCT-DECISION:** Project-management/scheduling workflow (state machine, stakeholders, SLAs).
- **NEEDS-PRODUCT-DECISION:** Marketplace economics for contractor bids (fees, escrow, dispute).
- **TOO-RISKY (without refactor):** Refactor `server.js` from monolith into route modules. This was on the pass-4 backlog as MECHANICAL but would touch ~3500 lines of working code; left as a separate, properly scoped refactor task.

## Smoke test

- `node --check backend/server.js` — PASS
- No new files this pass.

## Notes

This is the project where the audit's "skeleton, 0 routes" claim was most wildly wrong. The actual codebase is one of the most feature-rich in batch 03. Pilot lesson reaffirmed yet again — would have been deeply wasteful to add anything based on the audit text alone.
