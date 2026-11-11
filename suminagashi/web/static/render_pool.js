// Parallel rendering: splits the sample grid into row bands rendered by module workers (marble_worker.js), so a
// long operation history stays interactive. Falls back to the main thread where workers are unavailable.
export class RenderPool {
  constructor(n = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 4) - 1))) {
    this.workers = [];
    try {
      for (let i = 0; i < n; i++) this.workers.push(new Worker(new URL('./marble_worker.js', import.meta.url), { type: 'module' }));
    } catch (e) { this.workers = []; }
    this.seq = 0; this.pending = new Map();
    this.workers.forEach(w => { w.onmessage = ({ data }) => this.pending.get(data.id)?.(data); });
  }

  // Render engine at stride; resolves { w, h, data } (RGBA).
  render(engine, stride = 1) {
    const w = Math.ceil(engine.width / stride - 1e-9), h = Math.ceil(engine.height / stride - 1e-9);
    if (!this.workers.length) return Promise.resolve(engine.render(stride));
    const data = new Uint8ClampedArray(w * h * 4), id = ++this.seq;
    const bands = Math.min(this.workers.length * 2, h), per = Math.ceil(h / bands);
    const msg = { id, width: engine.width, height: engine.height, water: engine.water_color, ops: engine.operations, stride, w };
    return new Promise(resolve => {
      let left = 0;
      this.pending.set(id, d => {
        data.set(d.buf, d.j0 * w * 4);
        if (--left === 0) { this.pending.delete(id); resolve({ w, h, data }); }
      });
      for (let b = 0, j0 = 0; j0 < h; b++, j0 += per) {
        left++;
        this.workers[b % this.workers.length].postMessage({ ...msg, j0, j1: Math.min(h, j0 + per) });
      }
    });
  }

  terminate() { this.workers.forEach(w => w.terminate()); this.workers = []; }
}
