// JavaScript port of suminagashi/engine.py (MarblingEngine): the same operation list (drop, stroke, blow, vortex)
// and the same inverse raster mapping. Operations are stored as plain objects with the fields of the Python
// Operation dataclass (op_type, cx, cy, radius, color, angle, strength, width) so they compare 1:1 with Python.
//
// Rendering walks each sample point backwards through the operation history: the first (most recent) drop that
// contains it gives its colour; drops it lies outside of, strokes, blows and vortices warp it back. numpy does the
// same op-by-op over all unclaimed pixels; per pixel the arithmetic is identical.

export const EPSILON = 0.5;   // MarblingEngine._EPSILON

export class MarblingEngine {
  constructor(width = 800, height = 600, waterColor = [245, 242, 235]) {
    if (width < 1 || height < 1) throw new Error(`Canvas dimensions must be positive, got ${width}×${height}`);
    this.width = width; this.height = height;
    this.water_color = [...waterColor];
    this.operations = [];
  }

  setWaterColor(c) { this.water_color = [...c]; }

  _op(op_type, f) {
    return { op_type, cx: 0, cy: 0, radius: 10, color: [0, 0, 0], angle: 0, strength: 0, width: 30, ...f };
  }

  addDrop(cx, cy, radius, color) {
    if (radius <= 0) return false;
    this.operations.push(this._op('DROP', { cx, cy, radius, color: [...color] }));
    return true;
  }

  addStroke(cx, cy, angle, strength, width = 30) {
    if (Math.abs(strength) < 0.01) return false;
    this.operations.push(this._op('STROKE', { cx, cy, angle, strength, width: Math.max(width, 1) }));
    return true;
  }

  addBlow(cx, cy, strength, radius) {
    if (Math.abs(strength) < 0.01 || radius <= 0) return false;
    this.operations.push(this._op('BLOW', { cx, cy, strength, radius: Math.max(radius, 1) }));
    return true;
  }

  addVortex(cx, cy, strength, radius) {
    if (Math.abs(strength) < 0.01 || radius <= 0) return false;
    this.operations.push(this._op('VORTEX', { cx, cy, strength, radius: Math.max(radius, 1) }));
    return true;
  }

  // add_concentric_rings: rand() is a uniform [0,1) stream (numpy Generator.uniform(lo, hi) = lo + (hi-lo)*random()).
  addConcentricRings(cx, cy, colors, count = 10, ringRadius = 12, jitter = 2, rand = Math.random) {
    if (!colors.length) throw new Error('Need at least one colour for concentric rings');
    const u = (lo, hi) => lo + (hi - lo) * rand();
    for (let i = 0; i < count; i++) {
      const c = colors[i % colors.length];
      const r = ringRadius + u(-2, 2);
      const dx = u(-jitter, jitter), dy = u(-jitter, jitter);
      this.addDrop(cx + dx, cy + dy, r, c);
    }
  }

  undo() { return this.operations.pop() ?? null; }
  clear() { this.operations.length = 0; }
  get opCount() { return this.operations.length; }

  // Render RGBA samples on a grid: pixel (i, j) samples engine point (i*stride, j*stride).
  // stride 1 = engine.render(); stride 3 = engine.render()[::3, ::3]; stride 0.5 = a 2x export.
  render(stride = 1, out = null) {
    const w = Math.ceil(this.width / stride - 1e-9), h = Math.ceil(this.height / stride - 1e-9);
    const data = out && out.length === w * h * 4 ? out : new Uint8ClampedArray(w * h * 4);
    this.renderRows(stride, 0, h, w, data);
    return { w, h, data };
  }

  // Rows [j0, j1) of the grid into data (RGBA, width w; row j stored at row j - rowOffset): render workers
  // each fill one band.
  renderRows(stride, j0, j1, w, data, rowOffset = 0) {
    const P = this._packed(), n = this.operations.length, wc = this.water_color;
    for (let j = j0; j < j1; j++) {
      for (let i = 0; i < w; i++) {
        let x = i * stride, y = j * stride, cr = wc[0], cg = wc[1], cb = wc[2];
        for (let k = n - 1; k >= 0; k--) {
          const b = k * F, t = P[b], cx = P[b + 1], cy = P[b + 2];
          if (t === 0) {                                      // DROP
            const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy, r2 = P[b + 3];
            if (d2 < r2) { cr = P[b + 7]; cg = P[b + 8]; cb = P[b + 9]; break; }
            const f = Math.sqrt(Math.max(1 - r2 / d2, 0));
            x = cx + dx * f; y = cy + dy * f;
          } else if (t === 1) {                               // STROKE
            const c = P[b + 5], s = P[b + 6];
            const perp = -(x - cx) * s + (y - cy) * c;
            const disp = P[b + 4] * Math.exp(-perp * perp / P[b + 3]);
            x -= disp * c; y -= disp * s;
          } else {                                            // BLOW (2) / VORTEX (3)
            const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
            if (!(d > EPSILON)) continue;
            const fall = Math.exp(-d * d / P[b + 3]);
            if (t === 2) {
              const disp = P[b + 4] * fall;
              x -= disp * (dx / d); y -= disp * (dy / d);
            } else {
              const a = -P[b + 4] * fall, c = Math.cos(a), s = Math.sin(a);
              x = cx + (dx * c - dy * s); y = cy + (dx * s + dy * c);
            }
          }
        }
        const p = ((j - rowOffset) * w + i) * 4;
        data[p] = cr; data[p + 1] = cg; data[p + 2] = cb; data[p + 3] = 255;
      }
    }
  }

  // Operations packed into one Float64Array (F numbers each) for a fast inner loop. The precomputed denominators
  // keep numpy's evaluation order: 2.0 * width * width and 2.0 * radius * radius.
  _packed() {
    const ops = this.operations, P = new Float64Array(ops.length * F);
    ops.forEach((o, k) => {
      const b = k * F, t = OP_CODE[o.op_type];
      P[b] = t; P[b + 1] = o.cx; P[b + 2] = o.cy;
      if (t === 0) { P[b + 3] = o.radius * o.radius; P[b + 7] = o.color[0]; P[b + 8] = o.color[1]; P[b + 9] = o.color[2]; }
      else if (t === 1) { P[b + 3] = 2 * o.width * o.width; P[b + 4] = o.strength; P[b + 5] = Math.cos(o.angle); P[b + 6] = Math.sin(o.angle); }
      else { P[b + 3] = 2 * o.radius * o.radius; P[b + 4] = o.strength; }
    });
    return P;
  }
}

const F = 10;
const OP_CODE = { DROP: 0, STROKE: 1, BLOW: 2, VORTEX: 3 };
