// Presets page (#/presets?palette=..): every preset of presets.py rendered with the JS engine in one palette.
// Each card links to the studio with the same seed, so the studio opens exactly that pattern.
import { route, app, list, esc, go, onLeave, rng } from './core.js';
import { MarblingEngine } from './marble_engine.js';
import { applyPreset } from './marble_presets.js';
import { RenderPool } from './render_pool.js';
import { loadData } from './studio.js';

route('presets', async (args, q) => {
  const data = await loadData();
  const pals = data.palettes.palettes, key = pals.some(p => p.key === q.palette) ? q.palette : data.palettes.default;
  const [W, H] = data.ui.default_size;
  let seed = +q.seed || 1;
  app().innerHTML = `
  <h1 class="glow">Presets</h1>
  <p class="lead">The ${data.presets.length} preset patterns of the desktop app on its default ${W}×${H} canvas. Ring
  positions and radii are random in the app; here each pattern uses a seeded random stream, so "Open in studio" gives
  the identical pattern to keep working on.</p>
  <div class="toolbar">
    <div><label for="gpal">Palette</label><select id="gpal">${list(pals, p =>
      `<option value="${esc(p.key)}"${p.key === key ? ' selected' : ''}>${esc(p.name)}</option>`)}</select></div>
    <button type="button" class="alt" id="reshuffle">Reshuffle</button>
    <span class="small mute" id="seedinfo"></span>
  </div>
  <div class="grid arts" id="arts"></div>`;
  const pool = new RenderPool();
  onLeave(() => pool.terminate());

  async function draw() {
    const palKey = document.getElementById('gpal').value, pal = pals.find(p => p.key === palKey);
    document.getElementById('seedinfo').textContent = `seed ${seed}`;
    const host = document.getElementById('arts');
    host.innerHTML = list(data.presets, (p, i) => `<div class="card art"><b>${esc(p.label)}</b>
      <small>${esc(p.doc)}</small>
      <canvas width="${W / 2}" height="${H / 2}" role="img" aria-label="${esc(p.label)} preset in the ${esc(pal.name)} palette"></canvas>
      <a class="btn alt" href="#/studio?preset=${esc(p.key)}&palette=${esc(palKey)}&seed=${seed + i}">Open in studio</a></div>`);
    const cvs = host.querySelectorAll('canvas');
    await Promise.all(data.presets.map(async (p, i) => {
      const e = new MarblingEngine(W, H, pal.water);
      applyPreset(p.key, e, pal, rng(seed + i));
      const img = await pool.render(e, 2);
      cvs[i].getContext('2d').putImageData(new ImageData(img.data, img.w, img.h), 0, 0);
    }));
  }
  document.getElementById('gpal').addEventListener('change', e => { go(`#/presets?palette=${e.target.value}&seed=${seed}`); });
  document.getElementById('reshuffle').addEventListener('click', () => { seed += data.presets.length; draw(); });
  await draw();
});
