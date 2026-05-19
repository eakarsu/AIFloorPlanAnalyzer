// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated frontend page (lean v0). Wires Custom Feature Suggestions
// and Gap endpoints (AI counterparts + non-AI features) to backend routes.
import React, { useState } from 'react';

const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || 'http://localhost:4000/api';

const FEATURES = [
  { kind: 'cfs', slug: 'cf-agentic-home-designer', label: 'Agentic home designer', desc: 'NL renovation brief → designs + costs + contractors', endpoint: '/cf-agentic-home-designer' },
  { kind: 'cfs', slug: 'cf-computer-vision-floor-plan-parsing', label: 'Computer-vision floor-plan parsing', desc: 'Upload image, auto-detect rooms/dimensions', endpoint: '/cf-computer-vision-floor-plan-parsing' },
  { kind: 'cfs', slug: 'cf-ar-visualisation', label: 'AR visualisation', desc: 'Phone-camera AR overlay', endpoint: '/cf-ar-visualisation' },
  { kind: 'cfs', slug: 'cf-sustainability-analysis', label: 'Sustainability analysis', desc: 'Material carbon footprint + eco alternatives', endpoint: '/cf-sustainability-analysis' },
  { kind: 'cfs', slug: 'cf-financing-options', label: 'Financing options', desc: 'Home-improvement loan connector', endpoint: '/cf-financing-options' },
  { kind: 'cfs', slug: 'cf-contractor-marketplace', label: 'Contractor marketplace', desc: 'Multi-bid workflow with messaging', endpoint: '/cf-contractor-marketplace' },
  { kind: 'cfs', slug: 'cf-project-timeline', label: 'Project timeline', desc: 'Auto-generate schedule from scope + contractor availability', endpoint: '/cf-project-timeline' },
  { kind: 'gap-ai', slug: 'gap-ai-no-ar-vr-rendering-endpoint', label: 'No AR/VR rendering endpoint', desc: 'No AR/VR rendering endpoint', endpoint: '/gap-no-ar-vr-rendering-endpoint' },
  { kind: 'gap-ai', slug: 'gap-ai-no-sustainability-material-agent', label: 'No sustainability-material agent', desc: 'No sustainability-material agent', endpoint: '/gap-no-sustainability-material-agent' },
  { kind: 'gap-ai', slug: 'gap-ai-no-nl-kitchen-renovation-for-30k-full-brief-agent', label: 'No NL "kitchen renovation for $30k" full-brief agent', desc: 'No NL "kitchen renovation for $30k" full-brief agent', endpoint: '/gap-no-nl-kitchen-renovation-for-30k-full-brief-agent' },
  { kind: 'gap-non', slug: 'gap-non-no-webhooks-no-contractor-bid-push-back', label: 'No webhooks (no contractor bid push-back)', desc: 'No webhooks (no contractor bid push-back)', endpoint: '/gap-no-webhooks-no-contractor-bid-push-back' },
  { kind: 'gap-non', slug: 'gap-non-no-notifications-subsystem-observed', label: 'No notifications subsystem observed', desc: 'No notifications subsystem observed', endpoint: '/gap-no-notifications-subsystem-observed' },
  { kind: 'gap-non', slug: 'gap-non-no-payment-escrow-for-contractor-engagement', label: 'No payment/escrow for contractor engagement', desc: 'No payment/escrow for contractor engagement', endpoint: '/gap-no-payment-escrow-for-contractor-engagement' },
  { kind: 'gap-non', slug: 'gap-non-no-project-management-gantt-module', label: 'No project-management / Gantt module', desc: 'No project-management / Gantt module', endpoint: '/gap-no-project-management-gantt-module' },
  { kind: 'gap-non', slug: 'gap-non-limited-contractor-marketplace-bidding-only-contractor-dire', label: 'Limited contractor-marketplace bidding (only contractor dire', desc: 'Limited contractor-marketplace bidding (only contractor directory)', endpoint: '/gap-limited-contractor-marketplace-bidding-only-contractor-dire' },
];

function authHeaders() {
  const t = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export default function Batch03Features() {
  const [active, setActive] = useState(FEATURES[0]?.slug);
  const [input, setInput] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const current = FEATURES.find(f => f.slug === active) || FEATURES[0];

  async function run() {
    if (!current) return;
    setLoading(true); setError(null);
    try {
      let parsed;
      try { parsed = input ? JSON.parse(input) : {}; } catch { parsed = { input }; }
      const r = await fetch(`${API_BASE}${current.endpoint}`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(parsed)
      });
      let body; try { body = await r.json(); } catch { body = { raw: await r.text() }; }
      if (!r.ok) setError(body.error || `HTTP ${r.status}`);
      setResults(prev => ({ ...prev, [current.slug]: body }));
    } catch (e) {
      setError(String(e.message || e));
    } finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Batch 03 Features <small style={{ color: '#64748b', fontWeight: 400 }}>(AIFloorPlanAnalyzer)</small></h2>
      <p style={{ color: '#475569', maxWidth: 720 }}>
        Audit-driven AI counterparts, non-AI feature gaps, and custom feature suggestions.
        Backend endpoints prefixed <code>/api/cf-*</code> (custom features) and <code>/api/gap-*</code> (gap fills).
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
        {FEATURES.map(f => (
          <button key={f.slug} onClick={() => setActive(f.slug)}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1',
                     background: active === f.slug ? '#1e40af' : '#f8fafc',
                     color: active === f.slug ? 'white' : '#0f172a', cursor: 'pointer', fontSize: 12 }}>
            <span style={{ opacity: 0.7, marginRight: 4 }}>[{f.kind}]</span>{f.label}
          </button>
        ))}
      </div>
      {current && (
        <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: 8 }}>
            <strong>{current.label}</strong>
            <div style={{ color: '#475569', fontSize: 13 }}>{current.desc}</div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>POST <code>{current.endpoint}</code></div>
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder='Optional JSON input (e.g. {"query":"..."})'
            style={{ width: '100%', minHeight: 80, padding: 8, fontFamily: 'monospace', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }} />
          <div style={{ marginTop: 8 }}>
            <button onClick={run} disabled={loading}
              style={{ padding: '8px 16px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Running…' : 'Run'}
            </button>
          </div>
          {error && (<div style={{ marginTop: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: 13 }}>{error}</div>)}
          {results[current.slug] && (
            <pre style={{ marginTop: 12, padding: 10, background: '#0b1020', color: '#cbd5e1', borderRadius: 4, overflow: 'auto', maxHeight: 360, fontSize: 12 }}>
              {typeof results[current.slug] === 'string' ? results[current.slug] : JSON.stringify(results[current.slug], null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
