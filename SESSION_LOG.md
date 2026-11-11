# Session log

## 2026-11-11: web interface and static GitHub Pages site (branch `web-interface`)

- Added `suminagashi/web/`: FastAPI app (`run_web.py`, port 8137) and a plain ES-module front end built from the
  shared web kit. The static site (`scripts/build_static.py`, `.github/workflows/pages.yml`) is the full simulator:
  a JavaScript port of `engine.py` (`marble_engine.js`), `presets.py` (`marble_presets.js`) and the canvas tools
  (`marble_tools.js`), rendered in parallel module workers, with PNG export (1× and 2×).
- Pages: Home, Studio, Presets, Verify (Python vs JS), About.
- Factored Qt-free modules out of the GUI, which now imports them back (behaviour unchanged, checked offscreen by
  driving clicks/drags for every tool before and after): `ui_specs.py` (tools, sliders, preset labels, canvas sizes)
  and `tool_ops.py` (Rings click, Blow/Swirl/Comb drag steps).
- JS vs Python: `web/reference.py` patches a mulberry32 stream (same as `core.js rng()`) into
  `np.random.default_rng` and runs the six presets plus a scripted tool session; the JS port builds identical
  operation lists (max field difference 0) and pixel-identical renders (0 of 40 000 sampled pixels differ in every
  case). Fixture `tests/fixtures/marble_reference.json` (`scripts/make_js_fixtures.py`), node test
  `marble_engine.test.mjs`, run from `tests/test_web.py`.
- Local app only: "Render with Python" in the studio (`POST /api/render`) renders the studio's operation list with
  the numpy engine and reports the pixel difference (0 in testing).
- Web-only conveniences (not in the desktop app): "Undo stroke" (removes a whole click or drag), 2× PNG export,
  keyboard drawing on the focused canvas.
