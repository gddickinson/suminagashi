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

### Bugs found in the existing code and fixed (own commits, regression test written first and seen failing)
- `pyproject.toml` named a non-existent build backend (`setuptools.backends._legacy:_Backend`), so `pip install .`
  failed; now `setuptools.build_meta` (`tests/test_packaging.py`).
- The desktop app opened with "Autumn Leaves" (first palette alphabetically) instead of `DEFAULT_PALETTE`
  ("traditional"); `--preset` without `--palette` then drew Traditional inks on Autumn water. Fixed in
  `controls.py`/`app.py` (`tests/test_gui.py`).
- The Rings tool showed a Drop Radius slider it never reads; now hidden (`ui_specs.TOOL_SLIDERS`;
  `tests/test_ui_specs.py`, `tests/test_gui.py`). The web panel's workaround was removed.
- Docs: README project tree and ROADMAP "Current State" corrected.

### Left for George (not changed)
- Blow, Swirl and Comb add one operation per mouse-move step of >= 3 px, each with the full strength (e.g. comb
  0.8 x Comb Width = 48 px), so the displacement of a drag depends on how many move events arrive, and a fast
  diagonal comb drag can push ink off the canvas. Scaling by distance moved would change the look of every drag.
- The inverse stroke/blow/vortex used for rendering subtract the displacement evaluated at the traced point, an
  approximation of the exact inverse (the drop inverse is exact).
- `canvas.py` stretches the render to the widget (`_canvas_pos` comment says "maintain aspect ratio" but it does
  not), so a Wide/Tall canvas appears distorted when the window has a different aspect ratio.
- `pyproject.toml` pins `numpy<2.0`; the code and tests run unchanged on numpy 2.5.4 (used by the web requirements).
- The cursor preview ring shows the Drop Radius for every tool, including Rings, Blow, Swirl and Comb.
