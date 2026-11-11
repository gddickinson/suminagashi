// Node test: the JS port (marble_engine.js, marble_presets.js, marble_tools.js) against the Python package, using
// tests/fixtures/marble_reference.json (scripts/make_js_fixtures.py). Run: node marble_engine.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { rng } from './core.js';
import { MarblingEngine } from './marble_engine.js';
import { runCase, compareOps, compareImages } from './marble_reference.js';

const fx = JSON.parse(readFileSync(new URL('../../../tests/fixtures/marble_reference.json', import.meta.url)));
let n = 0;
const ok = (msg) => { n++; console.log('ok', msg); };

// mulberry32 stream
const r = rng(1);
fx.mulberry32_seed1.forEach(v => assert.equal(r(), v));
ok('mulberry32 stream');

// each reference case: same operation list, same image (allowing a handful of boundary pixels for libm last-ulp)
for (const ref of fx.cases) {
  const js = runCase(ref.case, fx.palettes, fx.sliders);
  const c = compareOps(ref.ops, js.ops);
  assert.equal(c.jsCount, c.count, `${ref.case.name}: op count`);
  assert.ok(c.same, `${ref.case.name}: op types/colours`);
  assert.ok(c.maxDiff < 1e-9, `${ref.case.name}: op fields differ by ${c.maxDiff}`);
  const rgb = inflateSync(Buffer.from(ref.image.rgb_z, 'base64'));
  assert.equal(js.image.w, ref.image.w); assert.equal(js.image.h, ref.image.h);
  const d = compareImages(rgb, js.image.data);
  assert.ok(d.differing <= d.pixels * 1e-3, `${ref.case.name}: ${d.differing} of ${d.pixels} pixels differ`);
  ok(`${ref.case.name}: ${c.count} ops, ${d.differing}/${d.pixels} pixels differ`);
}

// engine guards (mirror engine.py)
const e = new MarblingEngine(100, 100);
assert.equal(e.addDrop(50, 50, 0, [0, 0, 0]), false);
assert.equal(e.addStroke(50, 50, 0, 0.001), false);
assert.equal(e.addBlow(50, 50, 10, 0), false);
e.addStroke(1, 1, 0, 5, 0.2); assert.equal(e.operations[0].width, 1);
e.addVortex(1, 1, 0.5, 0.5); assert.equal(e.operations[1].radius, 1);
assert.equal(e.undo().op_type, 'VORTEX'); e.clear(); assert.equal(e.opCount, 0);
assert.throws(() => new MarblingEngine(0, 10));
// empty canvas renders water; a centred drop colours the centre; render(0.5) doubles the resolution
const w = new MarblingEngine(50, 40, [200, 180, 160]);
let img = w.render();
assert.deepEqual([...img.data.slice(0, 4)], [200, 180, 160, 255]);
w.addDrop(25, 20, 8, [255, 0, 0]); img = w.render();
const p = (20 * 50 + 25) * 4; assert.deepEqual([...img.data.slice(p, p + 3)], [255, 0, 0]);
const big = w.render(0.5); assert.equal(big.w, 100); assert.equal(big.h, 80);
ok('engine guards and rendering');
console.log(`all ${n} checks passed`);
