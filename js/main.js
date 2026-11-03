(function (PAS) {

/* Entry point: starts every homepage feature once the DOM is ready. */
function onReady(fn) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
  else fn();
}

onReady(() => {
  PAS.initFlipbookScale();
  PAS.initModuleCardSelection();
  PAS.initTitleImageScale();
  PAS.initParallax();
  PAS.initRandomBadgeStickers();
});


})(window.PAS = window.PAS || {});
