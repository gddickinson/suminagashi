"""
Qt-free tool logic: how a click or a drag step of each canvas tool becomes engine operations.

Factored out of ``canvas.py`` (MarblingCanvas.mousePressEvent / mouseMoveEvent) unchanged, so the desktop canvas and
the web port (``web/static/marble_tools.js``, node-tested against this module) share one definition.
"""

from __future__ import annotations

import math
from typing import Optional, Sequence, Tuple

import numpy as np

from .engine import MarblingEngine

# A drag step shorter than this (engine pixels) adds no operation.
MIN_DRAG_DIST = 3.0

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

    if tool == "blow":
        engine.add_blow(last[0], last[1], blow_strength * 0.7, blow_strength * 2)
    elif tool == "vortex":
        cx = engine.width / 2
        cy = engine.height / 2
        cross = dx * (pos[1] - cy) - dy * (pos[0] - cx)
        sign = 1.0 if cross > 0 else -1.0
        engine.add_vortex(pos[0], pos[1], sign * 0.3 * (blow_strength / 40.0), blow_strength * 2.5)
    elif tool == "comb":
        angle = math.atan2(dy, dx)
        engine.add_stroke(last[0], last[1], angle, comb_strength * 0.8, comb_strength * 0.6)
    return True
