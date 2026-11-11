"""pyproject.toml must name a build backend that exists, so `pip install .` works."""
import importlib
import tomllib
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


def test_build_backend_importable():
    pytest.importorskip("setuptools")
    backend = tomllib.loads((ROOT / "pyproject.toml").read_text())["build-system"]["build-backend"]
    module, _, attr = backend.partition(":")
    obj = importlib.import_module(module)
    for part in filter(None, attr.split(".")):
        obj = getattr(obj, part)
    assert hasattr(obj, "build_wheel"), backend
