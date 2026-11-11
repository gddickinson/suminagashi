"""Write tests/fixtures/marble_reference.json: operation lists and renders from the real Python presets, tools and
engine that the node test (suminagashi/web/static/marble_engine.test.mjs) compares the JavaScript port against.

Run after changing engine.py, presets.py, tool_ops.py, palettes.py, ui_specs.py or suminagashi/web/reference.py:
    python scripts/make_js_fixtures.py
tests/test_web.py fails if the committed fixture is out of date.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from suminagashi.web.reference import fixture  # noqa: E402

FIXTURE = ROOT / "tests" / "fixtures" / "marble_reference.json"


def dumps(data) -> str:
    return json.dumps(data, separators=(",", ":"), sort_keys=True, ensure_ascii=False)


def main():
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text(dumps(fixture()))
    print(f"wrote {FIXTURE} ({FIXTURE.stat().st_size / 1e3:.0f} kB)")


if __name__ == "__main__":
    main()
