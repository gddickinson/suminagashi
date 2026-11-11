// Control panel DOM for the studio: the browser counterpart of ControlPanel (controls.py) plus the Canvas menu of
// MainWindow. Tools, sliders, presets and canvas sizes come from /api/ui and /api/presets (suminagashi/ui_specs.py).
import { esc, list, slider, isStatic } from './core.js';

export const rgbCss = c => `rgb(${c[0]},${c[1]},${c[2]})`;
export const swatches = p => list(p.colors, c => `<span class="dot" style="background:${rgbCss(c)}"></span>`);

// The desktop panel also shows "Drop Radius" for the Rings tool although the Rings tool does not use it
// (it uses Ring Spacing as the drop radius); the web panel hides it there.
const UNUSED = { ring: ['drop_radius'] };

export function buildPanel(host, studio, act) {
  const d = studio.data, ui = d.ui;
  host.innerHTML = `
  <div class="grp"><label for="pal">Palette</label>
    <select id="pal">${list(d.palettes.palettes, p => `<option value="${esc(p.key)}">${esc(p.name)}</option>`)}</select>
    <div class="swatches" id="sw"></div></div>
  <div class="grp"><h3 id="tool-h">Tool</h3>
    <div class="seg tools" role="radiogroup" aria-labelledby="tool-h">${list(ui.tools, t =>
      `<button type="button" role="radio" data-tool="${esc(t.key)}" title="${esc(t.desc)}">${esc(t.name)}</button>`)}</div>
    <p class="small mute" id="tool-desc"></p>
    <div id="sliders"></div></div>
  <div class="grp"><h3>Presets</h3>
    <div class="btns presets">${list(d.presets, p =>
      `<button type="button" class="alt" data-preset="${esc(p.key)}" title="${esc(p.doc)}">${esc(p.label)}</button>`)}</div></div>
  <div class="grp"><h3>Actions</h3>
    <div class="btns">
      <button type="button" class="alt" data-act="undo" title="Remove the last operation (Ctrl+Z)">Undo</button>
      <button type="button" class="alt" data-act="undoGesture" title="Remove the whole last click or drag (Ctrl+Shift+Z)">Undo stroke</button>
      <button type="button" class="alt" data-act="clear" title="Clear the canvas (Ctrl+Shift+X)">Clear</button>
      <button type="button" data-act="save" title="Save the artwork (Ctrl+S)">Save PNG</button>
      <button type="button" data-act="save2" title="Twice the resolution, re-sampled from the transforms">PNG 2×</button>
    </div>
    <label for="size">Canvas size</label>
    <select id="size">${list(ui.canvas_sizes, s => `<option value="${s.w}x${s.h}">${esc(s.label)}</option>`)}</select>
    ${isStatic() ? '' : `<div class="btns"><button type="button" class="alt" data-act="python"
      title="Render the current operation list with the numpy engine of the desktop app">Render with Python</button></div>`}
  </div>
  <p class="small mute status" id="status" aria-live="polite">Ready: click on the canvas to begin.</p>
  <p class="small mute" id="pystatus"></p>`;

  const $ = s => host.querySelector(s);
  const showPalette = () => { $('#pal').value = studio.paletteKey; $('#sw').innerHTML = swatches(studio.palette); };
  const showTool = () => {
    host.querySelectorAll('[data-tool]').forEach(b => {
      const on = b.dataset.tool === studio.tool;
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
    });
    $('#tool-desc').textContent = ui.tools.find(t => t.key === studio.tool).desc;
    const box = $('#sliders'); box.innerHTML = '';
    const keys = (ui.tool_sliders[studio.tool] || []).filter(k => !(UNUSED[studio.tool] || []).includes(k));
    for (const s of ui.sliders.filter(x => keys.includes(x.key))) {
      slider(box, { id: s.key, label: s.label, min: s.min_val, max: s.max_val, value: studio.params[s.key], unit: s.suffix },
        v => { studio.params[s.key] = v; });
    }
  };
  const showSize = () => { $('#size').value = `${studio.engine.width}x${studio.engine.height}`; };

  $('#pal').addEventListener('change', e => { studio.setPalette(e.target.value); showPalette(); act('changed'); });
  host.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => { studio.tool = b.dataset.tool; showTool(); }));
  host.querySelector('.tools').addEventListener('keydown', e => {   // arrow keys move between radio buttons
    const i = ui.tools.findIndex(t => t.key === studio.tool), d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault(); studio.tool = ui.tools[(i + d + ui.tools.length) % ui.tools.length].key; showTool();
    host.querySelector(`[data-tool="${studio.tool}"]`).focus();
  });
  host.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => act('preset', b.dataset.preset)));
  host.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act(b.dataset.act)));
  $('#size').addEventListener('change', e => { const [w, h] = e.target.value.split('x').map(Number); act('resize', [w, h]); });

  showPalette(); showTool(); showSize();
  return {
    status: t => { $('#status').textContent = t; },
    pyStatus: h => { $('#pystatus').innerHTML = h; },
    refresh: () => { showPalette(); showTool(); showSize(); },
  };
}
