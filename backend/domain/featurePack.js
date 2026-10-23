// Feature pack wave 35B — pure helpers (no DB/network), unit-testable.
export const PLAN_COLUMNS = ['id', 'name', 'description', 'total_area', 'unit', 'status'];
const norm = (v) => String(v ?? '').trim().toLowerCase();
export function filterPlans(records, filters = {}) {
  const list = Array.isArray(records) ? records : [];
  const search = norm(filters.search); const status = norm(filters.status); const unit = norm(filters.unit);
  return list.filter((r) => {
    if (status && norm(r.status) !== status) return false;
    if (unit && norm(r.unit) !== unit) return false;
    if (search && ![r.name, r.description, r.status].map(norm).join(' ').includes(search)) return false;
    return true;
  });
}
function esc(v) { if (v === null || v === undefined) return ''; const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
export function toCsv(records, columns = PLAN_COLUMNS) {
  const list = Array.isArray(records) ? records : [];
  return [columns.join(','), ...list.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n');
}
export function toJsonExport(records) { return { exported_at: new Date().toISOString(), count: (records || []).length, data: records || [] }; }
export function renderAiSections(result) {
  if (!result || typeof result !== 'object') return [];
  return Object.entries(result).filter(([k]) => k !== 'source' && k !== 'label').map(([key, value]) => {
    let display;
    if (value === null || value === undefined) display = '';
    else if (Array.isArray(value)) display = value.length ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('; ') : '(none)';
    else if (typeof value === 'object') display = JSON.stringify(value);
    else display = String(value);
    return { label: key, value: display };
  });
}
export function hasAiKey(env = process.env) { return Boolean(env.OPENROUTER_API_KEY || env.OPENAI_API_KEY); }
export function buildFallback(feature, records) {
  const list = Array.isArray(records) ? records : [];
  const base = { source: 'fallback', aiGenerated: false, label: 'Deterministic fallback (no AI provider configured)' };
  if (feature === 'renovation-priority') {
    const pending = list.filter((r) => norm(r.status) === 'pending' || norm(r.status) === '');
    return { ...base, feature, total_plans: list.length, pending_count: pending.length, has_pending: pending.length > 0, priorities: pending.map((r) => `Review ${r.name} (status ${r.status ?? ''})`) };
  }
  if (feature === 'portfolio-summary') {
    const byStatus = {}; for (const r of list) byStatus[r.status || 'unknown'] = (byStatus[r.status || 'unknown'] || 0) + 1;
    return { ...base, feature, total_plans: list.length, total_area: list.reduce((s, r) => s + Number(r.total_area || 0), 0), by_status: byStatus };
  }
  const zero = list.filter((r) => Number(r.total_area || 0) === 0);
  return { ...base, feature: 'space-utilisation-review', total_plans: list.length, total_area: list.reduce((s, r) => s + Number(r.total_area || 0), 0), zero_area_count: zero.length, has_zero_area: zero.length > 0, average_area: list.length ? list.reduce((s, r) => s + Number(r.total_area || 0), 0) / list.length : 0 };
}
export const AI_FEATURES = ['space-utilisation-review', 'renovation-priority', 'portfolio-summary'];
