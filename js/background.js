(function (PAS) {

/* Scrolling background (see .scrolling-bg in css/background.css).
   Sets --bg-width (one tile's width at the current height) and pauses the
   animation while any panel other than the hero is showing. */
const originalWidth = 3149;
const originalHeight = 1261;

function updateBackgroundWidth() {
  const displayedWidth = originalWidth * window.innerHeight / originalHeight;
  document.documentElement.style.setProperty("--bg-width", `${displayedWidth}px`);
}

updateBackgroundWidth();
let resizeRaf = 0;
window.addEventListener("resize", () => {
  if (resizeRaf) return;
  resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; updateBackgroundWidth(); });
});

document.addEventListener("panel-enter", (e) => {
  const bg = document.querySelector(".scrolling-bg");
  if (bg && e.detail) bg.classList.toggle("is-paused", e.detail.index !== 0);
});


})(window.PAS = window.PAS || {});
