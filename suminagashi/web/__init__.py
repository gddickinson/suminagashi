"""Web interface for the Suminagashi Marbling Simulator (FastAPI + plain ES-module front end).

Contents:
  app.py        FastAPI app: serves static/ and the JSON API under /api (STATIC_ENDPOINTS for the Pages build)
  reference.py  seeded reference runs of the real presets, tools and renderer (Verify page, JS test fixture)
  static/       front end: pages and the JS port of the engine (marble_engine.js), presets and tools

Run: python run_web.py  ->  http://127.0.0.1:8137
"""
