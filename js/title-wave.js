/* ===========================================================
   TITLE WAVE
   Plays a one-shot "wave" on the section titles (the <h2>s inside
   #swipeSection) the moment their panel is reached.

   Each letter rises from below, lifts over a single crest and lands
   exactly on its spot with zero speed (no wobble). Letters are
   staggered along the text, so the whole title reads as one line
   waving once from start to end.

   Triggered by the "panel-enter" event dispatched from
   swipe-panels.js (gotoPanel / gotoPanelDirect), so it fires on
   wheel/touch swipes AND on nav-link clicks.

   Nothing to change in the HTML: the script finds the titles with
   SELECTOR below and adds everything it needs itself.
=========================================================== */
(function () {
  "use strict";

  const SELECTOR = ".swipe-section h2:not(.statement)";   // the loader's h2 is outside #swipeSection, so it's untouched; the Frase h2 gets its own reveal below

  /* ---------- Settings (distances in em, so it scales with font size) ---------- */
  const CFG = {
    delay: 0.25,        // seconds after the panel starts sliding in before the wave starts
    duration: 0.7,      // seconds each letter takes to land (lower = faster)
    revealSpeed: 30,    // wave speed along the text, in em per second
    maxSweep: 0.9,      // long titles are sped up so the sweep never takes longer than this (s)
    rise: 0.6,          // how far below its final spot each letter starts
    amp: 0.25,          // how high the single crest lifts above the final spot
    fadeShare: 0.4,     // share of the travel spent fading in (0-1)
    replay: false,       // true: plays every time the section is reached; false: first visit only
  };

  // People who ask their OS for less motion just get the plain titles.
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  /* ---------- Styles (injected, so style.css needs no changes) ---------- */
  const style = document.createElement("style");
  style.textContent = `
    .wave-title .word { display: inline-block; white-space: nowrap; }
    .wave-title .char { display: inline-block; opacity: 0; }
    /* PERF: a compositor layer per letter only while the wave is playing (was permanent: 100+ layers) */
    .wave-title.is-waving .char { will-change: transform, opacity; }
    .wave-title .wave-sr {
      position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }
  `;
  document.head.appendChild(style);

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
  const easeOut = (v) => 1 - Math.pow(1 - clamp01(v), 3);

  /* ---------- Split into words + letters (keeps <br>, <em>, etc.) ---------- */
  function split(root) {
    const chars = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const word = document.createElement("span");
            word.className = "word";
            word.setAttribute("aria-hidden", "true");
            Array.from(part).forEach((letter) => {
              const c = document.createElement("span");
              c.className = "char";
              c.textContent = letter;
              word.appendChild(c);
              chars.push({ el: c, x: 0, settled: false });
            });
            frag.appendChild(word);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(root);
    return chars;
  }

  /* ---------- Titles ---------- */
  const titles = Array.from(document.querySelectorAll(SELECTOR)).map((el) => ({
    el, chars: [], fs: 16, speed: CFG.revealSpeed, t0: null, done: true, revealed: false,
  }));

  // script.js replaces the Módulos heading's content (innerHTML/textContent)
  // when a module card opens or closes, which wipes the letter spans. So the
  // split is (re)done whenever a title is about to play and has none.
  function ensureSplit(T) {
    if (T.el.querySelector(".char")) return;
    const text = T.el.textContent.trim().replace(/\s+/g, " ");
    T.el.classList.add("wave-title");
    T.chars = split(T.el);
    // Screen readers get the text once, as a normal string, instead of letter by letter.
    const sr = document.createElement("span");
    sr.className = "wave-sr";
    sr.textContent = text;
    T.el.insertBefore(sr, T.el.firstChild);
  }

  // Splitting up-front keeps the letters hidden (CSS above) until their section is reached.
  titles.forEach(ensureSplit);

  /* ---------- Position of each letter along the "ribbon" ----------
     Wrapped lines are chained end-to-end so the wave flows through the whole
     title as one continuous line. Measured right before each play, because
     the layout isn't available while the homepage is still hidden. */
  function measure(T) {
    const fs = parseFloat(getComputedStyle(T.el).fontSize) || 16;
    const widthEm = T.el.clientWidth / fs;
    let line = -1, lineTop = -Infinity, maxX = 0;
    T.fs = fs;
    T.chars.forEach((c) => {
      const top = c.el.offsetTop;
      if (top - lineTop > fs * 0.5) { line++; lineTop = top; }
      const base = c.el.offsetParent === T.el ? 0 : T.el.offsetLeft;
      c.x = line * widthEm + (c.el.offsetLeft - base) / fs;
      if (c.x > maxX) maxX = c.x;
    });
    T.speed = Math.max(CFG.revealSpeed, maxX / CFG.maxSweep);
  }

  /* ---------- Animation loop ----------
     Each letter does ONE wave and then stops for good. */
  let running = false;

  function frame(now) {
    let active = false;

    titles.forEach((T) => {
      if (T.done) return;
      active = true;
      const t = (now - T.t0) / 1000;
      if (t < 0) return;                       // still inside the start delay
      let allSettled = true;

      T.chars.forEach((c) => {
        if (c.settled) return;
        const s = t - c.x / T.speed;           // seconds since the wave reached this letter
        if (s < 0) { allSettled = false; return; }

        const p = clamp01(s / CFG.duration);
        if (p >= 1) {                          // landed: lock it in place
          c.el.style.opacity = 1;
          c.el.style.transform = "none";
          c.settled = true;
          return;
        }

        const rise = CFG.rise * (1 - easeOut(p));                   // travel up from below
        const crest = CFG.amp * Math.pow(Math.sin(Math.PI * p), 2); // one smooth hump
        c.el.style.opacity = smooth(p / CFG.fadeShare);
        c.el.style.transform = "translate3d(0," + ((rise - crest) * T.fs).toFixed(2) + "px,0)";
        allSettled = false;
      });

      if (allSettled) { T.done = true; T.el.classList.remove("is-waving"); }
    });

    if (active) requestAnimationFrame(frame);
    else running = false;
  }

  function kick() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  /* ---------- Play the titles of a panel ---------- */
  function reveal(panel) {
    titles.forEach((T) => {
      if (!panel.contains(T.el)) return;
      if (T.revealed && !CFG.replay) return;

      T.revealed = true;
      ensureSplit(T);
      measure(T);

      // Back to the hidden start pose (matters when replaying).
      T.chars.forEach((c) => {
        c.settled = false;
        c.el.style.opacity = "0";
        c.el.style.transform = "translate3d(0," + (CFG.rise * T.fs).toFixed(2) + "px,0)";
      });

      T.t0 = performance.now() + CFG.delay * 1000;
      T.done = false;
      T.el.classList.add("is-waving");
    });
    kick();
  }

  /* ---------- FRASE (statement) title: separate effect, no letter wave ----------
     The h2 stays exactly where it sits (no rise, no per-letter animation).
     A clip-path on the element itself is animated from "fully clipped" to
     "fully visible", left edge fixed, so it reads as the box growing to its
     final width while the text underneath never moves.

     Both the start time and the speed of this reveal are tied to the apple's
     flight (see computeFraseSync below), not to fixed numbers: it starts the
     moment the apple's center lines up with the statement's left edge, and
     grows at the same speed the apple's center takes to travel from the
     statement's left edge to its right edge. */
  const APPLE_CROSSING_SECONDS = 2.3;

  const FRASE_CFG = {
    selector: ".section--statement h2.statement",
    delay: 0.8,      // fallback delay (seconds) used only if there's no apple to sync to
    duration: APPLE_CROSSING_SECONDS + 0.6, // fallback duration (seconds), same case
    easing: "linear",
    replay: false,    // true: plays every time the section is reached; false: first visit only
  };

  const fraseTitles = Array.from(document.querySelectorAll(FRASE_CFG.selector)).map((el) => ({
    el, revealed: false, timer: null,
  }));

  if (fraseTitles.length) {
    style.textContent += `
      ${FRASE_CFG.selector} { clip-path: inset(0 100% 0 0); }
      ${FRASE_CFG.selector}.frase-revealed { clip-path: inset(0 0% 0 0); }
    `;
  }

  // Delay = time (from panel-enter) for the apple's center to reach the
  // statement's left edge. Duration = time it then takes the apple's center
  // to travel on from there to the statement's right edge. The flight is
  // linear, so both are a straight ratio of distances along it.
  // measureAppleGeometry() is called first so the apple's width is current.
  function computeFraseSync(A, statementEl) {
    measureAppleGeometry(A);
    const width = A.el.offsetWidth || 0;
    const rect = statementEl.getBoundingClientRect();
    const startX = -(width + 40);                 // apple's resting (off-screen left) position
    const endX = window.innerWidth + 40;           // apple's fully off-screen right position
    const total = endX - startX;
    if (total <= 0 || !width) return null;

    // Apple's left-edge position (same coordinate space as startX/endX) at
    // the moment its center lines up with a given viewport x-coordinate.
    const leftEdgeFor = (centerX) => centerX - width / 2;

    const triggerX = leftEdgeFor(rect.left);
    const endLineX = leftEdgeFor(rect.right);

    const triggerFrac = clamp01((triggerX - startX) / total);
    const endFrac = clamp01((endLineX - startX) / total);

    const delay = A.delay + triggerFrac * A.duration;
    const duration = Math.max(0, (endFrac - triggerFrac) * A.duration);
    return { delay, duration };
  }

  function revealFrase(panel, apples) {
    fraseTitles.forEach((F) => {
      if (!panel.contains(F.el)) return;
      if (F.revealed && !FRASE_CFG.replay) return;
      F.revealed = true;

      if (FRASE_CFG.replay) {
        F.el.classList.remove("frase-revealed");
        void F.el.offsetWidth; // force reflow so the transition restarts from clipped
      }

      const A = apples && apples.find((a) => a.role === "apple" && panel.contains(a.el));  // the phrase reveal stays synced to the apple
      const sync = A && computeFraseSync(A, F.el);
      const delay = sync ? sync.delay : FRASE_CFG.delay;
      const duration = sync ? sync.duration : FRASE_CFG.duration;

      F.el.style.transition = `clip-path ${duration}s ${FRASE_CFG.easing}`;

      clearTimeout(F.timer);
      F.timer = setTimeout(() => F.el.classList.add("frase-revealed"), delay * 1000);
    });
  }

  /* ---------- FRASE apple: flies across the screen, left to right, spinning ----------
     Position/size live in style.css (.statement-apple); this only adds the
     travel + spin, triggered the same way as the h2 reveal above. */
  const APPLE_CFG = {
    selector: ".section--statement .statement-apple",
    delay: 0.5,      // default only; each flyer's real delay/duration/scale are in FLYERS below
    duration: APPLE_CROSSING_SECONDS,
    spins: 2,        // full rotations during the flight
    easing: "linear",
    replay: false,   // true: flies again every time the section is reached; false: first visit only
  };

  /* Per-flyer settings. Order of appearance: broccoli -> apple -> mushroom.
       scale    size relative to the apple (1 = same height); bottoms stay aligned
       delay    seconds after the panel starts sliding in before it takes off
       duration seconds to cross the screen (lower = faster flight AND faster spin)
     The apple is the reference the phrase reveal is synced to. */
  const FLYERS = {
    broccoli: { scale: 0.6, delay: 0.6,  duration: 1.8 },                          // first, a bit faster
    apple:    { scale: 1,   delay: 0.5, duration: APPLE_CROSSING_SECONDS },       // middle
    mushroom: { scale: 0.7, delay: 0.9,  duration: 2.5 },                          // last, a bit slower
  };

  const flyerRole = (el) =>
    el.classList.contains("statement-broccoli") ? "broccoli" :
    el.classList.contains("statement-mushroom") ? "mushroom" : "apple";

  const appleEls = Array.from(document.querySelectorAll(APPLE_CFG.selector)).map((el) => {
    const role = flyerRole(el);
    const f = FLYERS[role];
    el.style.setProperty("--fly-duration", f.duration + "s");
    return {
      el, role, playing: false, done: false, startTimer: null, resetTimer: null,
      scale: f.scale, delay: f.delay, duration: f.duration,
    };
  });

  if (appleEls.length) {
    // The wrapper only translates; the <img> inside only rotates. The drop
    // shadow (filter in style.css) lives on the wrapper, so it never rotates.
    style.textContent += `
      ${APPLE_CFG.selector} {
        transform: translateX(calc(-100% - 40px));
      }
      ${APPLE_CFG.selector}.apple-flown {
        transform: translateX(calc(100vw + 40px));
        transition: transform var(--fly-duration, ${APPLE_CFG.duration}s) ${APPLE_CFG.easing};
      }
      ${APPLE_CFG.selector} img {
        transform: rotate(0deg);
      }
      ${APPLE_CFG.selector}.apple-flown img {
        transform: rotate(${APPLE_CFG.spins * 360}deg);
        transition: transform var(--fly-duration, ${APPLE_CFG.duration}s) ${APPLE_CFG.easing};
      }
    `;
  }

  function measureAppleGeometry(A) {
    const section = A.el.closest(".section--statement");
    const h2 = section && section.querySelector(".statement");
    if (!h2) return;
    const top = h2.offsetTop - 60;                 // 60px above the statement's own top
    const full = h2.offsetHeight + 150;            // apple's height tracks the statement's height, plus 150px extra (width follows automatically, keeping its aspect ratio)
    const h = full * (A.scale || 1);               // other flyers (broccoli) are a fraction of that, bottom-aligned with the apple
    A.el.style.top = (top + full - h) + "px";
    A.el.style.height = h + "px";
  }

  function revealApple(panel) {
    appleEls.forEach((A) => {
      if (!panel.contains(A.el)) return;
      if (A.playing) return;                       // already mid-flight
      if (A.done && !APPLE_CFG.replay) return;

      measureAppleGeometry(A);
      A.playing = true;
      if (APPLE_CFG.replay) {
        A.el.classList.remove("apple-flown");
        void A.el.offsetWidth;                     // force reflow so the transition restarts from the left
      }

      clearTimeout(A.startTimer);
      A.startTimer = setTimeout(() => {
        A.el.classList.add("apple-flown");
        A.done = true;
      }, A.delay * 1000);

      clearTimeout(A.resetTimer);
      A.resetTimer = setTimeout(() => { A.playing = false; }, (A.delay + A.duration) * 1000);
    });
  }

  window.addEventListener("resize", () => appleEls.forEach(measureAppleGeometry));

  document.addEventListener("panel-enter", (e) => {
    if (!e.detail || !e.detail.panel) return;
    reveal(e.detail.panel);
    revealFrase(e.detail.panel, appleEls);
    revealApple(e.detail.panel);
  });
})();