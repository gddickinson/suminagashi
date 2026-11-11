# Suminagashi Marbling Simulator

Physics-based Japanese ink marbling using PyQt5 and numpy.

## Orientation
@INTERFACE.md

## Running
```bash
python run_suminagashi.py
# or
python -m suminagashi
# or with options
python -m suminagashi -W 800 -H 800 --palette indigo --preset concentric
```

## Testing
```bash
python -m pytest tests/ -v
```

## Web interface
```bash
pip install -r requirements-web.txt
python run_web.py                  # http://127.0.0.1:8137
python scripts/build_static.py     # static GitHub Pages site -> site/
python scripts/make_js_fixtures.py # after changing engine/presets/tool_ops/palettes/ui_specs
```
The JS port in `suminagashi/web/static/` must stay in step with `engine.py`, `presets.py` and `tool_ops.py`
(node test against `tests/fixtures/marble_reference.json`). Progress log: SESSION_LOG.md.

