// Verify page: the seeded reference runs of the Python package (/api/reference/<name>, computed by
// suminagashi/web/reference.py) next to the same runs of the JavaScript port, with the differences measured.
import { route, api, app, esc } from './core.js';
import { runCase, compareOps, compareImages, inflate } from './marble_reference.js';

function paint(canvas, w, h, rgba) {
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0);
}

const rgbToRgba = rgb => {
  const out = new Uint8ClampedArray(rgb.length / 3 * 4);
  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) { out[j] = rgb[i]; out[j + 1] = rgb[i + 1]; out[j + 2] = rgb[i + 2]; out[j + 3] = 255; }
  return out;
};

route('verify', async () => {
  const [cases, pals, ui] = await Promise.all([api('/reference'), api('/palettes'), api('/ui')]);
  const palettes = Object.fromEntries(pals.palettes.map(p => [p.key, p]));
  app().innerHTML = `
  <h1 class="glow">Python vs JavaScript</h1>
  <p class="lead">The browser studio runs a JavaScript port of <code>engine.py</code>, <code>presets.py</code> and the
  canvas tools. To check it, the Python package is run with the same seeded random stream (mulberry32) as the
  browser; both build the operation list and render it, and the results are compared here. The node test in the repo
  (run by <code>tests/test_web.py</code>) asserts the same comparison.</p>
  <div id="cases"></div>`;
  const host = document.getElementById('cases');
  for (const c of cases) {
    const ref = await api('/reference/' + c.name), k = ref.case;
    const t0 = performance.now(), js = runCase(k, palettes, ui.sliders), ms = performance.now() - t0;
    const o = compareOps(ref.ops, js.ops);
    const rgb = await inflate(ref.image.rgb_z), d = compareImages(rgb, js.image.data);
    const good = o.same && o.maxDiff < 1e-9 && d.differing <= d.pixels * 1e-3;
    const what = k.kind === 'preset' ? `preset <code>${esc(k.preset)}</code>`
      : `scripted session of ${k.script.filter(s => s[0] !== 'set').length} clicks and drags through <code>tool_ops.py</code>`;
    const sec = document.createElement('section');
    sec.className = 'panel';
    sec.innerHTML = `<h2>${esc(k.name)}</h2>
      <p class="small mute">${what} · palette ${esc(palettes[k.palette].name)} · seed ${k.seed} · canvas
      ${k.width}×${k.height}, sampled every ${k.stride} px (${ref.image.w}×${ref.image.h})</p>
      <div class="vrun"><div class="pair">
        <figure><canvas class="py"></canvas><figcaption>Python <code>MarblingEngine.render</code></figcaption></figure>
        <figure><canvas class="js"></canvas><figcaption>JavaScript <code>render</code></figcaption></figure>
      </div>
      <div><div class="scroll"><table><tbody>
        <tr><th>Operations</th><td>${o.count} in Python, ${o.jsCount} in JS; types and colours ${o.same ? 'agree' : '<span class="err">differ</span>'};
          max |JS − Python| over positions, radii, angles, strengths = <b>${o.maxDiff.toExponential(1)}</b></td></tr>
        <tr><th>Image</th><td><b>${d.differing}</b> of ${d.pixels} pixels differ</td></tr>
        <tr><th>JS time</th><td>${ms.toFixed(0)} ms</td></tr>
      </tbody></table></div>
      <p class="${good ? 'ok' : 'err'}">${good ? 'Match.' : 'Mismatch.'}</p></div></div>`;
    host.appendChild(sec);
    paint(sec.querySelector('.py'), ref.image.w, ref.image.h, rgbToRgba(rgb));
    paint(sec.querySelector('.js'), js.image.w, js.image.h, js.image.data);
    sec.querySelectorAll('canvas').forEach((cv, i) => {
      cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', `${i ? 'JavaScript' : 'Python'} rendering of reference run ${k.name}`);
    });
  }
});
