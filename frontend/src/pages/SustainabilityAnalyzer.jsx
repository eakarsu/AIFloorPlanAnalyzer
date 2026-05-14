import { useState, useEffect } from 'react';
import { getFloorPlans, analyzeSustainability } from '../services/api';
import { Leaf, Loader2, AlertTriangle, TrendingDown } from 'lucide-react';
import { useToast } from '../components/Toast';

/**
 * Frontend for `POST /api/ai/sustainability-analysis` (apply pass 4).
 * Surfaces 503 explicitly when OPENROUTER_API_KEY is missing.
 */

export default function SustainabilityAnalyzer() {
  const [floorPlans, setFloorPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [formData, setFormData] = useState({
    floor_plan_id: '',
    climate_zone: '',
    primary_energy_source: 'mixed_grid',
    materials_focus: 'general',
  });
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const r = await getFloorPlans();
        setFloorPlans(r.data || []);
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.floor_plan_id) {
      toast.error('Please select a floor plan');
      return;
    }
    setAnalyzing(true);
    setError('');
    setAiUnavailable(false);
    setResult(null);
    try {
      const res = await analyzeSustainability({
        floor_plan_id: Number(formData.floor_plan_id),
        climate_zone: formData.climate_zone || undefined,
        primary_energy_source: formData.primary_energy_source || undefined,
        materials_focus: formData.materials_focus || undefined,
      });
      setResult(res.data?.analysis || res.data);
      toast.success('Sustainability analysis complete');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message || 'Request failed';
      if (status === 503) {
        setAiUnavailable(true);
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">AI Sustainability Analyzer</h1>
        <p className="text-gray-500 mt-1">
          Estimate carbon footprint and surface high-impact retrofits for a floor plan
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor Plan *</label>
            <select
              value={formData.floor_plan_id}
              onChange={(e) => setFormData({ ...formData, floor_plan_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a floor plan...</option>
              {floorPlans.map((fp) => (
                <option key={fp.id} value={fp.id}>
                  {fp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Climate Zone</label>
            <input
              type="text"
              value={formData.climate_zone}
              onChange={(e) => setFormData({ ...formData, climate_zone: e.target.value })}
              placeholder="e.g., ASHRAE 4A, mixed-humid"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Energy Source
            </label>
            <select
              value={formData.primary_energy_source}
              onChange={(e) =>
                setFormData({ ...formData, primary_energy_source: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="mixed_grid">Mixed grid</option>
              <option value="natural_gas">Natural gas</option>
              <option value="electric_only">Electric only</option>
              <option value="solar">Solar</option>
              <option value="heat_pump">Heat pump</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Materials Focus
            </label>
            <select
              value={formData.materials_focus}
              onChange={(e) => setFormData({ ...formData, materials_focus: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="general">General</option>
              <option value="low_embodied_carbon">Low embodied carbon</option>
              <option value="recycled">Recycled</option>
              <option value="bio_based">Bio-based</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={analyzing || !formData.floor_plan_id}
            className="btn-primary flex items-center gap-2"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Leaf className="h-4 w-4" />}
            {analyzing ? 'Analyzing...' : 'Run Sustainability Analysis'}
          </button>
        </div>
      </form>

      {analyzing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-indigo-600 mb-3" />
          <p className="text-gray-500">Estimating embodied + operational carbon...</p>
        </div>
      )}

      {aiUnavailable && !analyzing && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700">AI service unavailable (503)</p>
            <p className="text-sm text-amber-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {error && !aiUnavailable && !analyzing && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-700">Sustainability analysis failed</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {result && !analyzing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Leaf className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Sustainability Report</h3>
                <p className="text-sm text-emerald-700">
                  Score: {result.sustainability_score ?? '—'} / 100
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-700">
                {result.estimated_annual_co2_tons ?? '—'} t
              </div>
              <p className="text-xs text-emerald-700">est. annual CO₂</p>
            </div>
          </div>

          {Array.isArray(result.high_impact_recommendations) &&
            result.high_impact_recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">High-Impact Recommendations</h4>
                <div className="space-y-2">
                  {result.high_impact_recommendations.map((r, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-emerald-200 bg-emerald-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-emerald-800">{r.action}</span>
                        <span className="text-xs uppercase tracking-wide text-emerald-700">
                          {r.category}
                        </span>
                      </div>
                      <p className="text-sm text-emerald-700 mt-1 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {r.estimated_co2_reduction_tons_per_year ?? 0} t/yr · est. cost $
                        {r.estimated_cost_usd ?? 0} · payback {r.payback_years ?? '—'}y
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {Array.isArray(result.material_swaps) && result.material_swaps.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Material Swaps</h4>
              <ul className="space-y-1">
                {result.material_swaps.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    <strong>{s.current}</strong> → {s.swap_to} (
                    {s.embodied_carbon_savings_pct}% embodied carbon savings)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(result.leed_credits_likely) && result.leed_credits_likely.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Likely LEED Credits</h4>
              <div className="flex flex-wrap gap-2">
                {result.leed_credits_likely.map((c, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-xs rounded bg-indigo-50 border border-indigo-200 text-indigo-700"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.summary && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-800 mb-1">Summary</h4>
              <p className="text-sm text-gray-700">{result.summary}</p>
            </div>
          )}

          <details className="border rounded-lg p-4">
            <summary className="cursor-pointer text-sm text-gray-500">Raw JSON</summary>
            <pre className="text-xs mt-2 overflow-auto bg-gray-50 p-3 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
