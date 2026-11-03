(function (PAS) {

// Drives the persistent title image + logo (.site-title-image, see
// index.html/style.css): scales down to 15% and slides up to top: 20px
// as the Frase panel swipes into view, crossfading the title image out
// (opacity 1 → 0) while the logo layered over it fades in (opacity 0 →
// 1) at the same time — and keeps all these effects locked in that end
// state for every panel after Frase (Sobre, Módulos, Conquistas,
// Família). It only reverses while swiping back through Frase toward
// the hero. Driven by IntersectionObserver rather than hooking into
// swipe-panels.js directly, so it stays in sync with however each
// panel is actually being transformed on screen (each panel is
// full-viewport and swiped via transform, so its intersection ratio
// with the viewport tracks swipe progress).
function initTitleImageScale() {
  const sections = Array.from(document.querySelectorAll(".swipe-section > .section"));
  const frase = document.querySelector(".section--statement");
  const fraseIndex = sections.indexOf(frase);
  if (fraseIndex === -1 || !("IntersectionObserver" in window)) return;

  // PERF: these variables used to be written on <html>, which invalidates the style of
  // the whole document on every IntersectionObserver step of every swipe. They are only
  // read by .site-title-image and its children, so they live on that element now.
  const titleEl = document.querySelector(".site-title-image");
  if (!titleEl) return;

  const MIN_SCALE = 0.2;
  const TOP_FULL = 80; // px — matches --header-h in style.css
  const TOP_MIN = 15; // px — where the image sits once locked at MIN_SCALE
  const STEPS = 50; // fine-grained thresholds so the scale tracks the swipe smoothly

  const thresholds = [];
  for (let i = 0; i <= STEPS; i++) {
    thresholds.push(i / STEPS);
  }

  const ratios = new Map(sections.map((s) => [s, 0]));

  // Chegada vinda de uma página de módulo (index.html#modulos, ver loading.js): a página abre já no painel
  // pedido, por isso o logo tem de aparecer logo no estado final, sem as transições de 0.15s da escala,
  // da posição e do fade. .is-instant desliga-as (title-image.css) até o salto para o painel ter sido
  // lido pelo IntersectionObserver e aplicado; depois volta tudo ao normal para os swipes seguintes.
  if (document.documentElement.classList.contains("skip-loading")) {
    titleEl.classList.add("is-instant");
    document.addEventListener(
      "loading-complete",
      () => setTimeout(() => titleEl.classList.remove("is-instant"), 600),
      { once: true }
    );
  }

  // Pulling the faded-out titleHero out of paint/hit-testing (via
  // visibility) should only happen once its opacity transition has
  // actually finished playing — otherwise the fade gets cut short.
  // Coming back the other way (scrolling/swiping back to Hero) must
  // NOT wait: it needs to be visible again instantly, or the image
  // pops in only after the delay instead of tracking the swipe. So
  // the delay is applied by hand, in JS, only on the hide path.
  let baseHidden = false;
  let hideTimer = null;
  function setBaseVisible(visible) {
    if (visible) {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (baseHidden) {
        titleEl.style.setProperty("--title-base-visible", "visible");
        baseHidden = false;
      }
    } else if (!baseHidden && !hideTimer) {
      hideTimer = setTimeout(() => {
        titleEl.style.setProperty("--title-base-visible", "hidden");
        baseHidden = true;
        hideTimer = null;
      }, 150); // matches the opacity transition duration in style.css
    }
  }

  // The "current" panel is whichever one is most visible right now —
  // with each panel swiped fully on/off screen via transform, that's a
  // reliable stand-in for "which section is the user on".
  function currentSectionIndex() {
    let bestSection = sections[0];
    let bestRatio = -1;
    sections.forEach((s) => {
      const r = ratios.get(s) || 0;
      if (r > bestRatio) {
        bestRatio = r;
        bestSection = s;
      }
    });
    return sections.indexOf(bestSection);
  }

  function updateScale() {
    const idx = currentSectionIndex();
    // progress: 0 while still on the hero, 1 once Frase (or anything
    // after it) is current; in between, tracks Frase's own visibility
    // as the live transition progress.
    const progress = idx >= fraseIndex ? 1 : ratios.get(frase) || 0;
    const scale = 1 - (1 - MIN_SCALE) * progress;
    const top = TOP_FULL - (TOP_FULL - TOP_MIN) * progress;
    const shadowOffset = 10 + (30 - 10) * progress;
    titleEl.style.setProperty("--title-scale", scale.toFixed(3));
    titleEl.style.setProperty("--title-top", top.toFixed(1));
    titleEl.style.setProperty("--title-shadow-offset", shadowOffset.toFixed(1));
    titleEl.style.setProperty("--title-logo-opacity", progress.toFixed(3));
    titleEl.style.setProperty("--title-base-opacity", (1 - progress).toFixed(3));
    setBaseVisible(progress < 1);
  }

  let titleRaf = 0;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => ratios.set(entry.target, entry.intersectionRatio));
    if (!titleRaf) titleRaf = requestAnimationFrame(() => { titleRaf = 0; updateScale(); });
  }, { threshold: thresholds });

  sections.forEach((s) => observer.observe(s));
}

PAS.initTitleImageScale = initTitleImageScale;

})(window.PAS = window.PAS || {});