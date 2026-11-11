// About page: what the simulator is, the transforms (from the README and engine.py), tools, how to run both apps.
import { route, api, app, esc, list } from './core.js';

route('about', async () => {
  const [info, ui, presets] = await Promise.all([api('/info'), api('/ui'), api('/presets')]);
  app().innerHTML = `
  <h1 class="glow">About</h1>
  <p class="lead">${esc(info.summary)} Version ${esc(info.version)}. A desktop app (Python, PyQt5, NumPy) and this web
  version, which runs a JavaScript port of the same engine in the browser.</p>

  <h2>The drop transform</h2>
  <p>The simulation implements <b>Jaffer's area-preserving drop transform</b> from
  <a href="https://people.csail.mit.edu/jaffer/Marbling/" rel="noopener">Mathematical Marbling</a> (Lu, Jaffer et al.,
  IEEE CG&amp;A 2012). When an ink drop of radius <i>r</i> lands at centre <i>C</i>, every point <i>P</i> on the water
  surface moves radially outward to</p>
  <p class="eq">P′ = C + (P − C) · √(1 + r² / ‖P − C‖²)</p>
  <p>This preserves the area of all regions not containing <i>C</i>, so successive drops push earlier ink outward into
  thinning concentric rings, as real sumi ink spreads on water via surface tension and Marangoni forces.</p>

  <h2>The other operations</h2>
  <ul>
    <li><b>Comb stroke</b>: displacement along a direction with a Gaussian falloff perpendicular to the stroke line.</li>
    <li><b>Blow</b>: radial outward push with a Gaussian falloff, like breathing on the water.</li>
    <li><b>Vortex</b>: rotation with a Gaussian falloff.</li>
  </ul>
  <h2>Inverse raster mapping</h2>
  <p>Rendering traces each pixel backward through the full operation history: the inverse drop maps a point outside
  the drop to <span class="eq">C + (P − C) · √(1 − r² / ‖P − C‖²)</span>, and the first drop (most recent first) that
  contains the traced point gives the pixel its colour; otherwise it shows the water colour. This gives filled regions
  with crisp boundaries at any resolution, which is why the studio can export a sharp PNG at twice the canvas size.
  The stroke, blow and vortex are undone by subtracting the displacement (or rotation) evaluated at the traced point.</p>

  <h2>Tools</h2>
  <div class="scroll"><table><thead><tr><th>Tool</th><th>Action</th><th>What it adds</th></tr></thead><tbody>
    <tr><td>Drop</td><td>Click</td><td>One drop of the Drop Radius, colours cycling through the palette</td></tr>
    <tr><td>Rings</td><td>Click</td><td>Ring Count drops of radius Ring Spacing ± 2 px, jittered ± 2 px: classic suminagashi</td></tr>
    <tr><td>Blow</td><td>Drag</td><td>Blows (strength 0.7 × Strength per 48 px dragged, falloff 2 × Strength) along the drag</td></tr>
    <tr><td>Swirl</td><td>Drag</td><td>Vortices (0.3 × Strength / 40 rad per 48 px dragged, falloff 2.5 × Strength) turning with the drag around the canvas centre</td></tr>
    <tr><td>Comb</td><td>Drag</td><td>Strokes along the drag (0.8 × Comb Width per 48 px dragged, falloff 0.6 × Comb Width): at the default width the ink at the tine moves about as far as you drag</td></tr>
  </tbody></table></div>
  <p class="small mute">Drag operations are added for every 3 px moved (split into sub-steps of at most 8 px) and scaled by
  the distance, so a drag has the same effect whether it is fast or slow.</p>
  <p>Presets: ${list(presets, p => `<b>${esc(p.label)}</b> (${esc(p.doc.replace(/\.$/, ''))})`, '; ')}.
  Canvas sizes: ${list(ui.canvas_sizes, s => esc(s.label), ', ')}.</p>
  <p class="small mute">Shortcuts (desktop and studio): Ctrl+S save PNG, Ctrl+Z undo, Ctrl+Shift+X clear. The web studio
  adds "Undo stroke" (Ctrl+Shift+Z), which removes a whole click or drag, a 2× PNG export, and keyboard drawing
  (arrow keys, Enter, Shift+arrows) on the focused canvas.</p>

  <h2>Run the desktop app</h2>
  <pre>pip install numpy PyQt5
python run_suminagashi.py                           # 600×600 canvas
python run_suminagashi.py --palette indigo --preset concentric
python -m suminagashi -W 800 -H 800
python run_suminagashi.py --list-palettes</pre>

  <h2>Run the web app</h2>
  <pre>pip install -r requirements-web.txt
python run_web.py                                   # http://127.0.0.1:8137</pre>
  <p>The local server serves this front end and a small JSON API read from the Python package
  (<code>/api/palettes</code>, <code>/api/presets</code>, <code>/api/ui</code>, seeded reference runs under
  <code>/api/reference</code>), plus <code>POST /api/render</code>, which renders the studio's operation list with the
  numpy engine (the "Render with Python" button). The GitHub Pages site is the same front end with the GET answers
  exported to JSON by <code>scripts/build_static.py</code>, so it works without a server.</p>

  <h2>References</h2>
  <ul>
    <li>Lu, Jaffer et al., <i>Mathematical Marbling</i>, IEEE CG&amp;A 2012</li>
    <li>Jaffer, <i>Dropping Paint</i>, people.csail.mit.edu/jaffer/Marbling/</li>
    <li>Ghassaei, <i>Digital Marbling</i>, blog.amandaghassaei.com</li>
    <li>Sun et al., <i>Hydrodynamics of marbling art</i>, Phys Rev Fluids 2024</li>
  </ul>
  <h2>Credits</h2>
  <p>By George Dickinson, MIT licence. Built with AI assistance from <a href="https://claude.com/" rel="noopener">Claude
  (Anthropic)</a>. Source: <a href="https://github.com/gddickinson/suminagashi">github.com/gddickinson/suminagashi</a>.</p>`;
});
