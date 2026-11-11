// JavaScript port of suminagashi/presets.py: each preset clears the engine and adds its operation sequence.
// rand() replaces numpy's default_rng(); with the seeded mulberry32 stream of core.js (and the same stream patched
// into Python by web/reference.py) the operation lists match the Python presets exactly.

const u = (rand, lo, hi) => lo + (hi - lo) * rand();

function concentric(e, pal, rand, kw = {}) {
  e.clear();
  e.addConcentricRings(e.width / 2, e.height / 2, pal.colors, kw.count ?? 25, 12, 2.0, rand);
}

function scattered(e, pal, rand, kw = {}) {
  e.clear();
  const w = e.width, h = e.height;
  for (let k = 0; k < (kw.n_centers ?? 5); k++) {
    const cx = u(rand, w * 0.15, w * 0.85), cy = u(rand, h * 0.15, h * 0.85);
    e.addConcentricRings(cx, cy, pal.colors, kw.drops_per ?? 10, 10, 3.0, rand);
  }
}

function blown(e, pal, rand, kw = {}) {
  e.clear();
  const cx = e.width / 2, cy = e.height / 2, n = kw.n_blows ?? 6;
  e.addConcentricRings(cx, cy, pal.colors, 20, 14, 2.0, rand);
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + u(rand, -0.3, 0.3);
    e.addBlow(cx + Math.cos(angle) * 60, cy + Math.sin(angle) * 60, 25 + u(rand, 0, 15), 80);
  }
}

function combed(e, pal, rand, kw = {}) {
  e.clear();
  const w = e.width, h = e.height, cx = w / 2, cy = h / 2, n = kw.n_clusters ?? 4;
  for (let j = 0; j < n; j++) {
    e.addConcentricRings(cx - (n - 1) * 50 + j * 100, cy, pal.colors, 8, 10, 3.0, rand);
  }
  const spacing = kw.comb_spacing ?? 40;
  for (let x = Math.trunc(w * 0.08); x < Math.trunc(w * 0.92); x += spacing) e.addStroke(x, cy, Math.PI / 2, 50, 30);
  for (let y = Math.trunc(h * 0.12); y < Math.trunc(h * 0.88); y += 60) {
    e.addStroke(cx, y, Math.floor(y / 60) % 2 === 0 ? 0 : Math.PI, 40, 25);
  }
}

function vortexRings(e, pal, rand, kw = {}) {
  e.clear();
  const cx = e.width / 2, cy = e.height / 2, n = kw.n_vortices ?? 4;
  e.addConcentricRings(cx, cy, pal.colors, 22, 12, 2.0, rand);
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    e.addVortex(cx + Math.cos(angle) * 70, cy + Math.sin(angle) * 70, (i % 2 === 0 ? 1 : -1) * 0.6, 90);
  }
}

function stone(e, pal, rand, kw = {}) {
  e.clear();
  const w = e.width, h = e.height, c = pal.colors;
  for (let i = 0; i < (kw.n_drops ?? 120); i++) {
    const cx = u(rand, 0, w), cy = u(rand, 0, h), r = u(rand, 4, 16);
    e.addDrop(cx, cy, r, c[i % c.length]);
  }
}

export const PRESETS = { concentric, scattered, blown, combed, vortex_rings: vortexRings, stone };

export function applyPreset(name, engine, palette, rand = Math.random, kw = {}) {
  if (!PRESETS[name]) throw new Error(`Unknown preset '${name}'`);
  PRESETS[name](engine, palette, rand, kw);
}
