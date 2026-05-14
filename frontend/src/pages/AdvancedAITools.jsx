import { useState, useEffect } from 'react';
import {
  getFloorPlans,
  generateSpacePlan,
  checkZoningCompliance,
  buildRenovationRoadmap,
  reviewInsuranceRisk,
  projectResaleValue,
} from '../services/api';
import { Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { useToast } from '../components/Toast';

/**
 * Apply pass 5 — combined page surfacing 5 additive AI endpoints:
 *   - /api/ai/space-plan
 *   - /api/ai/zoning-compliance
 *   - /api/ai/renovation-roadmap
 *   - /api/ai/insurance-risk-review
 *   - /api/ai/resale-value-projection
 *
 * Single page (not 5) to keep frontend surface area minimal.
 * 503 (missing OPENROUTER_API_KEY) surfaced explicitly.
 */

const TOOLS = [
  { id: 'space-plan', label: 'Space Plan', call: generateSpacePlan, fields: [
    { key: 'household_size', label: 'Household size', type: 'number' },
    { key: 'lifestyle', label: 'Lifestyle', type: 'text', placeholder: 'modern professional' },
    { key: 'priorities', label: 'Priorities (comma-sep)', type: 'text' },
    { key: 'budget', label: 'Budget', type: 'text' },
  ]},
  { id: 'zoning-compliance', label: 'Zoning Compliance (advisory)', call: checkZoningCompliance, fields: [
    { key: 'jurisdiction', label: 'Jurisdiction', type: 'text', placeholder: 'Generic US R-1' },
    { key: 'lot_size_sqft', label: 'Lot size (sqft)', type: 'number' },
    { key: 'intended_use', label: 'Intended use', type: 'text' },
  ]},
  { id: 'renovation-roadmap', label: 'Renovation Roadmap', call: buildRenovationRoadmap, fields: [
    { key: 'total_budget', label: 'Total budget (USD)', type: 'number' },
    { key: 'timeline_months', label: 'Timeline (months)', type: 'number' },
    { key: 'must_haves', label: 'Must-haves (comma-sep)', type: 'text' },
    { key: 'nice_to_haves', label: 'Nice-to-haves (comma-sep)', type: 'text' },
  ]},
  { id: 'insurance-risk-review', label: 'Insurance Risk Review (advisory)', call: reviewInsuranceRisk, fields: [
    { key: 'year_built', label: 'Year built', type: 'number' },
    { key: 'prior_claims', label: 'Prior claims (comma-sep)', type: 'text' },
    { key: 'location_hazards', label: 'Location hazards (comma-sep)', type: 'text' },
  ]},
  { id: 'resale-value-projection', label: 'Resale Value Projection (advisory)', call: projectResaleValue, fields: [
    { key: 'market_tier', label: 'Market tier', type: 'text' },
    { key: 'current_estimate', label: 'Current value estimate (USD)', type: 'number' },
    { key: 'proposed_changes', label: 'Proposed changes (comma-sep)', type: 'text' },
  ]},
];

function listFields(v) {
  if (typeof v !== 'string' || !v.trim()) return undefined;
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function AdvancedAITools() {
  const [floorPlans, setFloorPlans] = useState([]);
  const [active, setActive] = useState(TOOLS[0].id);
  const [floorPlanId, setFloorPlanId] = useState('');
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const r = await getFloorPlans();
        setFloorPlans(r.data || []);
      } catch (_) {}
    })();
  }, []);

  const tool = TOOLS.find((t) => t.id === active) || TOOLS[0];

  const submit = async (e) => {
    e?.preventDefault();
    if (!floorPlanId) { toast.error('Please select a floor plan'); return; }
    setLoading(true); setError(''); setAiUnavailable(false); setResult(null);
    try {
      const payload = { floor_plan_id: Number(floorPlanId) };
      for (const f of tool.fields) {
        const raw = form[f.key];
        if (raw == null || raw === '') continue;
        if (f.type === 'number') payload[f.key] = Number(raw);
        else if (['priorities', 'must_haves', 'nice_to_haves', 'prior_claims', 'location_hazards', 'proposed_changes'].includes(f.key)) {
          payload[f.key] = listFields(raw);
        } else payload[f.key] = raw;
      }
      const res = await tool.call(payload);
      setResult(res.data?.analysis || res.data);
      toast.success(`${tool.label} complete`);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message || 'Request failed';
      if (status === 503) { setAiUnavailable(true); setError(msg); }
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Advanced AI Tools</h1>
        <p className="text-gray-500 mt-1">Space plan, zoning, renovation roadmap, insurance risk, resale projection</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setActive(t.id); setForm({}); setResult(null); setError(''); setAiUnavailable(false); }}
            className={`px-3 py-1.5 rounded-lg text-sm border ${active === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Floor Plan *</label>
          <select
            value={floorPlanId}
            onChange={(e) => setFloorPlanId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a floor plan...</option>
            {floorPlans.map((fp) => <option key={fp.id} value={fp.id}>{fp.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tool.fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                value={form[f.key] ?? ''}
                placeholder={f.placeholder || ''}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !floorPlanId}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Working...' : `Run ${tool.label}`}
          </button>
        </div>
      </form>

      {aiUnavailable && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700">AI service unavailable (503)</p>
            <p className="text-sm text-amber-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {error && !aiUnavailable && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-700">Request failed</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-2">Result</h3>
          <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded border max-h-[60vh]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
