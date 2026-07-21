# Completeness Review: AIFloorPlanAnalyzer

- **Review date:** 2026-07-18
- **Assessment basis:** Static source and configuration inspection only. Dependencies were not installed, and no build, database migration, external integration, or runtime workflow was executed.

## Classification

**Prototype-demo**

## Verdict

The repository presents a broad design and project planning surface (66 source files and 9 route modules), but static evidence is characteristic of a generated prototype. Pages and endpoints demonstrate concepts; they do not establish a verified execution path to convert requirements and site constraints into editable, dimensioned alternatives, quantities, budgets, schedules, and deliverables.

## Why it is not complete

- 1 file is explicitly named as gap/gap-feature implementations; route/page count therefore overstates completed product capability.
- The route/page inventory includes `agentic home designer`, `ar visualisation`, `contractor marketplace`, `custom views`; these surfaces show breadth but not durable execution against authoritative systems.
- 9 files reference model-provider or chat-completion behavior; generic LLM calls are not a substitute for deterministic domain execution, grounding, or evaluation.
- 29 files contain mock, sample, placeholder, or random-data signals, leaving important outcomes disconnected from authoritative systems.
- Only 2 recognizable test files were found, insufficient to prove the full workflow and failure modes.
- No CI workflow was found to continuously verify builds, tests, migrations, or security checks.
- No environment example/template was found, so required configuration and secret boundaries are undocumented.

## Needed features

- 1. Implement a workflow to convert requirements and site constraints into editable, dimensioned alternatives, quantities, budgets, schedules, and deliverables.
- 2. Connect CAD/BIM/GIS, product/cost catalogs, render workers, contractors, object storage, and permitting sources; replace seed/demo records with durable synchronized data and explicit failure handling.
- 3. Validate dimensions, codes, constructability, quantities, costs, schedules, and render/export fidelity.
- 4. Track licensed assets and provenance, expose assumptions, and require qualified designer/contractor approval.
- 5. Add contract, integration, authorization, migration, and end-to-end tests in CI, plus a documented non-destructive deployment/run path.

## Risks or launch blockers

- Credential/secret fallback or demo-password patterns occur in 3 files and must be removed or made development-only.
- The root launcher can terminate unrelated processes occupying configured ports.
- The root launcher seeds, creates, migrates, or otherwise mutates database state during startup.
- The root launcher installs dependencies at run time, reducing reproducibility and expanding supply-chain risk.
- Ungrounded or malformed model output can become a domain action unless schemas, evidence, evaluations, and approval gates are added.

## Evidence inspected

- `backend/package.json` — declared scripts, runtime dependencies, and application boundaries.
- `frontend/package.json` — declared scripts, runtime dependencies, and application boundaries.
- `backend/server.js` — service composition, middleware, and registered routes.
- `backend/routes/agenticHomeDesigner.js` — implemented API surface and domain/AI request handling.
- `backend/routes/arVisualisation.js` — implemented API surface and domain/AI request handling.
- `backend/routes/contractorMarketplace.js` — implemented API surface and domain/AI request handling.

## Recommended next action

Treat this as a prototype: use agentic home designer and ar visualisation to select one narrow design and project planning outcome, quarantine generated gap routes, and implement that outcome end to end with real data, deterministic rules, and tests before adding features.

## Implementation progress

- **Needed feature 1 — implemented locally:** `backend/domain/designPlan.js` and `/api/governed-designs` turn site dimensions, room requirements, cost-catalog provenance, code-check records, and schedule tasks into editable quantities, utilization, budget, schedule, and review disposition in an idempotent durable case.
- **Needed feature 2 — governed integration boundary implemented; live providers blocked externally:** approved designs may queue allow-listed CAD, BIM, GIS, catalogs, render workers, contractors, object storage, and permitting operations. The outbox records delivery failures, retries, and dead letters. Real credentials, licensed asset/catalog rights, file-format mappings, render infrastructure, contractor systems, and permitting access remain external.
- **Needed feature 3 — implemented locally:** validation covers positive dimensions, room/site allocation, quantities, cost-source/as-of metadata, schedule duration, and explicit code checks. Results flag failed checks and clearly state that CAD round-trip, permit, constructability, and render fidelity are unverified.
- **Needed feature 4 — implemented locally with professional approval still required:** tenant isolation, provenance, assumptions, uncertainty, optimistic versions, audit events, and independent qualified-designer/contractor decisions are enforced. The system does not claim architectural, engineering, code, permit, or contractor validation.
- **Needed feature 5 and launch blockers — implemented locally:** the governed schema has an explicit migration; the legacy initializer is moved to the explicit migrate path; 3 domain tests and CI cover migration, tests, locked installs, and frontend build. JWT and database credential fallbacks are removed, demo tokens are hidden by default, gap routes are unmounted, and startup is nondestructive with separate bootstrap/migrate/confirmed-seed scripts.
- **Validation performed:** 3 domain tests passed; the ESM server/routes passed `node --check`; all shell scripts passed `bash -n`. No service, database, CAD/BIM/GIS/catalog/render/storage/permitting provider, licensed asset, construction, code, or professional validation was run.
