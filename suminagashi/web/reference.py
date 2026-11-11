"""Reference runs of the real Python engine, presets and tools, for checking the JavaScript port.

The presets and the Rings tool draw random numbers through ``np.random.default_rng().uniform(lo, hi)``.  Here
``default_rng`` is temporarily swapped for `Mulberry32Rng`, a Python copy of the seeded mulberry32 generator in
``static/core.js`` (``rng()``), so the JS port given the same seed consumes the identical random stream and should
build the same operation list.  Everything else (``presets.py``, ``tool_ops.py``, ``MarblingEngine.render``) is the
unmodified package code.

Used by the web API (``/api/reference``, the Verify page) and by ``scripts/make_js_fixtures.py`` (node test fixture).
"""
from __future__ import annotations

import base64
import threading
import zlib
from contextlib import contextmanager
from dataclasses import asdict
from typing import Dict, List

import numpy as np

from ..engine import MarblingEngine, Operation
from ..palettes import PALETTES, get_palette
from ..presets import apply_preset
from ..tool_ops import add_rings, drag_step
from ..ui_specs import SLIDERS, slider_default

M32 = 0xFFFFFFFF
_PATCH_LOCK = threading.Lock()


def _imul(a: int, b: int) -> int:
    return (a * b) & M32


class Mulberry32Rng:
    """mulberry32, bit-for-bit the same as ``rng(seed)`` in static/core.js; offers numpy's ``uniform``."""

    def __init__(self, seed: int) -> None:
        self.a = seed & M32

    def random(self) -> float:
        self.a = (self.a + 0x6D2B79F5) & M32
        a = self.a
        t = _imul(a ^ (a >> 15), 1 | a)
        t = ((t + _imul(t ^ (t >> 7), 61 | t)) & M32) ^ t
        return ((t ^ (t >> 14)) & M32) / 4294967296.0

    def uniform(self, lo: float = 0.0, hi: float = 1.0) -> float:
        # numpy Generator.uniform: low + (high - low) * random()
        return lo + (hi - lo) * self.random()


@contextmanager
def seeded_numpy(seed: int):
    """Make every ``np.random.default_rng()`` call inside the block return one shared mulberry32 stream."""
    stream = Mulberry32Rng(seed)
    with _PATCH_LOCK:
        original = np.random.default_rng
        np.random.default_rng = lambda *a, **k: stream
        try:
            yield stream
        finally:
            np.random.default_rng = original


# A scripted desktop session for the "tools" case: clicks and drags (engine coordinates) with the slider values.
TOOL_SCRIPT: List[list] = [
    ["drop", 300, 300], ["drop", 250, 270], ["drop", 350, 330], ["ring", 300, 300],
    ["set", "ring_spacing", 18], ["ring", 160, 420],
    ["drag", "comb", [[60, 120], [120, 150], [121, 151], [200, 200], [280, 240], [360, 300], [470, 330]]],
    ["set", "blow_strength", 70],
    ["drag", "blow", [[420, 140], [430, 160], [450, 175], [470, 190]]],
    ["drag", "vortex", [[200, 420], [230, 400], [260, 395], [290, 410]]],
    ["set", "comb_strength", 30],
    ["drag", "comb", [[500, 560], [500, 500], [505, 420], [500, 330]]],
    ["drop", 120, 120],
]

CASES: List[dict] = [
    {"name": "concentric", "kind": "preset", "preset": "concentric", "palette": "traditional", "seed": 1},
    {"name": "scattered", "kind": "preset", "preset": "scattered", "palette": "indigo", "seed": 2},
    {"name": "blown", "kind": "preset", "preset": "blown", "palette": "autumn", "seed": 3},
    {"name": "combed", "kind": "preset", "preset": "combed", "palette": "ocean", "seed": 4},
    {"name": "vortex_rings", "kind": "preset", "preset": "vortex_rings", "palette": "twilight", "seed": 5},
    {"name": "stone", "kind": "preset", "preset": "stone", "palette": "earth", "seed": 6},
    {"name": "tools", "kind": "script", "script": TOOL_SCRIPT, "palette": "sakura", "seed": 7},
]
for _c in CASES:
    _c.update(width=600, height=600, stride=3)
CASE_BY_NAME: Dict[str, dict] = {c["name"]: c for c in CASES}


def op_dict(op: Operation) -> dict:
    d = asdict(op)
    d["op_type"] = op.op_type.name
    d["color"] = [int(v) for v in op.color]
    return {k: (float(v) if isinstance(v, (float, np.floating)) else v) for k, v in d.items()}


def _run_script(engine: MarblingEngine, script: List[list], colors: list) -> None:
    """Replays a session the way MarblingCanvas does (drop colours cycle; rings restart the palette)."""
    params = {s.key: float(s.initial) for s in SLIDERS}
    params["ring_count"] = slider_default("ring_count")
    color_index = 0
    for step in script:
        kind = step[0]
        if kind == "set":
            params[step[1]] = step[2]
        elif kind == "drop":
            engine.add_drop(step[1], step[2], float(params["drop_radius"]), colors[color_index % len(colors)])
            color_index += 1
        elif kind == "ring":
            add_rings(engine, step[1], step[2], colors, int(params["ring_count"]), float(params["ring_spacing"]))
        elif kind == "drag":
            tool, pts = step[1], step[2]
            last = tuple(pts[0])
            for p in pts[1:]:
                if drag_step(engine, tool, last, tuple(p), float(params["blow_strength"]),
                             float(params["comb_strength"])) is not None:
                    last = tuple(p)


def build_case(case: dict) -> MarblingEngine:
    """The engine holding the operation list of *case* (seeded mulberry32 stream)."""
    pal = get_palette(case["palette"])
    eng = MarblingEngine(case["width"], case["height"], water_color=pal.water)
    with seeded_numpy(case["seed"]):
        if case["kind"] == "preset":
            apply_preset(case["preset"], eng, pal)
        else:
            _run_script(eng, case["script"], pal.color_list)
    return eng


def encode_rgb(img: np.ndarray) -> str:
    """(H, W, 3) uint8 -> base64 of zlib-compressed RGB bytes."""
    return base64.b64encode(zlib.compress(np.ascontiguousarray(img).tobytes(), 9)).decode("ascii")


def run_case(case: dict) -> dict:
    """Operation list and the Python render (sampled every *stride* pixels) of *case*."""
    eng = build_case(case)
    s = case["stride"]
    img = eng.render()[::s, ::s]
    return {
        "case": case,
        "water": [int(v) for v in eng.water_color],
        "ops": [op_dict(o) for o in eng.operations],
        "image": {"w": int(img.shape[1]), "h": int(img.shape[0]), "stride": s, "rgb_z": encode_rgb(img)},
    }


def fixture() -> dict:
    """Everything the node tests compare against (written by scripts/make_js_fixtures.py)."""
    r = Mulberry32Rng(1)
    return {
        "mulberry32_seed1": [r.random() for _ in range(5)],
        "palettes": {k: {"name": p.name, "water": list(p.water), "colors": [list(c) for c in p.colors]}
                     for k, p in PALETTES.items()},
        "sliders": [asdict(s) for s in SLIDERS],
        "cases": [run_case(c) for c in CASES],
    }
