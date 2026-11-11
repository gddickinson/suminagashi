# Suminagashi Marbling Simulator -- Interface Map

## Package: `suminagashi/`
| File | Purpose | Key Classes/Functions |
|---|---|---|
| `__init__.py` | Package metadata (`__version__`) | |
| `__main__.py` | `python -m suminagashi` entry | |
| `app.py` | CLI argument parsing & Qt launch | `main()`, `_parse_args()` |
| `engine.py` | Numpy-vectorised marbling physics | `MarblingEngine`, `Operation`, `OpType` |
| `tool_ops.py` | Qt-free tool logic: Rings click and Blow/Swirl/Comb drag steps (used by `canvas.py` and ported to JS) | `add_rings()`, `drag_step()`, `MIN_DRAG_DIST` |
| `ui_specs.py` | Qt-free UI tables shared by the desktop panel and the web API: tools, sliders, preset labels, canvas sizes | `TOOLS`, `SLIDERS`, `TOOL_SLIDERS`, `PRESET_LABELS`, `CANVAS_SIZES` |
| `canvas.py` | Qt render thread & display widget | `MarblingCanvas`, `RenderThread` |
| `controls.py` | Control panel (tools, palette, presets) | `ControlPanel`, `LabelledSlider` |
| `main_window.py` | Top-level Qt window composition | `MainWindow` |
| `palettes.py` | Colour palette definitions (10 palettes) | `PALETTES`, `get_palette()`, `list_palettes()` |
| `presets.py` | Preset patterns (6 presets) | `PRESETS`, `apply_preset()`, `list_presets()` |

## Web: `suminagashi/web/` (no Qt imports)
| File | Purpose | Key names |
|---|---|---|
| `app.py` | FastAPI app: serves `static/`, JSON API under `/api` (`/info`, `/palettes`, `/presets`, `/ui`, `/reference`, `/reference/{name}`, POST `/render`) | `app`, `STATIC`, `STATIC_ENDPOINTS` |
| `reference.py` | Seeded runs of the real presets/tools/renderer with a mulberry32 stream patched into `np.random.default_rng` (same stream as JS); Verify page + node fixture | `Mulberry32Rng`, `seeded_numpy()`, `CASES`, `run_case()`, `fixture()` |
| `static/index.html`, `style.css` (kit), `style_app.css` | Shell, shared dark neon theme, indigo/vermilion accent + page styles | — |
| `static/core.js` (kit) | Hash router, `api()`, `slider()`, `animate()`, `rng()` (mulberry32) | — |
| `static/main.js`, `static_api.js` | Lazy page registry; static-site API (reads exported JSON) | `staticApi()` |
| `static/marble_engine.js` | JS port of `engine.py` (same op objects; render at any stride) | `MarblingEngine` |
| `static/marble_presets.js` | JS port of `presets.py` | `PRESETS`, `applyPreset()` |
| `static/marble_tools.js` | JS port of `tool_ops.py` | `addRings()`, `dragStep()` |
| `static/marble_reference.js` | Replays a reference case in JS and compares with Python | `runCase()`, `compareOps()`, `compareImages()`, `inflate()` |
| `static/render_pool.js`, `marble_worker.js` | Parallel rendering in module workers (row bands) | `RenderPool` |
| `static/studio_state.js` | Studio state (port of the canvas tool state + palette/preset slots) | `Studio` |
| `static/marble_view.js` | Canvas display, pointer/keyboard input, preview while dragging, PNG export | `MarbleView` |
| `static/studio_panel.js` | Control panel DOM (port of `controls.py`) | `buildPanel()`, `swatches()` |
| `static/home.js`, `studio.js`, `gallery.js`, `verify.js`, `about.js` | Pages `#/`, `#/studio`, `#/presets`, `#/verify`, `#/about` | `loadData()` (studio.js) |
| `static/marble_engine.test.mjs` | Node test of the JS port against `tests/fixtures/marble_reference.json` | — |

## Entry Points
| File | Purpose |
|---|---|
| `run_suminagashi.py` | Simple launch script (desktop) |
| `suminagashi/app.py` | Full CLI with argparse |
| `run_web.py` | Web app on http://127.0.0.1:8137 |
| `scripts/build_static.py` | Export the static GitHub Pages site to `site/` |
| `scripts/screenshots.py` | Playwright smoke test (`--static` / `--base`) and README images (`--shots` → `docs/img/`) |
| `scripts/make_js_fixtures.py` | Regenerate `tests/fixtures/marble_reference.json` from the Python code |
| `.github/workflows/pages.yml` | Test, build and publish the static site on push to `main` |

## Tests
| File | Purpose |
|---|---|
| `tests/test_engine.py` | Engine unit tests (drop transform, stroke, blow, vortex, render) |
| `tests/test_gui.py` | Offscreen Qt: default palette at start-up, Rings tool sliders (skipped without PyQt5) |
| `tests/test_ui_specs.py` | Each tool shows exactly the sliders it uses |
| `tests/test_packaging.py` | pyproject build backend is importable |
| `tests/test_web.py` | Every API endpoint, static build, UI/palettes/presets from the package, `/render` = engine, fixture up to date, runs the node test |

## Archive
| File | Purpose |
|---|---|
| `_archive/suminagashi_marbling.py` | Original monolith (superseded) |
| `_archive/suminagashi.jsx` | Abandoned JavaScript port |

## Module Dependencies
```
app.py  -->  main_window.py  -->  canvas.py   -->  engine.py, tool_ops.py, ui_specs.py
                              -->  controls.py -->  palettes.py, ui_specs.py
                                                -->  presets.py --> engine.py

Web: run_web.py --> web/app.py --> palettes, presets, ui_specs, engine, web/reference.py (presets, tool_ops)
     browser: studio.js --> Studio (marble_engine/presets/tools.js) --> MarbleView --> RenderPool (marble_worker.js)
     scripts/build_static.py --> site/ (static/ + api/*.json) --> GitHub Pages (static_api.js answers api())
```
