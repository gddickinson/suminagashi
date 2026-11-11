"""Drag tools: the effect of a drag follows its length, not how many mouse-move events delivered it."""
import numpy as np
import pytest

from suminagashi.engine import MarblingEngine
from suminagashi.tool_ops import drag_step


def _drag(tool, start, end, steps, strength=40.0, comb=60.0):
    eng = MarblingEngine(400, 400, water_color=(255, 255, 255))
    for i, x in enumerate(range(60, 360, 25)):
        eng.add_drop(x, 200 + (i % 3) * 15 - 15, 14, (0, 0, 0) if i % 2 else (200, 30, 30))
    n0 = eng.op_count
    last = start
    for k in range(1, steps + 1):
        pos = (start[0] + (end[0] - start[0]) * k / steps, start[1] + (end[1] - start[1]) * k / steps)
        if drag_step(eng, tool, last, pos, strength, comb) is not None:
            last = pos
    return eng, eng.operations[n0:]


@pytest.mark.parametrize("tool", ["comb", "blow", "vortex"])
def test_drag_effect_independent_of_event_count(tool):
    start, end = (80.0, 130.0), (320.0, 230.0)  # passes beside the canvas centre (Swirl turns about it)
    fast, ops_fast = _drag(tool, start, end, steps=4)      # 4 events of ~65 px
    slow, ops_slow = _drag(tool, start, end, steps=80)     # 80 events of ~3.3 px
    # total strength applied is the same for both drags
    assert sum(o.strength for o in ops_fast) == pytest.approx(sum(o.strength for o in ops_slow), rel=0.02)
    a, b = fast.render(), slow.render()
    differ = np.any(a != b, axis=2).mean()
    assert differ < 0.03, f"{tool}: {differ:.1%} of pixels differ between a fast and a slow drag"


def test_comb_moves_ink_about_the_drag_length():
    """At the default Comb Width a comb displaces ink at the tine by about the distance dragged, not 16x it."""
    eng, ops = _drag("comb", (50.0, 200.0), (150.0, 200.0), steps=30)
    assert sum(o.strength for o in ops) == pytest.approx(100.0, rel=0.05)
