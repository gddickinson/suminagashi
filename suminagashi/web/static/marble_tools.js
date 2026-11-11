// JavaScript port of suminagashi/tool_ops.py: what a click (Drop, Rings) or a drag step (Blow, Swirl, Comb) adds
// to the engine, exactly as the desktop canvas (MarblingCanvas) does it.

export const MIN_DRAG_DIST = 3.0;

// Rings tool: count drops of radius spacing ± 2, jittered ± 2 px, cycling the palette colours.
export function addRings(engine, x, y, colors, count, spacing, rand = Math.random) {
  const u = (lo, hi) => lo + (hi - lo) * rand();
  for (let i = 0; i < count; i++) {
    const c = colors[i % colors.length];
    const r = spacing + u(-2, 2), dx = u(-2, 2), dy = u(-2, 2);
    engine.addDrop(x + dx, y + dy, r, c);
  }
}

// One drag step from last to pos ([x, y], engine coordinates). Returns null if shorter than MIN_DRAG_DIST
// (the caller keeps last), else true.
export function dragStep(engine, tool, last, pos, blowStrength, combStrength) {
  const dx = pos[0] - last[0], dy = pos[1] - last[1];
  if (Math.sqrt(dx * dx + dy * dy) < MIN_DRAG_DIST) return null;
  if (tool === 'blow') {
    engine.addBlow(last[0], last[1], blowStrength * 0.7, blowStrength * 2);
  } else if (tool === 'vortex') {
    const cx = engine.width / 2, cy = engine.height / 2;
    const cross = dx * (pos[1] - cy) - dy * (pos[0] - cx);
    engine.addVortex(pos[0], pos[1], (cross > 0 ? 1 : -1) * 0.3 * (blowStrength / 40), blowStrength * 2.5);
  } else if (tool === 'comb') {
    engine.addStroke(last[0], last[1], Math.atan2(dy, dx), combStrength * 0.8, combStrength * 0.6);
  }
  return true;
}
