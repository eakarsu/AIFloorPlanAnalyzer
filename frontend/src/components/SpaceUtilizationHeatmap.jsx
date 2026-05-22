import { useState, useEffect } from 'react';

export default function SpaceUtilizationHeatmap() {
  const [svg, setSvg] = useState('');
  const [err, setErr] = useState(null);
  const [ts, setTs] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/custom-views/space-utilization-heatmap?t=${ts}`)
      .then(r => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(t => { if (!cancelled) setSvg(t); })
      .catch(e => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; };
  }, [ts]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Space Utilization Heatmap</h3>
        <button onClick={() => setTs(Date.now())} className="text-sm px-3 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100">Refresh</button>
      </div>
      {err && <div className="text-red-600 text-sm mb-2">Error: {err}</div>}
      <div className="overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-3 text-xs text-gray-500">Per-room occupancy/usage intensity across the floor plan grid.</p>
    </div>
  );
}
