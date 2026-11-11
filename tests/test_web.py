"""Web interface tests: every exported endpoint answers, the static build is complete, and the JS engine tests pass.

Run: python -m pytest -q tests/test_web.py
"""
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from suminagashi.web.app import STATIC, STATIC_ENDPOINTS, app  # noqa: E402

client = TestClient(app)


def test_index_served():
    r = client.get("/")
    assert r.status_code == 200 and "static/main.js" in r.text


@pytest.mark.parametrize("path", STATIC_ENDPOINTS)
def test_endpoint(path):
    r = client.get("/api" + path)
    assert r.status_code == 200, r.text
    assert r.json() is not None


def test_static_build(tmp_path):
    sys.path.insert(0, str(ROOT / "scripts"))
    import build_static
    build_static.build(tmp_path / "site")
    assert (tmp_path / "site" / "index.html").read_text().count("APP_STATIC") == 1
    for path in STATIC_ENDPOINTS:
        assert (tmp_path / "site" / "api" / (path.strip("/") + ".json")).exists()


def test_static_assets_referenced_exist():
    html = (STATIC / "index.html").read_text()
    for name in ("style.css", "main.js"):
        assert f"static/{name}" in html and (STATIC / name).exists()


@pytest.mark.skipif(not shutil.which("node"), reason="node not installed")
def test_js_engine():
    tests = sorted(STATIC.glob("*.test.mjs"))
    for t in tests:
        r = subprocess.run(["node", str(t)], capture_output=True, text=True)
        assert r.returncode == 0, r.stdout + r.stderr


# --- Suminagashi specific -----------------------------------------------------------------------------------------
def test_ui_and_palettes_come_from_python_package():
    from suminagashi import ui_specs as U
    from suminagashi.palettes import PALETTES
    from suminagashi.presets import PRESETS
    ui = client.get("/api/ui").json()
    assert [t["key"] for t in ui["tools"]] == [t[0] for t in U.TOOLS]
    assert [s["key"] for s in ui["sliders"]] == [s.key for s in U.SLIDERS]
    for s in ui["sliders"]:
        assert s["min_val"] <= s["initial"] <= s["max_val"], s
    pals = client.get("/api/palettes").json()
    assert {p["key"] for p in pals["palettes"]} == set(PALETTES) and pals["default"] in PALETTES
    assert [p["key"] for p in client.get("/api/presets").json()] == list(PRESETS)
    info = client.get("/api/info").json()
    assert (info["palettes"], info["presets"], info["tools"]) == (len(PALETTES), len(PRESETS), len(U.TOOLS))


def test_reference_runs():
    names = [c["name"] for c in client.get("/api/reference").json()]
    r = client.get(f"/api/reference/{names[0]}").json()
    assert r["ops"] and r["image"]["w"] > 0
    assert client.get("/api/reference/nope").status_code == 404


def test_render_endpoint_matches_engine():
    import base64
    import zlib

    import numpy as np

    from suminagashi.engine import MarblingEngine
    ops = [{"op_type": "DROP", "cx": 30, "cy": 25, "radius": 12, "color": [200, 10, 10]},
           {"op_type": "STROKE", "cx": 30, "cy": 25, "angle": 0.4, "strength": 8, "width": 6},
           {"op_type": "BLOW", "cx": 20, "cy": 20, "strength": 5, "radius": 10},
           {"op_type": "VORTEX", "cx": 35, "cy": 30, "strength": 0.6, "radius": 15}]
    r = client.post("/api/render", json={"width": 60, "height": 50, "water": [1, 2, 3], "ops": ops}).json()
    img = np.frombuffer(zlib.decompress(base64.b64decode(r["rgb_z"])), np.uint8).reshape(50, 60, 3)
    eng = MarblingEngine(60, 50, water_color=(1, 2, 3))
    eng.add_drop(30, 25, 12, (200, 10, 10))
    eng.add_stroke(30, 25, 0.4, 8, 6)
    eng.add_blow(20, 20, 5, 10)
    eng.add_vortex(35, 30, 0.6, 15)
    assert r["ops"] == 4 and np.array_equal(img, eng.render())
    assert client.post("/api/render", json={"ops": [{"op_type": "NOPE"}]}).status_code == 422


def test_seeded_numpy_restores_default_rng():
    import numpy as np

    from suminagashi.web.reference import CASES, build_case
    before = np.random.default_rng
    build_case(CASES[0])
    assert np.random.default_rng is before


def _close(a, b, path="$"):
    """Recursive comparison allowing last-digit float differences between platforms (libm) and a few image pixels."""
    import base64
    import zlib
    if isinstance(a, dict):
        assert a.keys() == b.keys(), path
        for k in a:
            if k == "rgb_z":
                x, y = (zlib.decompress(base64.b64decode(v)) for v in (a[k], b[k]))
                px = [i for i in range(0, len(x), 3) if x[i:i + 3] != y[i:i + 3]]
                assert len(x) == len(y) and len(px) <= len(x) / 3 * 1e-3, path
            else:
                _close(a[k], b[k], f"{path}.{k}")
    elif isinstance(a, (list, tuple)):
        assert len(a) == len(b), path
        for i, (x, y) in enumerate(zip(a, b)):
            _close(x, y, f"{path}[{i}]")
    elif isinstance(a, float) or isinstance(b, float):
        assert abs(a - b) <= 1e-9 * max(1.0, abs(a)), (path, a, b)
    else:
        assert a == b, (path, a, b)


def test_js_fixture_is_current():
    """tests/fixtures/marble_reference.json must match a fresh run of the Python code (scripts/make_js_fixtures.py)."""
    import json
    sys.path.insert(0, str(ROOT / "scripts"))
    import make_js_fixtures
    from suminagashi.web.reference import fixture
    _close(json.loads(make_js_fixtures.FIXTURE.read_text()), json.loads(make_js_fixtures.dumps(fixture())))
