// Studio state: the browser counterpart of MarblingCanvas's tool state and ControlPanel's palette/preset handling
// (canvas.py, controls.py). Holds the engine, the palette (water + cycling ink colours), the tool and slider values.
import { rng } from './core.js';
import { MarblingEngine } from './marble_engine.js';
import { applyPreset } from './marble_presets.js';
import { addRings, dragStep } from './marble_tools.js';

// data: { palettes: /api/palettes, ui: /api/ui, presets: /api/presets }
export class Studio {
  constructor(data, { width, height, palette } = {}) {
    this.data = data;
    this.pal = Object.fromEntries(data.palettes.palettes.map(p => [p.key, p]));
    this.params = Object.fromEntries(data.ui.sliders.map(s => [s.key, s.initial]));
    this.tool = data.ui.tools[0].key;
    this.dragTools = new Set(data.ui.tools.filter(t => t.drag).map(t => t.key));
    const [w, h] = data.ui.default_size;
    this.engine = new MarblingEngine(width || w, height || h);
    this.gestures = [];          // operation count before each click/drag (web-only "undo stroke")
    this.dragging = false; this.last = null;
    this.setPalette(this.pal[palette] ? palette : data.palettes.default);
  }

  get palette() { return this.pal[this.paletteKey]; }

  // ControlPanel._apply_palette: water colour + ink colours (colour cycling restarts).
  setPalette(key) {
    this.paletteKey = key;
    this.engine.setWaterColor(this.palette.water);
    this.colors = this.palette.colors; this.colorIndex = 0;
  }

  _nextColor() { return this.colors[this.colorIndex++ % this.colors.length]; }

  // mousePressEvent of a click tool; returns true if operations were added.
  click(x, y) {
    const n = this.engine.opCount;
    if (this.tool === 'drop') this.engine.addDrop(x, y, this.params.drop_radius, this._nextColor());
    else if (this.tool === 'ring') addRings(this.engine, x, y, this.colors, this.params.ring_count, this.params.ring_spacing);
    else return false;
    if (this.engine.opCount > n) this.gestures.push(n);
    return this.engine.opCount > n;
  }

  dragStart(x, y) {
    if (!this.dragTools.has(this.tool)) return false;
    this.dragging = true; this.last = [x, y]; this.gestureStart = this.engine.opCount;
    return true;
  }

  // mouseMoveEvent while dragging; returns true if an operation was added.
  dragMove(x, y) {
    if (!this.dragging) return false;
    const n = this.engine.opCount;
    if (dragStep(this.engine, this.tool, this.last, [x, y], this.params.blow_strength, this.params.comb_strength) === null) return false;
    this.last = [x, y];
    return this.engine.opCount > n;
  }

  dragEnd() {
    if (this.dragging && this.engine.opCount > this.gestureStart) this.gestures.push(this.gestureStart);
    this.dragging = false; this.last = null;
  }

  // Desktop Undo: removes the last single operation.
  undo() {
    this.engine.undo();
    while (this.gestures.length && this.gestures.at(-1) >= this.engine.opCount) this.gestures.pop();
  }

  // Web-only: removes the whole last click or drag (a drag adds one operation per mouse step).
  undoGesture() {
    if (!this.gestures.length) return this.undo();
    this.engine.operations.length = this.gestures.pop();
  }

  clear() { this.engine.clear(); this.colorIndex = 0; this.gestures = []; }

  // ControlPanel._on_preset_clicked; seed gives a reproducible preset (mulberry32), else Math.random.
  preset(key, seed = null) {
    applyPreset(key, this.engine, this.palette, seed == null ? Math.random : rng(seed));
    this.colorIndex = 0; this.gestures = [];
  }

  // MainWindow._on_canvas_resize: a new empty engine keeping the palette.
  resize(w, h) {
    this.engine = new MarblingEngine(w, h, this.palette.water);
    this.colorIndex = 0; this.gestures = [];
  }
}
