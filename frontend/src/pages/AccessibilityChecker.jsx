import { useState, useEffect } from 'react';
import { getFloorPlans, checkAccessibility } from '../services/api';
import { Accessibility, Loader2, FlaskConical, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import ReactMarkdown from 'react-markdown';

/**
 * Frontend for `POST /api/ai/accessibility-check` (added in backend/server.js).
 * Style mirrors EnergyAuditor.jsx and HomeInspector.jsx.
 */

const audiences = [
  { value: 'general', label: 'General accessibility' },
  { value: 'wheelchair', label: 'Wheelchair user' },
  { value: 'aging-in-place', label: 'Aging in place' },
  { value: 'visual', label: 'Visual impairment' },
  { value: 'hearing', label: 'Hearing impairment' },
];

export default function AccessibilityChecker() {
  const [floorPlans, setFloorPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    floor_plan_id: '',
    audience: 'general',
    notes: '',
  });
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const fpRes = await getFloorPlans();
      setFloorPlans(fpRes.data || []);
    } catch (e) {
      // Non-fatal — user may type a floor_plan_id manually.
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.floor_plan_id) {
      toast.error('Please select a floor plan');
      return;
    }
    setAnalyzing(true);
    setError('');
    setResult(null);
    try {
      const res = await checkAccessibility({
        floor_plan_id: Number(formData.floor_plan_id),
        audience: formData.audience,
        notes: formData.notes,
      });
      const payload = res.data || res;
      if (payload && payload.success === false) {
        setError(payload.error || 'Accessibility check failed');
      } else {
        setResult(payload);
        toast.success('Accessibility check complete');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadSample = () => {
    setResult({
      compliance_score: 72,
      ada_status: 'partial',
      audience: formData.audience,
      summary: 'The floor plan partially meets ADA-style accessibility expectations. Doorway widths and bathroom layout are the main gaps.',
      findings: [
        { room: 'Bathroom (Master)', severity: 'high', issue: 'Door clear width below 32"' },
        { room: 'Hallway', severity: 'medium', issue: 'Pinch point at 34" — under recommended 36"' },
        { room: 'Front Entry', severity: 'low', issue: 'Single 5" step — consider ramp or zero-threshold' },
      ],
      modifications: [
        { item: 'Widen master bath door to 36"', estimated_cost_usd: 850 },
        { item: 'Add interior ramp at front entry', estimated_cost_usd: 1200 },
        { item: 'Replace fixtures with lever handles', estimated_cost_usd: 320 },
      ],
      full_result:
        '## Accessibility Compliance Score: 72/100\n\n### Findings\n- Bathroom door narrower than 32"\n- Hallway pinch point at 34"\n\n### Recommended Modifications\n- Widen master bath door\n- Add interior ramp at front entry',
    });
  };

  const scoreColor = (score) => {
    if (score == null) return 'bg-gray-100 text-gray-700';
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const severityColor = (sev) => {
    const s = (sev || '').toLowerCase();
    if (s === 'high') return 'text-red-600 bg-red-50 border-red-200';
    if (s === 'medium') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-blue-700 bg-blue-50 border-blue-200';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">AI Accessibility Checker</h1>
          <p className="text-gray-500 mt-1">Audit ADA / aging-in-place / wheelchair accessibility for a floor plan</p>
        </div>
        <button onClick={loadSample} className="btn-secondary flex items-center gap-2 text-amber-700 border-amber-300 hover:bg-amber-50">
          <FlaskConical className="h-5 w-5" />
          Load Sample
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
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
                <option key={fp.id} value={fp.id}>{fp.name}{fp.total_area ? ` (${fp.total_area} sq ft)` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
            <select
              value={formData.audience}
              onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {audiences.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Specific user constraints, mobility devices, sensory needs, etc."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={analyzing || !formData.floor_plan_id} className="btn-primary flex items-center gap-2">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Accessibility className="h-4 w-4" />}
            {analyzing ? 'Auditing...' : 'Run Accessibility Check'}
          </button>
        </div>
      </form>

      {analyzing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-indigo-600 mb-3" />
          <p className="text-gray-500">Analyzing accessibility...</p>
        </div>
      )}

      {error && !analyzing && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-700">Accessibility check failed</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {result && !analyzing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Accessibility className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Accessibility Report</h3>
                <p className="text-sm text-indigo-600">Audience: {result.audience || formData.audience}</p>
              </div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${scoreColor(result.compliance_score)}`}>
                {result.compliance_score != null ? `${result.compliance_score}/100` : '—'}
              </div>
              <p className="text-sm text-gray-500 mt-1">{result.ada_status || 'compliance score'}</p>
            </div>
          </div>

          {Array.isArray(result.findings) && result.findings.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Findings</h4>
              <div className="space-y-2">
                {result.findings.map((f, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${severityColor(f.severity)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{f.room || `Finding ${i + 1}`}</span>
                      <span className="text-xs uppercase tracking-wide font-semibold">{f.severity || 'info'}</span>
                    </div>
                    <p className="text-sm mt-1">{f.issue || f.description || JSON.stringify(f)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(result.modifications) && result.modifications.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Recommended Modifications</h4>
              <div className="space-y-2">
                {result.modifications.map((m, i) => (
                  <div key={i} className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <span className="text-sm text-emerald-800">{m.item || m.description || JSON.stringify(m)}</span>
                      {m.estimated_cost_usd != null && (
                        <span className="text-sm font-semibold text-emerald-700 whitespace-nowrap">
                          ${m.estimated_cost_usd.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
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

          {result.full_result && (
            <details className="border rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-gray-800">Full report</summary>
              <div className="ai-response prose prose-sm max-w-none mt-3">
                <ReactMarkdown>{String(result.full_result).replace(/```[\w]*\n?[\s\S]*?```/g, '').trim()}</ReactMarkdown>
              </div>
            </details>
          )}

          <details className="border rounded-lg p-4">
            <summary className="cursor-pointer text-sm text-gray-500">Raw JSON</summary>
            <pre className="text-xs mt-2 overflow-auto bg-gray-50 p-3 rounded">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
