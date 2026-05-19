# Audit Apply Notes — AIFloorPlanAnalyzer

Audit source: `_AUDIT/reports/batch_03.md` (#34). Verdict (audit): skeleton, 0 routes.

## Reality check

Audit is materially out of date. `backend/server.js` is a 2,950-line monolith with 60+ routes, including most of the audit's "missing AI counterparts":

- `/api/ai/detect-rooms` — present
- `/api/ai/estimate` — present
- `/api/ai/materials` — present
- `/api/ai/optimize` — present
- `/api/ai/energy-audit` — present
- `/api/ai/home-staging` — present
- `/api/ai/furniture-placement` — present
- `/api/ai/maintenance-prediction` — present
- `/api/ai/home-inspection` — present
- `/api/contractors/ai-match` — present
- `/api/floor-plans/portfolio-analysis`, `comparable-analysis` — present

Only the audit's `/accessibility-check` was missing.

## Implementation applied

Added one mechanical AI endpoint:

1. `POST /api/ai/accessibility-check` (in `backend/server.js`)
   - Pulls floor plan + rooms.
   - Calls OpenRouter directly (matches existing pattern; no SDK dep added).
   - Returns strict-JSON accessibility audit (compliance score, ADA status, room-level findings, modifications).
   - Local fallback when OpenRouter is unavailable.
   - Audience selector (general / wheelchair / aging-in-place / etc.).

Syntax-checked via `node --check`.

## Backlog (prioritized)

### Mechanical
- Refactor monolithic `server.js` into route modules. Currently 60+ routes inline.
- Reuse `openrouterService` calls instead of inline `fetch` for the new accessibility endpoint.

### Needs creds / external
- AR visualization (mobile SDK).
- Loan/financing partner integrations.
- Local-contractor data feeds.

### Needs product decision
- Project management / scheduling workflow.
- Marketplace economics for contractor bids.

### Custom features
- Computer vision floor plan parsing (image → structured plan).
- Sustainability / carbon footprint analysis tied to materials.
- Multi-bid contractor marketplace.

## Apply pass 3 (frontend)

- **Action:** LEFT-AS-IS — FE already wired.
- The Vite-React frontend already surfaces every AI endpoint added in pass 2, including `POST /api/ai/accessibility-check`:
  - `frontend/src/pages/AccessibilityChecker.jsx` (form, audience selector, results panel with severity-coded findings + cost-estimated modifications, raw JSON details).
  - Route mounted at `/accessibility-checker` in `frontend/src/App.jsx`.
  - Sidebar entry in `frontend/src/components/Layout.jsx`.
  - `checkAccessibility()` exported from `frontend/src/services/api.js` (uses central axios instance with JWT interceptor).
- 503/no-key handling: backend already returns explicit error JSON when OpenRouter is unavailable; the page surfaces it via the `error` state.
- No new files needed.

## Apply pass 4 (mechanical backlog)

Implemented 2 mechanical AI endpoints from the audit's Custom Features list (Sustainability/carbon footprint, Multi-bid contractor marketplace prep):

**Backend** (`backend/server.js`):
- `POST /api/ai/sustainability-analysis` — embodied + operational carbon estimate, high-impact retrofits, material swaps, likely LEED credits. Pulls floor plan + rooms by `floor_plan_id`. Returns 503 explicitly when `OPENROUTER_API_KEY` is unset.
- `POST /api/ai/contractor-bid-comparison` — accepts `project_summary`, `scope`, and ≥2 `bids[]`. Returns comparison table, best-overall/value/lowest-risk picks, negotiation levers, red flags. Returns 503 explicitly when `OPENROUTER_API_KEY` is unset.

Both follow the existing pattern (inline `fetch` to OpenRouter + 3-strategy JSON parse) used by `accessibility-check`.

**Frontend**:
- `frontend/src/services/api.js` — added `analyzeSustainability` + `compareContractorBids` axios helpers (use existing JWT interceptor).
- `frontend/src/pages/SustainabilityAnalyzer.jsx` — new page. Form (floor plan + climate zone + energy source + materials focus). Renders score, recommendations, material swaps, LEED credits. Distinguishes 503 (amber "AI unavailable") from generic errors (red).
- `frontend/src/pages/ContractorBidComparison.jsx` — new page. Dynamic bids form (add/remove rows, ≥2). Renders comparison table + best-pick cards + red flags + negotiation levers. Same 503 amber path.
- `frontend/src/App.jsx` — registered `/sustainability-analyzer` and `/contractor-bid-comparison` routes.
- `frontend/src/components/Layout.jsx` — added two sidebar entries (Leaf icon for Sustainability, Scale icon for Bid Comparison).

No new dependencies. No `npm install` run. `node --check server.js` clean; JSX parsed with `@babel/parser`.
