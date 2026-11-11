"""
Qt-free user-interface specifications shared by the desktop app and the web interface.

The desktop control panel (``controls.py``), canvas (``canvas.py``) and main window (``main_window.py``) build their
tool list, parameter sliders, preset buttons and canvas-size menu from these tables, and the web API
(``suminagashi.web.app``) serves the same tables, so both front ends offer identical tools and defaults.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Dict, List, Tuple


@dataclass(frozen=True)
class SliderSpec:
    """An integer parameter slider: label, range, default and value suffix."""
    key: str
    label: str
    min_val: int
    max_val: int
    initial: int
    suffix: str = ""


# Tool keys match MarblingCanvas.TOOL_* (canvas.py).
TOOLS: List[Tuple[str, str, str]] = [
    # (key, short name, control-panel description)
    ("drop", "Drop", "Drop — single ink drop"),
    ("ring", "Rings", "Rings — concentric drops"),
    ("blow", "Blow", "Blow — radial push (drag)"),
    ("vortex", "Swirl", "Swirl — vortex (drag)"),
    ("comb", "Comb", "Comb — tine stroke (drag)"),
]

# Tools that act on a click; the others act while dragging.
CLICK_TOOLS = ("drop", "ring")

SLIDERS: List[SliderSpec] = [
    SliderSpec("drop_radius", "Drop Radius", 3, 80, 30, " px"),
    SliderSpec("ring_count", "Ring Count", 3, 40, 10),
    SliderSpec("ring_spacing", "Ring Spacing", 3, 40, 12, " px"),
    SliderSpec("blow_strength", "Strength", 5, 120, 40),
    SliderSpec("comb_strength", "Comb Width", 10, 150, 60, " px"),
]
SLIDER_BY_KEY: Dict[str, SliderSpec] = {s.key: s for s in SLIDERS}

# Which sliders the control panel shows for each tool (ControlPanel._on_tool_changed).
TOOL_SLIDERS: Dict[str, List[str]] = {
    "drop": ["drop_radius"],
    "ring": ["ring_count", "ring_spacing"],  # Ring Spacing is the radius of each ring drop
    "blow": ["blow_strength"],
    "vortex": ["blow_strength"],
    "comb": ["comb_strength"],
}

PRESET_LABELS: Dict[str, str] = {
    "concentric": "Concentric",
    "scattered": "Scattered",
    "blown": "Wind-Blown",
    "combed": "Combed",
    "vortex_rings": "Vortex Rings",
    "stone": "Stone",
}

DEFAULT_CANVAS_SIZE: Tuple[int, int] = (600, 600)

CANVAS_SIZES: List[Tuple[str, int, int]] = [
    ("Small (400×400)", 400, 400),
    ("Medium (600×600)", 600, 600),
    ("Large (800×800)", 800, 800),
    ("Wide (900×600)", 900, 600),
    ("Tall (600×900)", 600, 900),
]


def slider_default(key: str) -> int:
    """Initial value of slider *key*."""
    return SLIDER_BY_KEY[key].initial


def specs_as_dicts() -> List[dict]:
    """The slider specs as plain dicts (for the web API)."""
    return [asdict(s) for s in SLIDERS]
