/* ===========================================================
   LOADING SCREEN
   Split out of script.js: everything that drives the loading
   screen itself — the rotating fact card, the simulated/real
   progress bar, and the handoff (exit animations) to the
   homepage. Depends only on the DOM inside #loading-screen and
   #homepage, and on the animations/classes defined in
   loading.css. Fires the "loading-complete" event on
   document once the homepage is revealed, which script.js
   listens for.
=========================================================== */

/* ===========================================================
   CONFIG
=========================================================== */


// Fun facts shown in the "Sabias que..." card while the app loads.
// Swap or extend this list freely — the rotator picks them up automatically.
const FACTS = [
  "Dormir bem ajuda-te a regular o apetite e a teres energia para o dia seguinte?",
  "As emoções podem influenciar a forma como comemos, por isso é indispensável aprenderes a partilhar o que sentes?",
  "Consumir água diariamente é crucial para o bom funcionamento do teu corpo?",
  "Variar os alimentos, incluindo frutas e legumes, permite-te obter os nutrientes necessários para cresceres e teres energia?",
  "Atividades como correr, saltar e dançar contribuem para o fortalecimento dos teus músculos e ossos?",
  "O exercício físico liberta-te do cansaço e alivia o stress que tens acumulado, beneficiando a tua saúde física e mental?"
];

const FACT_ROTATE_MS = 7500;

// Images referenced only from CSS (not <img> tags). They are fetched AND decoded
// while the loader is on screen, so the first swipe into each panel doesn't have
// to decode a full-screen picture mid-animation. Paths are relative to index.html.
const CRITICAL_BACKGROUNDS = [
  "pics/loading/bubble.png",
  "pics/background.png",
  "pics/phraseSection.png",
  "pics/aboutSection.png",
  "pics/moduleSection.png",
  "pics/questSection.png"
];
const preloadedImages = []; // keeps the decoded images referenced

// Progress built from asset-tracking alone is never allowed to reach
// 100% — the final stretch is reserved for the real "everything is
// loaded" signal (window's load event).
const PROGRESS_CAP_BEFORE_LOAD = 0;

// Safety net: if some promise never settles (e.g. a font host that
// hangs), stop waiting on it after this long instead of freezing
// the loader forever.
const MAX_WAIT_MS = 15000;

// How long after the fact card / loading panel start their exit
// before the globe and running character start theirs, so the two
// pairs of exits feel staggered rather than perfectly simultaneous.
const VISUAL_EXIT_DELAY_MS = 200;

// How long to visually hold at 100% before the exit animation starts.
const HOLD_AT_100_MS = 0;

// How long the homepage entrance (hero layers, title image, navbar and
// hero button — see "ENTRANCE DONE" in style.css) takes to finish after
// #homepage gets .is-visible. The longest one is the navbar / hero
// button fade: 2.2s delay + 0.5s = 2.7s. Once this has passed,
// .entrance-done is added so the entrance can never replay (e.g. on
// window resize). Raise it if you lengthen any entrance animation.
const HOMEPAGE_ENTRANCE_MS = 2800;

// Floor for how long the loader stays on screen. This isn't just a
// pause tacked on after the bar hits 100% — it paces the bar itself,
// so on a fast/cached load the fill still visibly climbs across the
// whole floor instead of jumping to 100% early and then waiting.
// On a genuinely slow load (assets take longer than this), it has no
// effect: real progress is already the limiting factor by then.
const MIN_DISPLAY_MS = 8000;

/* ===========================================================
   FACT ROTATOR
=========================================================== */
let factRotatorId = null;

function startFactRotator() {
  const el = document.getElementById("factText");
  if (!el) return;

  let index = Math.floor(Math.random() * FACTS.length);
  el.textContent = FACTS[index];

  factRotatorId = setInterval(() => {
    el.classList.add("is-fading");
    setTimeout(() => {
      index = (index + 1) % FACTS.length;
      el.textContent = FACTS[index];
      el.classList.remove("is-fading");
    }, 400);
  }, FACT_ROTATE_MS);
}

function stopFactRotator() {
  if (factRotatorId) {
    clearInterval(factRotatorId);
    factRotatorId = null;
  }
}

/* ===========================================================
   PROGRESS ENGINE
   Smoothly eases a visual "current" value toward whatever
   "target" the tracking logic below sets, so the bar never
   jumps abruptly even when several assets resolve at once.
=========================================================== */
const LoadingProgress = (() => {
  let current = 0;
  // "target" is the real, honestly-known progress (from assets, fonts,
  // window load, and the trickle). It only ever moves forward.
  let target = 0;
  let running = false;
  let startTime = null;
  const listeners = [];

  function setTarget(pct) {
    target = Math.max(target, Math.min(pct, 100));
  }

  function onUpdate(cb) {
    listeners.push(cb);
  }

  // How far the bar is *allowed* to visually go, based purely on how
  // long it's been on screen — climbs linearly from 0 to 100 over
  // MIN_DISPLAY_MS. This is what makes the bar keep moving for the
  // full floor even when the real target already hit 100 early.
  function timeCeiling() {
    if (!MIN_DISPLAY_MS || startTime === null) return 100;
    const elapsed = performance.now() - startTime;
    return Math.min(100, (elapsed / MIN_DISPLAY_MS) * 100);
  }

  function tick() {
    if (!running) return; // stopped once loading is done (this loop used to run forever)
    // The bar can never show more than what's genuinely known to be
    // loaded, and never faster than the time floor allows.
    const effectiveTarget = Math.min(target, timeCeiling());
    current += (effectiveTarget - current) * 0.09;
    if (effectiveTarget - current < 0.15) current = effectiveTarget;
    listeners.forEach((cb) => cb(current));
    requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    startTime = performance.now();
    requestAnimationFrame(tick);
  }

  function whenComplete() {
    return new Promise((resolve) => {
      (function check() {
        if (current >= 99.5 && target >= 100 && timeCeiling() >= 100) resolve();
        else requestAnimationFrame(check);
      })();
    });
  }

  function stop() {
    running = false;
    current = 100;
    listeners.forEach((cb) => cb(100));
  }

  return { setTarget, onUpdate, start, stop, whenComplete };
})();

/* ===========================================================
   ASSET DISCOVERY
=========================================================== */
function collectCriticalImageUrls() {
  const urls = new Set();

  document.querySelectorAll("img[src]").forEach((img) => {
    urls.add(img.src);
  });

  // Background images referenced only from CSS (not <img> tags) that
  // are critical to the loading screen itself go here explicitly.
  CRITICAL_BACKGROUNDS.forEach((path) => {
    urls.add(new URL(path, document.baseURI).href);
  });

  return [...urls];
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      // decode() moves the expensive bitmap decode off the main thread, now, not at first paint
      (img.decode ? img.decode() : Promise.resolve()).catch(() => { }).then(resolve);
    };
    img.onerror = () => resolve(); // a broken image shouldn't hang the loader
    img.src = url;
    preloadedImages.push(img);
  });
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(resolve, ms))
  ]);
}

/* ===========================================================
   ANIMATION SYNC
   Small helper to await a specific CSS animation finishing on
   an element (with a safety-net fallback timeout in case the
   event is ever missed). Used for both the entrance ("card-in")
   and the exit ("card-out") animations, defined in style.css.
=========================================================== */
function whenAnimationEnds(el, animationName, fallbackMs) {
  return new Promise((resolve) => {
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      resolve();
    }
    el.addEventListener(
      "animationend",
      (e) => {
        if (e.animationName === animationName) finish();
      },
      { once: true }
    );
    setTimeout(finish, fallbackMs);
  });
}

function whenEntranceRevealed(el) {
  return whenAnimationEnds(el, "card-in", 2600);
}

function whenExitFinished(el) {
  return whenAnimationEnds(el, "card-out", 1000);
}

// Exit step for the center globe and the running character, played
// at the same time as the fact card / loading panel exit. Applied to
// the .center-image / .foreground-image wrappers themselves (not the
// <img> children), so it doesn't fight with the transforms already
// sitting on those imgs from the entrance/orbit animations.
// The two elements use different exit animation names (defined in
// style.css): the globe's is "globeOutro" (1.9s), the running
// character's longest exit animation is "orbit-out" (2.1s) — pass
// whichever name applies to the element being awaited.
// The fallback must stay above the real animation's duration —
// otherwise it fires before the real animationend, causing the
// visual to freeze mid-exit.
function whenVisualExitFinished(el, animationName) {
  return whenAnimationEnds(el, animationName, 2400);
}

/* ===========================================================
   TRICKLE
   Fills the visual gap while we're genuinely waiting on the
   network, so the bar keeps inching forward instead of sitting
   still. It only ever pushes toward PROGRESS_CAP_BEFORE_LOAD,
   and real asset progress (which is usually faster) still wins
   because setTarget() only moves forward.
=========================================================== */
function startTrickle() {
  let elapsed = 0;
  const id = setInterval(() => {
    elapsed += 200;
    const trickleTarget =
      PROGRESS_CAP_BEFORE_LOAD * (1 - Math.exp(-elapsed / 4000));
    LoadingProgress.setTarget(trickleTarget);
  }, 200);
  return () => clearInterval(id);
}

/* ===========================================================
   REAL PROGRESS TRACKING
   Combines three signals:
     1. Every discoverable <img> (+ the loader's own background
        image) actually decoding.
     2. Web fonts actually loading (document.fonts.ready).
     3. The browser's own "everything is loaded" signal
        (window load — covers CSS, scripts, iframes, anything
        else the browser itself waits on).
   Only signal 3 is allowed to push the bar past
   PROGRESS_CAP_BEFORE_LOAD, so the loader can never falsely
   claim 100% early.
=========================================================== */
async function trackRealProgress() {
  const images = collectCriticalImageUrls();
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const windowLoaded = new Promise((resolve) => {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", () => resolve(), { once: true });
  });

  const totalUnits = images.length + 1; // +1 for fonts
  let doneUnits = 0;

  function bump() {
    doneUnits += 1;
    const pct = (doneUnits / totalUnits) * PROGRESS_CAP_BEFORE_LOAD;
    LoadingProgress.setTarget(pct);
  }

  const assetWork = Promise.all([
    ...images.map((url) => preloadImage(url).then(bump)),
    fontsReady.then(bump)
  ]);

  await withTimeout(assetWork, MAX_WAIT_MS);
  LoadingProgress.setTarget(PROGRESS_CAP_BEFORE_LOAD);

  await withTimeout(windowLoaded, MAX_WAIT_MS);
  LoadingProgress.setTarget(100);
}

/* ===========================================================
   LOADER CONTROLLER
=========================================================== */
function initLoader() {
  const bar = document.querySelector(".cssProgress-bar");
  const label = document.querySelector(".cssProgress-label");
  const loadingScreen = document.getElementById("loading-screen");
  const homepage = document.getElementById("homepage");
  const loadingPanel = document.querySelector(".loading-panel");
  const factCard = document.querySelector(".fact-card__div");
  const centerImage = document.querySelector(".center-image");
  const foregroundImage = document.querySelector(".foreground-image");

  if (!bar || !label || !loadingScreen || !loadingPanel || !factCard) return;

  LoadingProgress.onUpdate((pct) => {
    bar.style.width = pct + "%";
    label.textContent = Math.round(pct) + "%";
  });

  // Progress is gathered in the background the moment loading starts,
  // but the bar only visibly starts ticking once its own entrance
  // animation has finished — so the CSS entrance timing is untouched,
  // and the bar never appears to fade in already at (or near) 100%.
  const stopTrickle = startTrickle();
  const realProgress = trackRealProgress();
  const revealed = whenEntranceRevealed(loadingPanel);

  revealed.then(() => {
    LoadingProgress.start();
  });

  Promise.all([realProgress, revealed])
    .then(() => {
      stopTrickle();
      // Resolves once BOTH the real load is done AND the bar has
      // actually finished visually climbing to 100% — which itself
      // can't happen before MIN_DISPLAY_MS has elapsed since start().
      return LoadingProgress.whenComplete().then(() => LoadingProgress.stop());
    })
    .then(() => {
      setTimeout(() => {
        // Play the inverse ("card-out") animation on the fact card and
        // loading panel — the reverse of their entrance — at the same
        // time as the globe and running character play their own exit.
        factCard.classList.add("is-leaving");
        loadingPanel.classList.add("is-leaving");
        stopFactRotator();

        const exits = [
          whenExitFinished(factCard),
          whenExitFinished(loadingPanel)
        ];

        if (centerImage) {
          // The exit rotation/scale is fully handled by the globeOutro
          // CSS animation on this wrapper (and the infinite "rotate"
          // keyframe already running on the <img> itself) — see
          // style.css. No JS-driven transform needed here.
          exits.push(
            new Promise((resolve) => {
              setTimeout(() => {
                centerImage.classList.add("is-leaving");
                whenVisualExitFinished(centerImage, "globeOutro").then(resolve);
              }, VISUAL_EXIT_DELAY_MS);
            })
          );
        }
        if (foregroundImage) {
          // orbit-out (2.1s) outlasts globeFade-out (1.4s), so it's
          // the one that marks the exit as visually complete.
          exits.push(
            new Promise((resolve) => {
              setTimeout(() => {
                foregroundImage.classList.add("is-leaving");
                whenVisualExitFinished(foregroundImage, "orbit-out").then(resolve);
              }, VISUAL_EXIT_DELAY_MS);
            })
          );
        }

        Promise.all(exits).then(() => {
          document.dispatchEvent(new CustomEvent("loading-complete"));

          loadingScreen.classList.add("is-hidden");
          document.body.classList.remove("is-loading");
          if (homepage) {
            homepage.classList.add("is-visible");
            // Lock the entrance as one-shot: after it has played once,
            // swap the animations for static end states.
            setTimeout(
              () => homepage.classList.add("entrance-done"),
              HOMEPAGE_ENTRANCE_MS
            );
          }

          // Only react to the screen's own transition (a child's bubbling transitionend
          // used to remove it early), with a timeout as a safety net.
          const removeScreen = () => loadingScreen.remove();
          loadingScreen.addEventListener("transitionend", function onEnd(e) {
            if (e.target !== loadingScreen) return;
            loadingScreen.removeEventListener("transitionend", onEnd);
            removeScreen();
          });
          setTimeout(removeScreen, 1200);
        });
      }, HOLD_AT_100_MS);
    });
}

/* ===========================================================
   INIT
=========================================================== */
// Quando se chega ao index.html#modulos (a partir de uma página de módulo) não se mostra o loading: a página
// aparece logo, já no painel Módulos. A classe .skip-loading é posta no <html> por um script no <head> do index.html,
// para o loader nem chegar a ser pintado.
const SKIP_LOADING = document.documentElement.classList.contains("skip-loading");

function skipLoader() {
  const loadingScreen = document.getElementById("loading-screen");
  const homepage = document.getElementById("homepage");
  if (loadingScreen) loadingScreen.remove();
  document.body.classList.remove("is-loading");
  // Os restantes scripts são "defer": só aqui (DOMContentLoaded) já registaram o "loading-complete".
  // O evento vai primeiro, para o painel certo ficar posicionado antes de a homepage aparecer.
  document.dispatchEvent(new CustomEvent("loading-complete"));
  if (homepage) homepage.classList.add("is-visible", "entrance-done");   // entrance-done: sem animação de entrada do hero
}

function boot() {
  if (SKIP_LOADING) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", skipLoader, { once: true });
    else skipLoader();
    return;
  }
  startFactRotator();
  initLoader();
}

// This script sits at the end of <body>, so the DOM is usually already parsed.
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();