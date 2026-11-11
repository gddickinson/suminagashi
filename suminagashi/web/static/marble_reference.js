// Replays a reference case of suminagashi/web/reference.py in JavaScript (same seeded mulberry32 stream) and
// compares operation lists and images with the Python results. Used by the Verify page and the node test.
import { rng } from './core.js';
import { MarblingEngine } from './marble_engine.js';
import { applyPreset } from './marble_presets.js';
import { addRings, dragStep } from './marble_tools.js';

// web/reference.py _run_script: a desktop session replayed the way MarblingCanvas handles clicks and drags.
function runScript(e, script, colors, sliders, rand) {
  const p = Object.fromEntries(sliders.map(s => [s.key, s.initial]));
  let ci = 0;
  for (const step of script) {
    const [kind] = step;
    if (kind === 'set') p[step[1]] = step[2];
    else if (kind === 'drop') { e.addDrop(step[1], step[2], p.drop_radius, colors[ci % colors.length]); ci++; }
    else if (kind === 'ring') addRings(e, step[1], step[2], colors, p.ring_count, p.ring_spacing, rand);
    else if (kind === 'drag') {
      const [, tool, pts] = step;
      let last = pts[0];
      for (const q of pts.slice(1)) if (dragStep(e, tool, last, q, p.blow_strength, p.comb_strength) !== null) last = q;
    }
  }
}

// case: from /api/reference/<name>; palettes: {key: {water, colors}}; sliders: /api/ui sliders.
export function runCase(c, palettes, sliders) {
  const pal = palettes[c.palette];
  const e = new MarblingEngine(c.width, c.height, pal.water);
  const rand = rng(c.seed);
  if (c.kind === 'preset') applyPreset(c.preset, e, pal, rand);
  else runScript(e, c.script, pal.colors, sliders, rand);
  const img = e.render(c.stride);
  return { engine: e, ops: e.operations, image: img };
}

const FIELDS = ['cx', 'cy', 'radius', 'angle', 'strength', 'width'];

// Largest |JS - Python| over all numeric operation fields; also checks types and colours agree.
export function compareOps(py, js) {
  let maxDiff = 0, same = py.length === js.length;
  for (let i = 0; i < Math.min(py.length, js.length); i++) {
    const a = py[i], b = js[i];
    if (a.op_type !== b.op_type || a.color.join() !== b.color.join()) same = false;
    for (const f of FIELDS) maxDiff = Math.max(maxDiff, Math.abs(a[f] - b[f]));
  }
  return { count: py.length, jsCount: js.length, same, maxDiff };
}

// Python RGB bytes vs JS RGBA: number of differing pixels.
export function compareImages(rgb, rgba) {
  let differing = 0;
  const n = rgb.length / 3;
  for (let i = 0; i < n; i++) {
    if (rgb[3 * i] !== rgba[4 * i] || rgb[3 * i + 1] !== rgba[4 * i + 1] || rgb[3 * i + 2] !== rgba[4 * i + 2]) differing++;
  }
  return { pixels: n, differing };
}

export function b64bytes(s) {
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Browser: inflate a zlib stream (Python zlib.compress) with DecompressionStream.
export async function inflate(b64) {
  const stream = new Blob([b64bytes(b64)]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
