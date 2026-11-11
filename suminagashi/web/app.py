"""FastAPI web app for the Suminagashi Marbling Simulator: serves the front end in static/ and the JSON API under /api.

Run with `python run_web.py` (http://127.0.0.1:8137, local only). `scripts/build_static.py` exports every path in
STATIC_ENDPOINTS to JSON for the GitHub Pages site, so keep that list in step with the GET routes below.

Everything served here is read from the Python package (palettes.py, presets.py, ui_specs.py, engine.py), so the web
studio and the desktop app share one set of palettes, presets, tools and slider defaults. POST /api/render (local
app only) renders an operation list with the real numpy engine.
"""
import time
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .. import __doc__ as PKG_DOC
from .. import __version__
from .. import presets as P
from .. import ui_specs as U
from ..engine import MarblingEngine, OpType
from ..palettes import DEFAULT_PALETTE, PALETTES
from ..tool_ops import MIN_DRAG_DIST
from .reference import CASE_BY_NAME, CASES, encode_rgb, run_case

STATIC = Path(__file__).resolve().parent / "static"

app = FastAPI(title="Suminagashi Marbling Simulator")
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")


def _summary() -> str:
    paras = [" ".join(p.split()) for p in (PKG_DOC or "").split("\n\n")]
    return paras[1] if len(paras) > 1 else ""


@app.get("/api/info")
def info():
    """Project summary and counts for the home page."""
    return {
        "title": "Suminagashi Marbling Simulator", "version": __version__, "summary": _summary(),
        "palettes": len(PALETTES), "presets": len(P.PRESETS), "tools": len(U.TOOLS), "op_types": len(OpType),
        "canvas_sizes": len(U.CANVAS_SIZES),
    }


@app.get("/api/palettes")
def palettes():
    """The built-in palettes (water colour + cycling ink colours)."""
    return {"default": DEFAULT_PALETTE, "palettes": [
        {"key": k, "name": p.name, "water": list(p.water), "colors": [list(c) for c in p.colors]}
        for k, p in PALETTES.items()]}


@app.get("/api/presets")
def presets():
    """The preset patterns: key, button label and the description from presets.py."""
    return [{"key": k, "label": U.PRESET_LABELS.get(k, k.title()), "doc": " ".join((fn.__doc__ or "").split())}
            for k, fn in P.PRESETS.items()]


@app.get("/api/ui")
def ui():
    """Tools, parameter sliders (and which tool shows which), canvas sizes: shared with the desktop panel."""
    return {
        "tools": [{"key": k, "name": n, "desc": d, "drag": k not in U.CLICK_TOOLS} for k, n, d in U.TOOLS],
        "sliders": U.specs_as_dicts(), "tool_sliders": U.TOOL_SLIDERS,
        "canvas_sizes": [{"label": lab, "w": w, "h": h} for lab, w, h in U.CANVAS_SIZES],
        "default_size": list(U.DEFAULT_CANVAS_SIZE), "min_drag": MIN_DRAG_DIST,
    }


@app.get("/api/reference")
def reference_list():
    """Names of the seeded reference runs."""
    return [{k: c[k] for k in ("name", "kind", "palette", "seed", "width", "height")} for c in CASES]


@app.get("/api/reference/{name}")
def reference(name: str):
    """A seeded run of the Python presets/tools and renderer (operation list + image) for the Verify page."""
    if name not in CASE_BY_NAME:
        raise HTTPException(404, f"unknown reference run {name!r}")
    return run_case(CASE_BY_NAME[name])


class OpIn(BaseModel):
    op_type: str
    cx: float = 0.0
    cy: float = 0.0
    radius: float = 10.0
    color: List[int] = Field(default_factory=lambda: [0, 0, 0])
    angle: float = 0.0
    strength: float = 0.0
    width: float = 30.0


class RenderIn(BaseModel):
    width: int = Field(600, ge=1, le=1200)
    height: int = Field(600, ge=1, le=1200)
    water: Optional[List[int]] = None
    ops: List[OpIn] = Field(default_factory=list, max_length=5000)


@app.post("/api/render")
def render(req: RenderIn):
    """Render an operation list with the real numpy MarblingEngine (local app only)."""
    eng = MarblingEngine(req.width, req.height, **({"water_color": tuple(req.water)} if req.water else {}))
    for o in req.ops:
        if o.op_type == "DROP":
            eng.add_drop(o.cx, o.cy, o.radius, tuple(o.color))
        elif o.op_type == "STROKE":
            eng.add_stroke(o.cx, o.cy, o.angle, o.strength, o.width)
        elif o.op_type == "BLOW":
            eng.add_blow(o.cx, o.cy, o.strength, o.radius)
        elif o.op_type == "VORTEX":
            eng.add_vortex(o.cx, o.cy, o.strength, o.radius)
        else:
            raise HTTPException(422, f"unknown op_type {o.op_type!r}")
    t0 = time.perf_counter()
    img = eng.render()
    return {"w": req.width, "h": req.height, "ops": eng.op_count, "seconds": time.perf_counter() - t0,
            "rgb_z": encode_rgb(img)}


# GET paths (without the /api prefix) written to the static site as api/<path>.json.
STATIC_ENDPOINTS = ["/info", "/palettes", "/presets", "/ui", "/reference"] + [f"/reference/{c['name']}" for c in CASES]
