"""Desktop GUI checks (offscreen Qt). Skipped where PyQt5 is not installed (e.g. the Pages CI job)."""
import os

import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
QtWidgets = pytest.importorskip("PyQt5.QtWidgets")


@pytest.fixture(scope="module")
def qapp():
    return QtWidgets.QApplication.instance() or QtWidgets.QApplication([])


def _close(w, qapp):
    """Let the canvas's background render threads finish before the window goes away (avoids a Qt abort)."""
    import time
    t0 = time.time()
    while w.canvas._rendering and time.time() - t0 < 10:
        qapp.processEvents()
        time.sleep(0.01)
    if w.canvas._render_thread is not None:
        try:
            w.canvas._render_thread.wait(5000)
        except RuntimeError:  # already deleted by deleteLater
            pass
    w.close()


def test_starts_with_default_palette(qapp):
    """The window opens with palettes.DEFAULT_PALETTE (water and inks), not the alphabetically first palette."""
    from suminagashi.main_window import MainWindow
    from suminagashi.palettes import DEFAULT_PALETTE, PALETTES
    w = MainWindow(200, 200)
    pal = PALETTES[DEFAULT_PALETTE]
    assert w.controls._palette_combo.currentData() == DEFAULT_PALETTE
    assert tuple(int(v) for v in w.engine.water_color) == pal.water
    assert w.canvas.ink_colors == list(pal.colors)
    _close(w, qapp)


def test_rings_tool_hides_unused_drop_radius(qapp):
    """The Rings tool uses Ring Count and Ring Spacing (as the drop radius), not Drop Radius."""
    from suminagashi.main_window import MainWindow
    w = MainWindow(200, 200)
    ctl = w.controls
    ring = next(b for b in ctl._tool_group.buttons() if b.property("tool_key") == "ring")
    ring.click()
    shown = {k for k in ("drop_radius", "ring_count", "ring_spacing", "blow_strength", "comb_strength")
             if getattr(ctl, "_" + k).isVisibleTo(ctl)}
    assert shown == {"ring_count", "ring_spacing"}
    _close(w, qapp)
