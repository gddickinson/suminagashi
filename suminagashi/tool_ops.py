"""
Qt-free tool logic: how a click or a drag step of each canvas tool becomes engine operations.

Factored out of ``canvas.py`` (MarblingCanvas.mousePressEvent / mouseMoveEvent), so the desktop canvas and
the web port (``web/static/marble_tools.js``, node-tested against this module) share one definition.
"""

from __future__ import annotations

import math
from typing import Optional, Sequence, Tuple

import numpy as np

from .engine import MarblingEngine

# A drag step shorter than this (engine pixels) adds no operation.
MIN_DRAG_DIST = 3.0

# Drag strengths are per REF_DRAG_DIST pixels of drag: each operation is scaled by (distance moved / REF_DRAG_DIST),
# so the total displacement follows the drag length, not the mouse-event rate. At the default Comb Width (60) a comb
# moves ink at the tine by about the distance dragged (0.8 * 60 = 48).
REF_DRAG_DIST = 48.0

# Longer moves are split into equal sub-steps of at most this length, so a fast drag (few, long mouse events)
# gives about the same pattern as a slow one.
MAX_SUBSTEP = 8.0

Color = Tuple[int, int, int]


def add_rings(
    engine: MarblingEngine,
    x: float,
    y: float,
    colors: Sequence[Color],
    count: int,
    spacing: float,
    rng=None,
) -> None:
    """Rings tool: *count* drops of radius ``spacing ± 2`` jittered ±2 px around (x, y), cycling *colors*."""
    if rng is None:
        rng = np.random.default_rng()
    for i in range(count):
        c = colors[i % len(colors)]
        r = spacing + rng.uniform(-2, 2)
        dx = rng.uniform(-2, 2)
        dy = rng.uniform(-2, 2)
        engine.add_drop(x + dx, y + dy, r, c)


def drag_step(
    engine: MarblingEngine,
    tool: str,
    last: Tuple[float, float],
    pos: Tuple[float, float],
    blow_strength: float,
    comb_strength: float,
) -> Optional[bool]:
    """Apply one drag step of a drag tool from *last* to *pos* (engine coordinates).

    Returns None when the step is shorter than MIN_DRAG_DIST (the caller keeps *last*), else True.
    """
    dx = pos[0] - last[0]
    dy = pos[1] - last[1]
    dist = (dx * dx + dy * dy) ** 0.5
    if dist < MIN_DRAG_DIST:
        return None

    n = max(1, math.ceil(dist / MAX_SUBSTEP))
    scale = (dist / n) / REF_DRAG_DIST
    for k in range(n):
        ax, ay = last[0] + dx * k / n, last[1] + dy * k / n              # sub-step start
        bx, by = last[0] + dx * (k + 1) / n, last[1] + dy * (k + 1) / n  # sub-step end
        if tool == "blow":
            engine.add_blow(ax, ay, blow_strength * 0.7 * scale, blow_strength * 2)
        elif tool == "vortex":
            cx = engine.width / 2
            cy = engine.height / 2
            cross = dx * (by - cy) - dy * (bx - cx)
            sign = 1.0 if cross > 0 else -1.0
            engine.add_vortex(bx, by, sign * 0.3 * (blow_strength / 40.0) * scale, blow_strength * 2.5)
        elif tool == "comb":
            angle = math.atan2(dy, dx)
            engine.add_stroke(ax, ay, angle, comb_strength * 0.8 * scale, comb_strength * 0.6)
    return True
