(function (PAS) {

/* ===========================================================
   FLIPBOOK RESPONSIVE SCALE
   turn.js's init() reads this.width()/this.height() once and burns
   them into fixed inline CSS on .sj-book; its drag/flip math uses
   e.pageX/e.pageY minus .offset(), measured in that same (already
   scaled) coordinate space. So resizing the book via CSS `zoom` on
   the #canvas wrapper keeps the drag math correct — `transform:
   scale()` would not, since it doesn't affect layout/offset values
   the way `zoom` does.
=========================================================== */
const FLIPBOOK_NATIVE_WIDTH = 1420;

function updateFlipbookScale() {
  const scaleWrap = document.querySelector(".flipbook-scale");
  const canvas = document.getElementById("canvas");
  if (!scaleWrap || !canvas) return;

  const availableWidth = scaleWrap.clientWidth;
  if (!availableWidth) return;

  const ratio = availableWidth / FLIPBOOK_NATIVE_WIDTH;

  canvas.style.zoom = ratio;
  // turn.js's own coordinate math (this.width()/this.height()) reads the
  // book's *declared* CSS size (1420x520), not the zoomed rendered size —
  // but its pointer-tracking code reads real, already-zoomed screen pixels
  // via offset()/pageX. Without normalizing, corner-detection and drag
  // tracking only line up when ratio is exactly 1. turn.js (patched) reads
  // this global to convert pointer deltas back into the book's own,
  // unscaled coordinate space.
  window.__flipbookScale = ratio;
}

let scaleRaf = 0;
function scheduleFlipbookScale() {
  if (scaleRaf) return;
  scaleRaf = requestAnimationFrame(() => { scaleRaf = 0; updateFlipbookScale(); });
}

function initFlipbookScale() {
  updateFlipbookScale();

  window.addEventListener("resize", scheduleFlipbookScale);
  window.addEventListener("orientationchange", scheduleFlipbookScale);
  window.addEventListener("load", updateFlipbookScale);
  document.addEventListener("loading-complete", scheduleFlipbookScale);

  const flipbookWrap = document.querySelector(".flipbook-wrap");
  if (flipbookWrap && "ResizeObserver" in window) {
    new ResizeObserver(scheduleFlipbookScale).observe(flipbookWrap);
  }
}

PAS.initFlipbookScale = initFlipbookScale;

})(window.PAS = window.PAS || {});
