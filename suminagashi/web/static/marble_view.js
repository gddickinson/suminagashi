// Canvas display for the studio: the browser counterpart of MarblingCanvas (canvas.py). Renders the engine in
// parallel workers (render_pool.js), at reduced resolution while a drag is in progress, then at full resolution.
// Pointer: click tools act on press, drag tools on every move of 3+ engine pixels. Keyboard: arrows move a cursor,
// Enter/Space applies a click tool there, Shift+arrows drag with a drag tool.
import { RenderPool } from './render_pool.js';

export class MarbleView {
  constructor(host, studio, { onStats = null, onChange = null } = {}) {
    this.studio = studio; this.onStats = onStats; this.onChange = onChange;
    host.innerHTML = `<div class="mstage"><canvas class="paper" tabindex="0" role="img"></canvas>
      <canvas class="overlay" aria-hidden="true"></canvas></div>`;
    this.canvas = host.querySelector('.paper'); this.overlay = host.querySelector('.overlay');
    this.canvas.setAttribute('aria-label', 'Marbling canvas. Click or drag to add ink; arrow keys move the cursor, ' +
      'Enter places ink, Shift+arrows drag.');
    this.ctx = this.canvas.getContext('2d'); this.octx = this.overlay.getContext('2d');
    this.off = document.createElement('canvas');
    this.pool = new RenderPool();
    this.busy = false; this.dirty = false; this.fullMs = 0; this.mouse = null;
    this.kbd = null;
    this.fit();
    this._bind();
  }

  fit() {
    const e = this.studio.engine;
    for (const c of [this.canvas, this.overlay]) { c.width = e.width; c.height = e.height; }
    this.canvas.parentElement.style.aspectRatio = `${e.width} / ${e.height}`;
    this.canvas.parentElement.style.width = `min(100%, calc((100vh - 210px) * ${e.width / e.height}))`;
    this.kbd = [e.width / 2, e.height / 2];
    this.ctx.fillStyle = `rgb(${e.water_color.join(',')})`; this.ctx.fillRect(0, 0, e.width, e.height);
  }

  // Coalesces requests: while a render runs, one more is scheduled (like MarblingCanvas.request_render).
  requestRender() {
    this.dirty = true;
    if (!this.busy) this._run();
  }

  async _run() {
    this.busy = true;
    while (this.dirty) {
      this.dirty = false;
      const e = this.studio.engine;
      const stride = this.studio.dragging ? (this.fullMs > 250 ? 3 : this.fullMs > 60 ? 2 : 1) : 1;
      const t0 = performance.now();
      const img = await this.pool.render(e, stride);
      const ms = performance.now() - t0;
      if (stride === 1) this.fullMs = ms;
      if (e !== this.studio.engine) { this.dirty = true; continue; }
      this._paint(img, stride);
      this.onStats?.({ ops: e.opCount, ms, stride });
    }
    this.busy = false;
    // after a reduced-resolution drag frame, finish with a full render
    if (!this.studio.dragging && this.lastStride > 1) this.requestRender();
  }

  _paint(img, stride) {
    this.lastStride = stride;
    const id = new ImageData(img.data, img.w, img.h);
    if (stride === 1) { this.ctx.putImageData(id, 0, 0); return; }
    this.off.width = img.w; this.off.height = img.h;
    this.off.getContext('2d').putImageData(id, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.drawImage(this.off, 0, 0, this.canvas.width, this.canvas.height);
  }

  // Cursor preview ring (MarblingCanvas.paintEvent draws the drop radius when not dragging).
  _drawCursor() {
    const g = this.octx, p = this.mouse || (document.activeElement === this.canvas ? this.kbd : null);
    g.clearRect(0, 0, this.overlay.width, this.overlay.height);
    if (!p || this.studio.dragging) return;
    g.strokeStyle = 'rgba(100,90,80,0.47)'; g.lineWidth = 1.5 * this.overlay.width / this.canvas.clientWidth;
    g.beginPath(); g.arc(p[0], p[1], this.studio.params.drop_radius, 0, Math.PI * 2); g.stroke();
  }

  _pos(ev) {
    const r = this.canvas.getBoundingClientRect(), e = this.studio.engine;
    return [(ev.clientX - r.left) * e.width / r.width, (ev.clientY - r.top) * e.height / r.height];
  }

  _changed() { this.onChange?.(); this.requestRender(); }

  _bind() {
    const c = this.canvas, s = this.studio;
    c.addEventListener('pointerdown', ev => {
      if (ev.button !== 0) return;
      const [x, y] = this._pos(ev);
      if (s.click(x, y)) this._changed();
      else if (s.dragStart(x, y)) c.setPointerCapture?.(ev.pointerId);
      this._drawCursor();
    });
    c.addEventListener('pointermove', ev => {
      this.mouse = ev.pointerType === 'mouse' ? this._pos(ev) : null;
      if (s.dragging && s.dragMove(...this._pos(ev))) this._changed();
      this._drawCursor();
    });
    const up = () => { if (s.dragging) { s.dragEnd(); this._changed(); } this._drawCursor(); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', () => { this.mouse = null; this._drawCursor(); });
    c.addEventListener('focus', () => this._drawCursor());
    c.addEventListener('blur', () => this._drawCursor());
    c.addEventListener('keydown', ev => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
      const e = s.engine;
      if (d) {
        ev.preventDefault();
        const step = 10, k = this.kbd;
        const next = [Math.min(e.width, Math.max(0, k[0] + d[0] * step)), Math.min(e.height, Math.max(0, k[1] + d[1] * step))];
        if (ev.shiftKey && s.dragStart(...k)) { s.dragMove(...next); s.dragEnd(); this._changed(); }
        this.kbd = next; this.mouse = null; this._drawCursor();
      } else if ((ev.key === 'Enter' || ev.key === ' ') && s.click(...this.kbd)) {
        ev.preventDefault(); this._changed();
      }
    });
  }

  // PNG of the artwork at scale x the engine size (scale 2 samples every half pixel: inverse mapping is
  // resolution-independent, so the 2x export is sharper, not upscaled).
  async savePng(scale = 1, name = 'suminagashi.png') {
    const img = await this.pool.render(this.studio.engine, 1 / scale);
    const cv = document.createElement('canvas');
    cv.width = img.w; cv.height = img.h;
    cv.getContext('2d').putImageData(new ImageData(img.data, img.w, img.h), 0, 0);
    cv.toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  }

  destroy() { this.pool.terminate(); }
}
