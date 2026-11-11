// Render worker: renders one band of rows of an operation list with the JS engine (marble_engine.js).
import { MarblingEngine } from './marble_engine.js';

self.onmessage = ({ data: m }) => {
  const e = new MarblingEngine(m.width, m.height, m.water);
  e.operations = m.ops;
  const buf = new Uint8ClampedArray((m.j1 - m.j0) * m.w * 4);
  e.renderRows(m.stride, m.j0, m.j1, m.w, buf, m.j0);
  self.postMessage({ id: m.id, j0: m.j0, buf }, [buf.buffer]);
};
