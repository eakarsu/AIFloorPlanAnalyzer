// Custom Views — 4 floor-plan-analysis features.
// VIZ: space utilization heatmap, room area/cost chart.
// NON-VIZ: floor plan analysis PDF, space rules editor (CRUD).
import express from 'express';
import PDFDocument from 'pdfkit';

const router = express.Router();

// In-memory space rules store (zone types, density rules). Seeded.
const spaceRules = [
  { id: 1, zone_type: 'residential', max_density_per_sqft: 0.04, min_room_sqft: 80, requires_window: true, notes: 'Bedrooms/living areas' },
  { id: 2, zone_type: 'commercial-office', max_density_per_sqft: 0.10, min_room_sqft: 100, requires_window: false, notes: 'Office workstations' },
  { id: 3, zone_type: 'retail', max_density_per_sqft: 0.20, min_room_sqft: 200, requires_window: false, notes: 'Customer-facing space' },
  { id: 4, zone_type: 'industrial', max_density_per_sqft: 0.02, min_room_sqft: 500, requires_window: false, notes: 'Machinery/warehouse' },
  { id: 5, zone_type: 'mixed-use', max_density_per_sqft: 0.08, min_room_sqft: 120, requires_window: true, notes: 'Residential+commercial' },
];
let nextRuleId = 6;

// Synthetic floor plan room grid (for heatmap + area/cost chart)
function sampleRooms() {
  return [
    { id: 1, name: 'Living Room', row: 0, col: 0, sqft: 320, utilization: 0.78, cost_usd: 14500, zone: 'residential' },
    { id: 2, name: 'Kitchen',     row: 0, col: 1, sqft: 180, utilization: 0.92, cost_usd: 28000, zone: 'residential' },
    { id: 3, name: 'Dining',      row: 0, col: 2, sqft: 140, utilization: 0.55, cost_usd: 8200,  zone: 'residential' },
    { id: 4, name: 'Bedroom 1',   row: 1, col: 0, sqft: 220, utilization: 0.65, cost_usd: 9800,  zone: 'residential' },
    { id: 5, name: 'Bedroom 2',   row: 1, col: 1, sqft: 180, utilization: 0.40, cost_usd: 7600,  zone: 'residential' },
    { id: 6, name: 'Bathroom',    row: 1, col: 2, sqft: 80,  utilization: 0.88, cost_usd: 12400, zone: 'residential' },
    { id: 7, name: 'Office',      row: 2, col: 0, sqft: 150, utilization: 0.71, cost_usd: 6500,  zone: 'commercial-office' },
    { id: 8, name: 'Garage',      row: 2, col: 1, sqft: 400, utilization: 0.30, cost_usd: 5200,  zone: 'industrial' },
    { id: 9, name: 'Storage',     row: 2, col: 2, sqft: 90,  utilization: 0.22, cost_usd: 2100,  zone: 'industrial' },
  ];
}

// ============ VIZ #1: Space utilization heatmap (SVG room grid) ============
router.get('/space-utilization-heatmap', (req, res) => {
  try {
    const rooms = sampleRooms();
    const cols = 3;
    const rows = 3;
    const cell = 140;
    const pad = 20;
    const w = pad * 2 + cell * cols;
    const h = pad * 2 + cell * rows + 60;

    function color(u) {
      // 0 = green (cool), 1 = red (hot)
      const r = Math.round(50 + 200 * u);
      const g = Math.round(200 - 180 * u);
      const b = 80;
      return `rgb(${r},${g},${b})`;
    }

    const cells = rooms.map(rm => {
      const x = pad + rm.col * cell;
      const y = pad + rm.row * cell;
      return `
        <g>
          <rect x="${x}" y="${y}" width="${cell - 6}" height="${cell - 6}" rx="8" fill="${color(rm.utilization)}" stroke="#1f2937" stroke-width="2"/>
          <text x="${x + (cell - 6) / 2}" y="${y + 30}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#fff">${rm.name}</text>
          <text x="${x + (cell - 6) / 2}" y="${y + 60}" text-anchor="middle" font-family="Arial" font-size="12" fill="#fff">${rm.sqft} sqft</text>
          <text x="${x + (cell - 6) / 2}" y="${y + 90}" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold" fill="#fff">${Math.round(rm.utilization * 100)}%</text>
          <text x="${x + (cell - 6) / 2}" y="${y + 110}" text-anchor="middle" font-family="Arial" font-size="10" fill="#f3f4f6">utilization</text>
        </g>
      `;
    }).join('');

    const legendY = pad + cell * rows + 20;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#f9fafb"/>
  <text x="${pad}" y="${pad - 4}" font-family="Arial" font-size="14" font-weight="bold" fill="#111827">Space Utilization Heatmap</text>
  ${cells}
  <text x="${pad}" y="${legendY + 20}" font-family="Arial" font-size="11" fill="#374151">Low utilization (green) -> High utilization (red)</text>
  <rect x="${pad}" y="${legendY + 28}" width="200" height="12" fill="url(#grad)"/>
  <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="rgb(50,200,80)"/>
    <stop offset="100%" stop-color="rgb(250,20,80)"/>
  </linearGradient></defs>
</svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ VIZ #2: Room area / cost chart (SVG dual bar) ============
router.get('/room-area-cost-chart', (req, res) => {
  try {
    const rooms = sampleRooms();
    const w = 820;
    const h = 420;
    const padL = 60, padR = 30, padT = 50, padB = 90;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const maxSqft = Math.max(...rooms.map(r => r.sqft));
    const maxCost = Math.max(...rooms.map(r => r.cost_usd));
    const groupW = innerW / rooms.length;
    const barW = (groupW - 12) / 2;

    const bars = rooms.map((r, i) => {
      const gx = padL + i * groupW + 6;
      const hSqft = (r.sqft / maxSqft) * innerH;
      const hCost = (r.cost_usd / maxCost) * innerH;
      const ySqft = padT + (innerH - hSqft);
      const yCost = padT + (innerH - hCost);
      return `
        <g>
          <rect x="${gx}" y="${ySqft}" width="${barW}" height="${hSqft}" fill="#4f46e5" rx="3"/>
          <rect x="${gx + barW + 4}" y="${yCost}" width="${barW}" height="${hCost}" fill="#f59e0b" rx="3"/>
          <text x="${gx + barW + 2}" y="${padT + innerH + 16}" text-anchor="middle" font-family="Arial" font-size="11" fill="#374151" transform="rotate(-25 ${gx + barW + 2} ${padT + innerH + 16})">${r.name}</text>
          <text x="${gx + barW / 2}" y="${ySqft - 4}" text-anchor="middle" font-family="Arial" font-size="9" fill="#4f46e5">${r.sqft}</text>
          <text x="${gx + barW + 4 + barW / 2}" y="${yCost - 4}" text-anchor="middle" font-family="Arial" font-size="9" fill="#f59e0b">$${Math.round(r.cost_usd / 1000)}k</text>
        </g>
      `;
    }).join('');

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <text x="${w / 2}" y="26" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#111827">Room Area vs. Renovation Cost</text>
  <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + innerH}" stroke="#9ca3af" stroke-width="1"/>
  <line x1="${padL}" y1="${padT + innerH}" x2="${w - padR}" y2="${padT + innerH}" stroke="#9ca3af" stroke-width="1"/>
  ${bars}
  <g>
    <rect x="${padL}" y="${h - 30}" width="14" height="14" fill="#4f46e5"/>
    <text x="${padL + 20}" y="${h - 18}" font-family="Arial" font-size="12" fill="#374151">Square footage (sqft)</text>
    <rect x="${padL + 200}" y="${h - 30}" width="14" height="14" fill="#f59e0b"/>
    <text x="${padL + 220}" y="${h - 18}" font-family="Arial" font-size="12" fill="#374151">Cost (USD)</text>
  </g>
</svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ NON-VIZ #1: Floor plan analysis PDF report ============
router.get('/floor-plan-analysis-pdf', (req, res) => {
  try {
    const rooms = sampleRooms();
    const totalSqft = rooms.reduce((s, r) => s + r.sqft, 0);
    const totalCost = rooms.reduce((s, r) => s + r.cost_usd, 0);
    const avgUtil = rooms.reduce((s, r) => s + r.utilization, 0) / rooms.length;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="floor-plan-analysis.pdf"');
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#111827').text('Floor Plan Analysis Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#6b7280').text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(14).fillColor('#111827').text('Summary');
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#374151')
      .text(`Total rooms: ${rooms.length}`)
      .text(`Total area: ${totalSqft} sqft`)
      .text(`Total estimated renovation cost: $${totalCost.toLocaleString()} USD`)
      .text(`Average utilization: ${(avgUtil * 100).toFixed(1)}%`);
    doc.moveDown(1);

    doc.fontSize(14).fillColor('#111827').text('Per-Room Breakdown');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#374151');
    rooms.forEach(r => {
      doc.text(`- ${r.name} [${r.zone}] - ${r.sqft} sqft - util ${Math.round(r.utilization * 100)}% - $${r.cost_usd.toLocaleString()}`);
    });
    doc.moveDown(1);

    doc.fontSize(14).fillColor('#111827').text('Findings');
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#374151');
    const underUtilized = rooms.filter(r => r.utilization < 0.4);
    const overUtilized = rooms.filter(r => r.utilization > 0.85);
    if (underUtilized.length) doc.text(`Under-utilized (consider repurposing): ${underUtilized.map(r => r.name).join(', ')}`);
    if (overUtilized.length) doc.text(`Over-utilized (consider expansion): ${overUtilized.map(r => r.name).join(', ')}`);
    doc.moveDown(0.5);
    doc.text(`Cost per sqft (average): $${(totalCost / totalSqft).toFixed(2)}`);

    doc.end();
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// ============ NON-VIZ #2: Space rules editor (CRUD) ============
router.get('/space-rules', (req, res) => {
  res.json({ rules: spaceRules, count: spaceRules.length });
});

router.post('/space-rules', (req, res) => {
  const { zone_type, max_density_per_sqft, min_room_sqft, requires_window, notes } = req.body || {};
  if (!zone_type) return res.status(400).json({ error: 'zone_type required' });
  const rule = {
    id: nextRuleId++,
    zone_type,
    max_density_per_sqft: Number(max_density_per_sqft) || 0,
    min_room_sqft: Number(min_room_sqft) || 0,
    requires_window: !!requires_window,
    notes: notes || ''
  };
  spaceRules.push(rule);
  res.status(201).json({ rule });
});

router.put('/space-rules/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = spaceRules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const cur = spaceRules[idx];
  const upd = req.body || {};
  spaceRules[idx] = {
    ...cur,
    ...(upd.zone_type !== undefined ? { zone_type: upd.zone_type } : {}),
    ...(upd.max_density_per_sqft !== undefined ? { max_density_per_sqft: Number(upd.max_density_per_sqft) } : {}),
    ...(upd.min_room_sqft !== undefined ? { min_room_sqft: Number(upd.min_room_sqft) } : {}),
    ...(upd.requires_window !== undefined ? { requires_window: !!upd.requires_window } : {}),
    ...(upd.notes !== undefined ? { notes: upd.notes } : {}),
  };
  res.json({ rule: spaceRules[idx] });
});

router.delete('/space-rules/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = spaceRules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const [removed] = spaceRules.splice(idx, 1);
  res.json({ removed });
});

export default router;
