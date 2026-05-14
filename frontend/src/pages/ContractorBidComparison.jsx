import { useState } from 'react';
import { compareContractorBids } from '../services/api';
import { Scale, Loader2, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../components/Toast';

/**
 * Frontend for `POST /api/ai/contractor-bid-comparison` (apply pass 4).
 * Surfaces 503 explicitly when OPENROUTER_API_KEY is missing.
 */

const emptyBid = () => ({
  contractor_name: '',
  price: '',
  timeline_weeks: '',
  inclusions: '',
  notes: '',
});

export default function ContractorBidComparison() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [projectSummary, setProjectSummary] = useState('');
  const [scope, setScope] = useState('');
  const [bids, setBids] = useState([emptyBid(), emptyBid()]);
  const toast = useToast();

  const updateBid = (i, field, val) => {
    setBids((prev) => prev.map((b, idx) => (idx === i ? { ...b, [field]: val } : b)));
  };
  const addBid = () => setBids((prev) => [...prev, emptyBid()]);
  const removeBid = (i) =>
    setBids((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectSummary.trim()) {
      toast.error('Project summary is required');
      return;
    }
    if (bids.length < 2) {
      toast.error('At least 2 bids are required');
      return;
    }
    setAnalyzing(true);
    setError('');
    setAiUnavailable(false);
    setResult(null);
    try {
      const cleanedBids = bids.map((b) => ({
        contractor_name: b.contractor_name || undefined,
        price: b.price ? Number(b.price) : undefined,
        timeline_weeks: b.timeline_weeks ? Number(b.timeline_weeks) : undefined,
        inclusions: b.inclusions
          ? b.inclusions.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        notes: b.notes || undefined,
      }));
      const res = await compareContractorBids({
        project_summary: projectSummary,
        scope: scope || undefined,
        bids: cleanedBids,
      });
      setResult(res.data?.analysis || res.data);
      toast.success('Bid comparison ready');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Contractor Bid Comparison</h1>
        <p className="text-gray-500 mt-1">
          Compare contractor bids head-to-head and surface negotiation levers
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Summary *</label>
          <textarea
            rows={2}
            value={projectSummary}
            onChange={(e) => setProjectSummary(e.target.value)}
            placeholder="Kitchen renovation, 200 sq ft, mid-range finishes..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
          <textarea
            rows={2}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Demo, plumbing, electrical, cabinets, countertops..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Bids ({bids.length})</h3>
            <button
              type="button"
              onClick={addBid}
              className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add bid
            </button>
          </div>
          {bids.map((b, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-2"
            >
              <input
                type="text"
                value={b.contractor_name}
                onChange={(e) => updateBid(i, 'contractor_name', e.target.value)}
                placeholder={`Contractor ${i + 1} name`}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={b.price}
                  onChange={(e) => updateBid(i, 'price', e.target.value)}
                  placeholder="Price (USD)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  value={b.timeline_weeks}
                  onChange={(e) => updateBid(i, 'timeline_weeks', e.target.value)}
                  placeholder="Weeks"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                />
                {bids.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeBid(i)}
                    className="text-red-500 hover:text-red-700"
                    title="Remove bid"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={b.inclusions}
                onChange={(e) => updateBid(i, 'inclusions', e.target.value)}
                placeholder="Inclusions (comma-separated)"
                className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                value={b.notes}
                onChange={(e) => updateBid(i, 'notes', e.target.value)}
                placeholder="Notes (warranties, exclusions...)"
                className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={analyzing || bids.length < 2}
            className="btn-primary flex items-center gap-2"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
            {analyzing ? 'Comparing...' : 'Compare Bids'}
          </button>
        </div>
      </form>

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
            <p className="font-medium text-red-700">Comparison failed</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {result && !analyzing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800">Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 text-sm">
              <div>
                <span className="text-gray-500 text-xs">Best Overall</span>
                <div className="font-semibold">{result.best_overall || '—'}</div>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Best Value</span>
                <div className="font-semibold">{result.best_value || '—'}</div>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Lowest Risk</span>
                <div className="font-semibold">{result.lowest_risk || '—'}</div>
              </div>
            </div>
          </div>

          {Array.isArray(result.comparison_table) && result.comparison_table.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Contractor</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Weeks</th>
                    <th className="px-3 py-2 text-right">Value</th>
                    <th className="px-3 py-2 text-right">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {result.comparison_table.map((row, i) => (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">{row.contractor}</td>
                      <td className="px-3 py-2 text-right">${row.price}</td>
                      <td className="px-3 py-2 text-right">{row.timeline_weeks}</td>
                      <td className="px-3 py-2 text-right">{row.value_score}</td>
                      <td className="px-3 py-2 text-right">{row.risk_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(result.questions_to_ask) && result.questions_to_ask.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Questions to Ask</h4>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {result.questions_to_ask.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(result.red_flags) && result.red_flags.length > 0 && (
            <div>
              <h4 className="font-semibold text-red-700 mb-2">Red Flags</h4>
              <ul className="list-disc list-inside text-sm text-red-700">
                {result.red_flags.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(result.negotiation_levers) && result.negotiation_levers.length > 0 && (
            <div>
              <h4 className="font-semibold text-emerald-700 mb-2">Negotiation Levers</h4>
              <ul className="list-disc list-inside text-sm text-emerald-700">
                {result.negotiation_levers.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
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
