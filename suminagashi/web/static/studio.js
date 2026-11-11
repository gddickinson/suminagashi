// Studio page (#/studio?palette=..&preset=..&seed=..&size=WxH): the full marbling simulator in the browser.
import { route, api, app, onLeave } from './core.js';
import { Studio } from './studio_state.js';
import { MarbleView } from './marble_view.js';
import { buildPanel } from './studio_panel.js';
import { inflate, compareImages } from './marble_reference.js';

export async function loadData() {
  const [palettes, ui, presets] = await Promise.all([api('/palettes'), api('/ui'), api('/presets')]);
  return { palettes, ui, presets };
}

route('studio', async (args, q) => {
  const data = await loadData();
  const [w, h] = (q.size || '').split('x').map(Number);
  const okSize = data.ui.canvas_sizes.some(s => s.w === w && s.h === h);
  const studio = new Studio(data, { palette: q.palette, ...(okSize ? { width: w, height: h } : {}) });
  if (q.preset && data.presets.some(p => p.key === q.preset)) studio.preset(q.preset, q.seed ? +q.seed : null);

  app().innerHTML = `
  <h1 class="glow h-small">墨流し Studio</h1>
  <p class="mute small">Drop ink, then blow, swirl and comb it. Every pixel is traced backwards through the whole
  operation history, as in the desktop app.</p>
  <div class="studio">
    <div class="studio-col" id="stage"></div>
    <aside class="panel studio-panel" id="panel" aria-label="Marbling controls"></aside>
  </div>`;

  let panel = null;
  const view = new MarbleView(document.getElementById('stage'), studio, {
    onStats: s => panel?.status(`${s.ops} operations · rendered in ${(s.ms / 1000).toFixed(2)} s` +
      (s.stride > 1 ? ' (preview)' : '')),
  });
  const act = async (what, arg) => {
    if (what === 'preset') studio.preset(arg);
    else if (what === 'undo') studio.undo();
    else if (what === 'undoGesture') studio.undoGesture();
    else if (what === 'clear') studio.clear();
    else if (what === 'resize') { studio.resize(...arg); view.fit(); }
    else if (what === 'save') return view.savePng(1);
    else if (what === 'save2') return view.savePng(2, 'suminagashi_2x.png');
    else if (what === 'python') return renderPython();
    view.requestRender();
  };
  panel = buildPanel(document.getElementById('panel'), studio, act);
  view.requestRender();

  // Local app only: the same operation list rendered by the numpy engine, compared pixel by pixel.
  async function renderPython() {
    const e = studio.engine;
    panel.pyStatus('Rendering with Python…');
    const r = await api('/render', { body: { width: e.width, height: e.height, water: e.water_color, ops: e.operations } });
    const rgb = await inflate(r.rgb_z), d = compareImages(rgb, e.render().data);
    panel.pyStatus(`Python (numpy): ${r.ops} operations in ${r.seconds.toFixed(2)} s; ` +
      `<b class="${d.differing ? 'err' : 'ok'}">${d.differing}</b> of ${d.pixels} pixels differ from the browser render.`);
  }

  const keys = ev => {
    const mod = ev.ctrlKey || ev.metaKey;
    if (!mod || ev.target.matches?.('input, select, textarea')) return;
    const k = ev.key.toLowerCase();
    if (k === 'z') { ev.preventDefault(); act(ev.shiftKey ? 'undoGesture' : 'undo'); }
    else if (k === 's') { ev.preventDefault(); act('save'); }
    else if (k === 'x' && ev.shiftKey) { ev.preventDefault(); act('clear'); }
  };
  document.addEventListener('keydown', keys);
  onLeave(() => { document.removeEventListener('keydown', keys); view.destroy(); });
});
