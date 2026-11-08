import test from 'node:test';
import assert from 'node:assert/strict';
import { TIPS, TOUR, tipFor } from './helpTips.js';

test('each office screen has exactly one tip', () => {
  for (const path of ['/today', '/projects', '/p/PRJ-2026-0001', '/overview', '/documents', '/finance', '/money/loans', '/installs', '/supply/bom', '/team/attendance', '/chat', '/activity']) {
    assert.ok(tipFor(path), `tip for ${path}`);
  }
  assert.equal(tipFor('/sign/abc'), null, 'customer signing page has no staff tip');
  assert.equal(new Set(TIPS.map((t) => t.id)).size, TIPS.length, 'tip ids are unique');
});

test('tips and tour stay short', () => {
  for (const t of [...TIPS, ...TOUR]) assert.ok(t.text.split(/\s+/).length <= 35, `${t.title} is short`);
  assert.equal(TOUR.length, 5);
});
