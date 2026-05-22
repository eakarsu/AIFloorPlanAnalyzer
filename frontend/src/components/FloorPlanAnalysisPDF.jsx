import { useState } from 'react';

export default function FloorPlanAnalysisPDF() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function downloadPdf() {
    setBusy(true);
    setMsg('');
    try {
      const r = await fetch('/api/custom-views/floor-plan-analysis-pdf');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `floor-plan-analysis-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMsg('PDF downloaded.');
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Floor Plan Analysis PDF</h3>
      <p className="text-sm text-gray-600 mb-4">
        Generate a full PDF report: room breakdown, area, utilization, cost, findings.
      </p>
      <button
        onClick={downloadPdf}
        disabled={busy}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? 'Generating…' : 'Download PDF'}
      </button>
      {msg && <div className="mt-3 text-sm text-gray-700">{msg}</div>}
    </div>
  );
}
