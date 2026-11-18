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
const FLIPBOOK_NATIVE_HEIGHT = 520;

function updateFlipbookScale() {
  const scaleWrap = document.querySelector(".flipbook-scale");
  const canvas = document.getElementById("canvas");
  if (!scaleWrap || !canvas) return;

  const availableWidth = scaleWrap.clientWidth;
  if (!availableWidth) return;

  const ratio = Math.min(1, availableWidth / FLIPBOOK_NATIVE_WIDTH);

  // transform: scale() instead of CSS zoom. The book keeps its native
  // 1420x520 layout (whole pixels everywhere) and is scaled afterwards, so
  // text is rendered the same way before and during a page peel.
  canvas.style.zoom = "";
  canvas.style.transformOrigin = "0 0";
  canvas.style.transform = "scale(" + ratio + ")";

  // A transform doesn't change layout, so reserve the scaled height ourselves.
  scaleWrap.style.height = Math.round(FLIPBOOK_NATIVE_HEIGHT * ratio) + "px";

  // turn.js (patched) divides pointer coordinates by this value.
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