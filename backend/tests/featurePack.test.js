import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPlans, toCsv, renderAiSections, buildFallback, hasAiKey } from '../domain/featurePack.js';
const rows = [
  { id: 1, name: 'Alpha House', description: 'small', total_area: 0, unit: 'sqft', status: 'pending' },
  { id: 2, name: 'Beta Loft', description: 'large', total_area: 120, unit: 'sqft', status: 'completed' },
];
test('search/filter narrows floor plans by text, status and unit', () => {
  assert.equal(filterPlans(rows, { search: 'alpha' }).length, 1);
  assert.equal(filterPlans(rows, { status: 'completed' })[0].name, 'Beta Loft');
  assert.equal(filterPlans(rows, { status: 'missing' }).length, 0);
});
test('CSV export preserves 0 and escapes commas', () => {
  assert.match(toCsv(rows), /Alpha House,small,0/);
  assert.equal(toCsv([{ id: 1, name: 'A,B', total_area: 1 }]).split('\n')[1], '1,"A,B",,1,,');
});
test('fallback AI is labelled aiGenerated:false and preserves false/0', () => {
  const r = buildFallback('space-utilisation-review', rows);
  assert.equal(r.source, 'fallback'); assert.equal(r.aiGenerated, false); assert.equal(r.zero_area_count, 1); assert.equal(r.has_zero_area, true);
  assert.deepEqual(renderAiSections({ ok: false, count: 0, note: '' }).map((s) => s.value), ['false', '0', '']);
  assert.equal(hasAiKey({}), false); assert.equal(hasAiKey({ OPENAI_API_KEY: 'x' }), true);
});
