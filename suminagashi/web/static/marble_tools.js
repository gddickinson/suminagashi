// JavaScript port of suminagashi/tool_ops.py: what a click (Drop, Rings) or a drag step (Blow, Swirl, Comb) adds
// to the engine, exactly as the desktop canvas (MarblingCanvas) does it.

export const MIN_DRAG_DIST = 3.0;
// Drag strengths are per REF_DRAG_DIST px of drag (each operation scaled by distance moved / REF_DRAG_DIST), and
// moves longer than MAX_SUBSTEP are split into equal sub-steps, so a drag's effect follows its length, not its speed.
export const REF_DRAG_DIST = 48.0;
export const MAX_SUBSTEP = 8.0;

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
  const dist = (dx * dx + dy * dy) ** 0.5;
  if (dist < MIN_DRAG_DIST) return null;
  const n = Math.max(1, Math.ceil(dist / MAX_SUBSTEP)), scale = (dist / n) / REF_DRAG_DIST;
  for (let k = 0; k < n; k++) {
    const ax = last[0] + dx * k / n, ay = last[1] + dy * k / n;               // sub-step start
    const bx = last[0] + dx * (k + 1) / n, by = last[1] + dy * (k + 1) / n;   // sub-step end
    if (tool === 'blow') {
      engine.addBlow(ax, ay, blowStrength * 0.7 * scale, blowStrength * 2);
    } else if (tool === 'vortex') {
      const cx = engine.width / 2, cy = engine.height / 2;
      const cross = dx * (by - cy) - dy * (bx - cx);
      engine.addVortex(bx, by, (cross > 0 ? 1 : -1) * 0.3 * (blowStrength / 40) * scale, blowStrength * 2.5);
    } else if (tool === 'comb') {
      engine.addStroke(ax, ay, Math.atan2(dy, dx), combStrength * 0.8 * scale, combStrength * 0.6);
    }
  }
  return true;
}
