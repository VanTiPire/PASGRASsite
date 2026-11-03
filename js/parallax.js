(function (PAS) {

/* ===========================================================
   MOUSE PARALLAX
   Moves the decorative picture layers a few px according to the
   mouse position — on the hero and on the other sections too.
   Uses the individual `translate` / `scale` properties, which are
   applied independently of `transform`, so the entrance animations
   (CSS keyframes on the hero layers) and the GSAP animations
   (which write `transform`: the hands' `y` / `x`) keep running
   untouched.
   - Back layers move less, front layers more (depth below).
   - Layers that span the full width are scaled up just enough to
     cover the edge that their horizontal travel would otherwise
     expose (`edge: true`). Narrow, free-standing ones (the sliding
     hands) are only translated.
   - Vertical travel is always downward (>= 0): the layers are
     anchored to the bottom, so moving up would open a gap there.
     (The hero layers extend above the top by --hero-overscan, see
     style.css, which must stay >= 2 * MAX_Y.)
   - One shared mouse state drives every layer; the loop only runs
     while at least one of the sections is on screen, and only for
     a real mouse (skipped on touch and with prefers-reduced-motion).
   To add a layer: add a row to PARALLAX_LAYERS below.
=========================================================== */
function initParallax() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches) return;

  const MAX_X = 28;  // px — horizontal travel of the front layer (each way)
  const MAX_Y = 10;  // px — vertical travel of the front layer
  const EASE = 0.08; // 0–1: lower = softer/laggier follow

  // Hero: back -> front, same order as the z-classes in style.css.
  const HERO_DEPTH = { z0: 0.1, z1: 0.3, z2: 0.5, z3: 0.75, z4: 1 };
  // Overall strength of the hero movement (1 = full, 0 = none). Scales every
  // hero layer's depth, so the edge-covering scale shrinks along with it.
  const HERO_STRENGTH = 0.5;

  // section = the panel the layer lives in (used to pause the loop when
  // none of them is on screen); depth = 0 (static) .. 1 (moves the most).
  // Section background pictures (.section__bg, see style.css): they move
  // through the --bg-x / --bg-y variables, and are the farthest layer, so
  // they travel the least. Keep MAX_X * BG_DEPTH < --bg-bleed in style.css.
  const BG_DEPTH = 0.4;

  const PARALLAX_LAYERS = [
    // Família's two pictures behave exactly like the section backgrounds
    // above it (same depth, moving both ways vertically). They have no
    // bleed of their own, so they are scaled up from the centre just enough
    // that no edge is ever exposed (symmetric: true), and the clipping box
    // .familia__layers (style.css) keeps that from adding scroll overflow.
    { section: ".section--familia", selector: ".familia__ground", depth: BG_DEPTH, edge: true, symmetric: true },
    { section: ".section--familia", selector: ".familia__over", depth: BG_DEPTH, edge: true, symmetric: true },
    // The walking kid travels with the ground it stands on: same depth and
    // same two-way movement. It is not moved through `translate` here (the
    // walk in initKidWalk owns that), but through --par-x / --par-y, which
    // style.css and initKidWalk add to the walk offset.
    { section: ".section--familia", selector: ".familia__kid", depth: BG_DEPTH, edge: false, symmetric: true, vars: true }
  ];

  const layers = [];
  const sections = new Set();

  const hero = document.querySelector(".section--hero");
  if (hero) {
    sections.add(hero);
    hero.querySelectorAll(".hero__ground").forEach((el) => {
      const key = Object.keys(HERO_DEPTH).find((k) => el.classList.contains("hero__ground--" + k));
      layers.push({ el, depth: (key ? HERO_DEPTH[key] : 1) * HERO_STRENGTH, edge: true, sec: hero });
    });
  }

  PARALLAX_LAYERS.forEach(({ section, selector, depth, edge, symmetric, vars }) => {
    const sectionEl = document.querySelector(section);
    if (!sectionEl) return;
    const found = sectionEl.querySelectorAll(selector);
    if (!found.length) return;
    sections.add(sectionEl);
    found.forEach((el) => layers.push({ el, depth, edge, symmetric, vars, sec: sectionEl }));
  });

  document.querySelectorAll(".section__bg").forEach((el) => {
    const sectionEl = el.closest(".section");
    if (sectionEl) sections.add(sectionEl);
    layers.push({ el, depth: BG_DEPTH, edge: false, bg: true, sec: sectionEl });
  });
  if (!layers.length) return;

  let targetX = 0, targetY = 0; // normalized mouse, -1..1
  let curX = 0, curY = 0;
  let rafId = null;
  const visibility = new Map(); // section -> is (mostly) on screen
  const anyVisible = () => {
    if (!("IntersectionObserver" in window)) return true;
    for (const v of visibility.values()) if (v) return true;
    return false;
  };

  function applyScale() {
    const w = window.innerWidth || 1;
    layers.forEach(({ el, depth, edge, symmetric }) => {
      if (!edge) return;
      let s = 1 + (2 * MAX_X * depth) / w;
      if (symmetric && el.offsetHeight > 50) {
        // Scaled from the centre, so top and bottom each grow by
        // (s - 1) * height / 2, which must cover the vertical travel
        // (MAX_Y * depth each way) plus a 2px margin.
        s = Math.max(s, 1 + (2 * (MAX_Y * depth + 2)) / el.offsetHeight);
      }
      el.style.scale = s.toFixed(4);
    });
  }

  function render() {
    curX += (targetX - curX) * EASE;
    curY += (targetY - curY) * EASE;

    layers.forEach(({ el, depth, bg, symmetric, vars, sec }) => {
      // PERF: skip layers of panels that are off screen (they are re-synced the moment they scroll into view).
      if (sec && visibility.get(sec) === false) return;
      const x = -curX * MAX_X * depth;
      if (bg) {
        // Backgrounds are clipped with a bleed on every side, so they can
        // move both ways vertically.
        el.style.setProperty("--bg-x", x.toFixed(2) + "px");
        el.style.setProperty("--bg-y", (-curY * MAX_Y * depth).toFixed(2) + "px");
        return;
      }
      if (vars) {
        el.style.setProperty("--par-x", x.toFixed(2) + "px");
        el.style.setProperty("--par-y", (-curY * MAX_Y * depth).toFixed(2) + "px");
        return;
      }
      // Symmetric layers move both ways vertically, like the backgrounds;
      // the others (hero) only ever move down.
      const y = symmetric ? -curY * MAX_Y * depth : (1 - curY) * MAX_Y * depth;
      el.style.translate = x.toFixed(2) + "px " + y.toFixed(2) + "px";
    });

    const settled = Math.abs(targetX - curX) < 0.001 && Math.abs(targetY - curY) < 0.001;
    rafId = settled || !anyVisible() ? null : requestAnimationFrame(render);
  }

  function kick() {
    if (rafId === null && anyVisible()) rafId = requestAnimationFrame(render);
  }

  document.addEventListener("pointermove", (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    targetX = (e.clientX / window.innerWidth) * 2 - 1;
    targetY = (e.clientY / window.innerHeight) * 2 - 1;
    kick();
  });

  // Mouse leaves the window: ease back to the centre.
  document.documentElement.addEventListener("mouseleave", () => {
    targetX = 0;
    targetY = 0;
    kick();
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        visibility.set(entry.target, entry.intersectionRatio > 0.2);
      });
      kick();
    }, { threshold: [0, 0.2, 1] });
    sections.forEach((s) => {
      visibility.set(s, s === hero); // the hero is the panel on screen at start
      observer.observe(s);
    });
  }

  window.addEventListener("resize", applyScale);
  layers.forEach(({ el, symmetric }) => {
    if (symmetric && el.tagName === "IMG" && !el.complete) {
      el.addEventListener("load", applyScale, { once: true });
    }
  });
  applyScale();
  render();
}

PAS.initParallax = initParallax;

})(window.PAS = window.PAS || {});
