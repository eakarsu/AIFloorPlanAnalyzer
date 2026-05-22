import { useState, useEffect } from 'react';

const BASE = '/api/custom-views/space-rules';
const empty = { zone_type: '', max_density_per_sqft: 0.05, min_room_sqft: 100, requires_window: false, notes: '' };

export default function SpaceRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(BASE);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setRules(j.rules || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    try {
      const url = editingId ? `${BASE}/${editingId}` : BASE;
      const method = editingId ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setForm(empty);
      setEditingId(null);
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function remove(id) {
    if (!confirm('Delete this rule?')) return;
    try {
      const r = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) { setErr(e.message); }
  }

  function startEdit(r) {
    setEditingId(r.id);
    setForm({
      zone_type: r.zone_type,
      max_density_per_sqft: r.max_density_per_sqft,
      min_room_sqft: r.min_room_sqft,
      requires_window: r.requires_window,
      notes: r.notes || ''
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(empty);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">Space Rules Editor</h3>
      <p className="text-sm text-gray-600 mb-4">Manage zone types and density rules for floor-plan analysis.</p>
      {err && <div className="text-red-600 text-sm mb-3">Error: {err}</div>}

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 p-4 bg-gray-50 rounded">
        <input className="border rounded px-3 py-2" placeholder="Zone type (e.g. residential)" value={form.zone_type} onChange={e => setForm({ ...form, zone_type: e.target.value })} required />
        <input className="border rounded px-3 py-2" type="number" step="0.01" placeholder="Max density (per sqft)" value={form.max_density_per_sqft} onChange={e => setForm({ ...form, max_density_per_sqft: e.target.value })} />
        <input className="border rounded px-3 py-2" type="number" placeholder="Min room sqft" value={form.min_room_sqft} onChange={e => setForm({ ...form, min_room_sqft: e.target.value })} />
        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.requires_window} onChange={e => setForm({ ...form, requires_window: e.target.checked })} />
          <span>Requires window</span>
        </label>
        <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        <div className="md:col-span-2 flex space-x-2">
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            {editingId ? 'Update Rule' : 'Add Rule'}
          </button>
          {editingId && <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Cancel</button>}
        </div>
      </form>

      {loading ? <div className="text-gray-500 text-sm">Loading…</div> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2 px-2">Zone</th>
                <th className="py-2 px-2">Max density</th>
                <th className="py-2 px-2">Min sqft</th>
                <th className="py-2 px-2">Window</th>
                <th className="py-2 px-2">Notes</th>
                <th className="py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="py-2 px-2 font-medium">{r.zone_type}</td>
                  <td className="py-2 px-2">{r.max_density_per_sqft}</td>
                  <td className="py-2 px-2">{r.min_room_sqft}</td>
                  <td className="py-2 px-2">{r.requires_window ? 'Yes' : 'No'}</td>
                  <td className="py-2 px-2 text-gray-600">{r.notes}</td>
                  <td className="py-2 px-2 space-x-2">
                    <button onClick={() => startEdit(r)} className="text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => remove(r.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && <tr><td colSpan="6" className="py-4 text-center text-gray-500">No rules yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
