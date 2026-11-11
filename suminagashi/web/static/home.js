// Home page: hero with a preset drawn drop by drop, counts from the Python package, entry cards and the palettes.
import { route, api, app, list, esc, animate, rng } from './core.js';
import { MarblingEngine } from './marble_engine.js';
import { applyPreset } from './marble_presets.js';
import { loadData } from './studio.js';
import { swatches } from './studio_panel.js';

const DOORS = [
  ['#/studio', 'Studio', 'The full simulator: ten palettes, five tools (drop, rings, blow, swirl, comb), six presets, undo and PNG export.', 'a'],
  ['#/presets', 'Presets', 'Every preset pattern rendered in the palette of your choice; open any of them in the studio to keep working.', 'b'],
  ['#/verify', 'Python vs JavaScript', 'Seeded presets and a scripted tool session run by the Python package and by this browser port, compared pixel by pixel.', 'c'],
  ['#/about', 'About', "Jaffer's area-preserving drop transform, the comb, blow and vortex operations, inverse raster mapping, and how to run the apps.", 'a'],
];

route('home', async () => {
  const [info, data] = await Promise.all([api('/info'), loadData()]);
  const pal = data.palettes.palettes.find(p => p.key === 'autumn') || data.palettes.palettes[0];
  app().innerHTML = `
  <section class="hero home-hero">
    <div>
      <p class="kicker">墨流し · floating ink</p>
      <h1 class="glow">Suminagashi Marbling Simulator</h1>
      <p class="lead">${esc(info.summary)} Each ink drop pushes every earlier ring outward while preserving its area,
      so successive drops thin into concentric bands, just as sumi ink spreads on water. The same engine as the
      desktop app, running in your browser.</p>
      <a class="btn" href="#/studio">Open the studio</a><a class="btn alt" href="#/about">How it works</a>
    </div>
    <figure class="hero-art"><canvas id="hero" width="300" height="300" role="img"
      aria-label="The Wind-Blown preset being drawn one operation at a time"></canvas>
      <figcaption>The Wind-Blown preset (${esc(pal.name)} palette) on a 300×300 canvas, one operation at a time.</figcaption></figure>
  </section>
  <div class="tiles">
    <div class="tile"><b>${info.palettes}</b><span>palettes</span></div>
    <div class="tile"><b>${info.presets}</b><span>preset patterns</span></div>
    <div class="tile"><b>${info.tools}</b><span>tools</span></div>
    <div class="tile"><b>${info.op_types}</b><span>operation types</span></div>
    <div class="tile"><b>${info.canvas_sizes}</b><span>canvas sizes</span></div>
  </div>
  <div class="grid wide">${list(DOORS, ([href, t, d, c]) => `<a class="card door ${c}" href="${href}"><b>${t}</b><span>${d}</span></a>`)}</div>
  <h2>Pick a palette</h2>
  <div class="chips">${list(data.palettes.palettes, p => `<a class="chip" href="#/studio?palette=${esc(p.key)}">
    ${swatches(p)}${esc(p.name)}</a>`)}</div>`;

  // Wind-Blown preset (seeded), replayed operation by operation.
  const full = new MarblingEngine(300, 300, pal.water);
  applyPreset('blown', full, pal, rng(3));
  const ops = full.operations.slice(), g = document.getElementById('hero').getContext('2d');
  const show = k => {
    const e = new MarblingEngine(300, 300, pal.water); e.operations = ops.slice(0, k);
    const img = e.render(); g.putImageData(new ImageData(img.data, img.w, img.h), 0, 0);
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { show(ops.length); return; }
  let k = 0, next = 0;
  animate(t => {
    if (t < next) return;
    show(k); k++;
    next = t + (k > ops.length ? 4000 : 160);
    if (k > ops.length + 1) k = 0;
  });
});
