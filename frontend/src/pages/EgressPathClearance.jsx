import { useEffect, useState } from 'react';

const emptyForm = { floor: '', route: '', requiredWidthIn: 44, observedWidthIn: 40, obstruction: '', owner: '', status: 'needs review' };

export default function EgressPathClearance() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, blocked: 0, narrow: 0 });
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const res = await fetch('/api/egress-path-clearance', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setRows(data.rows || []);
    setSummary(data.summary || { total: 0, blocked: 0, narrow: 0 });
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    await fetch('/api/egress-path-clearance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(form)
    });
    setForm(emptyForm);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Egress Path Clearance</h1>
        <p className="text-gray-600">Life-safety route width checks tied to floor-plan field walks.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Routes', summary.total],
          ['Blocked', summary.blocked],
          ['Below Width', summary.narrow],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-2xl font-semibold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-4">
        {['floor', 'route', 'obstruction', 'owner'].map((field) => (
          <input key={field} className="rounded border p-2" placeholder={field} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
        ))}
        <input className="rounded border p-2" type="number" value={form.requiredWidthIn} onChange={(e) => setForm({ ...form, requiredWidthIn: e.target.value })} />
        <input className="rounded border p-2" type="number" value={form.observedWidthIn} onChange={(e) => setForm({ ...form, observedWidthIn: e.target.value })} />
        <select className="rounded border p-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option>needs review</option>
          <option>blocked</option>
          <option>clear</option>
        </select>
        <button className="rounded bg-indigo-600 px-4 py-2 font-medium text-white">Add Check</button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr>{['Floor', 'Route', 'Required', 'Observed', 'Obstruction', 'Owner', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => (
              <tr key={row.id}>
                <td className="px-4 py-3">{row.floor}</td>
                <td className="px-4 py-3">{row.route}</td>
                <td className="px-4 py-3">{row.requiredWidthIn}"</td>
                <td className="px-4 py-3">{row.observedWidthIn}"</td>
                <td className="px-4 py-3">{row.obstruction}</td>
                <td className="px-4 py-3">{row.owner}</td>
                <td className="px-4 py-3 font-medium">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
