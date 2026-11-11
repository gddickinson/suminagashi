"""ui_specs.py: every slider shown for a tool is one that tool uses (tool_ops.py / MarblingCanvas)."""
from suminagashi.ui_specs import SLIDER_BY_KEY, TOOL_SLIDERS, TOOLS

# The parameters each tool reads (canvas.py mousePressEvent / tool_ops.drag_step).
USED = {
    "drop": {"drop_radius"},
    "ring": {"ring_count", "ring_spacing"},
    "blow": {"blow_strength"},
    "vortex": {"blow_strength"},
    "comb": {"comb_strength"},
}


def test_each_tool_shows_exactly_the_sliders_it_uses():
    assert set(TOOL_SLIDERS) == {t[0] for t in TOOLS}
    for tool, keys in TOOL_SLIDERS.items():
        assert set(keys) <= set(SLIDER_BY_KEY)
        assert set(keys) == USED[tool], tool
