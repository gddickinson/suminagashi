"""Desktop GUI checks (offscreen Qt). Skipped where PyQt5 is not installed (e.g. the Pages CI job)."""
import os

import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
QtWidgets = pytest.importorskip("PyQt5.QtWidgets")


@pytest.fixture(scope="module")
def qapp():
    return QtWidgets.QApplication.instance() or QtWidgets.QApplication([])


def test_starts_with_default_palette(qapp):
    """The window opens with palettes.DEFAULT_PALETTE (water and inks), not the alphabetically first palette."""
    from suminagashi.main_window import MainWindow
    from suminagashi.palettes import DEFAULT_PALETTE, PALETTES
    w = MainWindow(200, 200)
    pal = PALETTES[DEFAULT_PALETTE]
    assert w.controls._palette_combo.currentData() == DEFAULT_PALETTE
    assert tuple(int(v) for v in w.engine.water_color) == pal.water
    assert w.canvas.ink_colors == list(pal.colors)
    w.close()
