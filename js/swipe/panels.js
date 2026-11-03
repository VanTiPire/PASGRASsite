(function (PAS) {

const { axisFor, otherAxis, FLIPBOOK_ENTER_Y, addFilterContinuity, addFlipbookSettle, addModulosHands, addConquistasBadges } = PAS.swipe;

  // PERF: panels get .is-animating (css/layout.css -> will-change) only while moving.
  let movingEls = [];
  function markMoving(a, b) {
    unmarkMoving();
    movingEls = [a, b];
    movingEls.forEach((el) => el.classList.add("is-animating"));
  }
  function unmarkMoving() {
    movingEls.forEach((el) => el.classList.remove("is-animating"));
    movingEls = [];
  }

  function initSwipePanels() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    const swipeSection = document.querySelector(".swipe-section");
    const panels = gsap.utils.toArray(".swipe-section .section");
    if (!swipeSection || !panels.length) return;

    let currentIndex = 0;
    let animating = false;

    // The header slides up out of view while the Famílias panel is the
    // current one, and comes back as soon as you leave it.
    // The persistent title image (.site-title-image) goes with it.
    const siteHeader = document.getElementById("siteHeader");
    const siteTitleImage = document.querySelector(".site-title-image");
    const familiaIndex = panels.findIndex((p) => p.id === "familia");

    // One shared distance for both elements, so they slide up in exact
    // lockstep (same time, same curve, same px). It has to be enough to
    // clear whichever is lower on screen: the header's own height, or the
    // title image at its final, locked size — the values below mirror
    // MIN_SCALE and TOP_MIN in initTitleImageScale() (script.js). Using
    // the *final* size (not the current, possibly still-shrinking one)
    // keeps the distance right even when jumping here from the hero via
    // a nav link. 24px of extra room clears the shadows.
    const TITLE_MIN_SCALE = 0.2;
    const TITLE_TOP_MIN = 15;
    const HIDE_MARGIN = 24;

    function measureHideDistance() {
      const headerBottom = siteHeader ? siteHeader.offsetHeight : 0;
      const titleBottom = siteTitleImage
        ? TITLE_TOP_MIN + TITLE_MIN_SCALE * siteTitleImage.offsetHeight
        : 0;
      return Math.ceil(Math.max(headerBottom, titleBottom) + HIDE_MARGIN);
    }

    function updateHeader() {
      if (familiaIndex === -1) return;
      const hide = currentIndex === familiaIndex;
      if (hide) {
        document.documentElement.style.setProperty("--hide-y", `${measureHideDistance()}px`);
      }
      if (siteHeader) siteHeader.classList.toggle("is-hidden", hide);
      if (siteTitleImage) siteTitleImage.classList.toggle("is-hidden", hide);
    }

    // Every panel after the first starts pushed off-screen, on
    // whichever axis it will first enter from; panel 0 (Início)
    // is already in place and needs no offset.
    panels.forEach((panel, i) => {
      if (i === 0) return;
      const axis = axisFor(i - 1, i);
      gsap.set(panel, {
        xPercent: axis === "xPercent" ? 100 : 0,
        yPercent: axis === "yPercent" ? 100 : 0
      });
    });
    gsap.set(panels, { zIndex: (i) => i });

    // Starts fully below the viewport, same idea as the off-screen
    // panel offsets above — settles up into place the first time
    // Sobre is entered (see addFlipbookSettle). Targets .flipbook-
    // scale, not .flipbook-wrap, so the arrows (siblings inside the
    // wrap) aren't affected.
    const flipbookScale = document.querySelectorAll(
      ".flipbook-scale, .flipbook-pic"
    );
    if (flipbookScale.length) gsap.set(flipbookScale, { y: FLIPBOOK_ENTER_Y });
    // (all start below the screen; the front and back hands are animated up
    // then down in addFlipbookSettle, the book only up)

    // Each header link that points to a panel (#inicio, #modulos) is
    // highlighted only while that panel is the current one; on any other
    // panel it goes back to its normal look.
    const heroIndex = panels.findIndex((p) => p.id === "inicio");

    function updateNav() {
      document.querySelectorAll('.site-nav a[href^="#"]').forEach((link) => {
        const idx = panels.findIndex((p) => p.id === link.getAttribute("href").slice(1));
        if (idx !== -1) link.classList.toggle("is-active", currentIndex === idx);
      });
    }

    // Step to an adjacent panel (wheel/touch navigation).
    function gotoPanel(index, isScrollingDown) {
      if (
        (index === panels.length && isScrollingDown) ||
        (index === -1 && !isScrollingDown) ||
        animating
      ) {
        return;
      }

      animating = true;

      const outgoing = panels[currentIndex];
      const incoming = panels[index];
      const axis = axisFor(currentIndex, index);
      markMoving(outgoing, incoming);

      // Clear any leftover offset on the axis this transition
      // doesn't use, so motion stays confined to one axis.
      gsap.set([outgoing, incoming], { [otherAxis(axis)]: 0 });

      const tl = gsap.timeline({
        defaults: { duration: 0.75, ease: "power2.inOut" },
        onComplete: () => { animating = false; unmarkMoving(); }
      });

      tl.to(outgoing, { [axis]: isScrollingDown ? -100 : 100 }, 0);
      tl.fromTo(
        incoming,
        { [axis]: isScrollingDown ? 100 : -100 },
        { [axis]: 0 },
        0
      );
      addFilterContinuity(tl, panels, currentIndex, index);
      addFlipbookSettle(tl, panels, currentIndex, index);
      addModulosHands(panels, index);
      addConquistasBadges(panels, index);

      currentIndex = index;
      updateNav();
      updateHeader();

      // Tells title-wave.js which panel is being reached, so its <h2>
      // can play its wave.
      document.dispatchEvent(new CustomEvent("panel-enter", { detail: { panel: incoming, index } }));
    }

    // Jump straight to a target panel (nav-link clicks) instead of
    // stepping through every panel in between. Panels that aren't
    // part of the transition are snapped (not animated) to whichever
    // side they should rest on, vertically.
    function gotoPanelDirect(index) {
      if (index === currentIndex || animating) return null;

      animating = true;

      const isScrollingDown = index > currentIndex;
      const outgoing = panels[currentIndex];
      const incoming = panels[index];
      const axis = axisFor(currentIndex, index);
      markMoving(outgoing, incoming);

      panels.forEach((panel, i) => {
        if (i === currentIndex || i === index) return;
        gsap.set(panel, { xPercent: 0, yPercent: i < index ? -100 : 100 });
      });

      gsap.set([outgoing, incoming], { [otherAxis(axis)]: 0 });

      const tl = gsap.timeline({
        defaults: { duration: 0.75, ease: "power2.inOut" },
        onComplete: () => { animating = false; unmarkMoving(); }
      });

      tl.to(outgoing, { [axis]: isScrollingDown ? -100 : 100 }, 0);
      tl.fromTo(
        incoming,
        { [axis]: isScrollingDown ? 100 : -100 },
        { [axis]: 0 },
        0
      );
      addFilterContinuity(tl, panels, currentIndex, index);
      addFlipbookSettle(tl, panels, currentIndex, index);
      addModulosHands(panels, index);
      addConquistasBadges(panels, index);

      currentIndex = index;
      updateNav();
      updateHeader();

      // Tells title-wave.js which panel is being reached, so its <h2>
      // can play its wave.
      document.dispatchEvent(new CustomEvent("panel-enter", { detail: { panel: incoming, index } }));
      return tl;
    }

    // Touch keeps using the Observer. The mouse wheel / trackpad is
    // handled by hand below: the Observer accumulated deltas across
    // gestures, so trackpad inertia and small opposite-direction
    // "bounce" events arriving after a panel change were read as a new
    // swipe and sometimes sent you back up.
    const intentObserver = ScrollTrigger.observe({
      type: "touch",
      onUp: () => gotoPanel(currentIndex + 1, true),
      onDown: () => gotoPanel(currentIndex - 1, false),
      wheelSpeed: -1,
      tolerance: 10,
      preventDefault: true,
      onPress: (self) => {
        ScrollTrigger.isTouch && self.event.preventDefault();
      }
    });

    // One wheel GESTURE = one panel step, for both trackpads and mouse
    // wheels.
    //
    // Why the previous version felt unresponsive: after a step it ignored
    // every event until the wheel had been silent for 150ms. A trackpad
    // inertia tail (or a mouse wheel spun a few notches in a row) never
    // goes silent that long, so a second flick/notch right after a slide
    // did nothing. A direction lock taken from the gesture's first event
    // also let a tiny opposite-sign jitter swallow the whole real scroll.
    //
    // Now, after a step the stream is "locked" (the inertia tail is
    // swallowed) and the lock is released as soon as the input is clearly
    // a NEW push, not by waiting for silence:
    //  - quiet for WHEEL_GESTURE_GAP ms -> new gesture;
    //  - two consecutive sparse events (>= WHEEL_TICK_GAP ms apart) ->
    //    discrete mouse-wheel notches (trackpad events arrive every
    //    ~8-16ms, so they never look like this);
    //  - an event much bigger than the previous one -> a fresh flick on
    //    top of a decaying inertia tail (inertia only ever shrinks).
    // A late bounce in the opposite direction is still ignored for
    // WHEEL_REVERSE_LOCKOUT ms after the slide, so it can't send you back.
    const WHEEL_THRESHOLD = 40;        // accumulated px needed to trigger a step
    const WHEEL_GESTURE_GAP = 120;     // ms of silence that ends a gesture
    const WHEEL_TICK_GAP = 40;         // ms between events typical of a mouse wheel
    const WHEEL_RISE_FACTOR = 1.6;     // event vs previous one => new flick
    const WHEEL_RISE_MIN = 24;         // ...and at least this many px
    const SLIDE_MS = 750;              // panel slide duration (0.75s)
    const WHEEL_REVERSE_LOCKOUT = 300; // ms after the slide ends
    let wheelLastTime = 0;
    let wheelLastGap = 0;
    let wheelLastAbs = 0;
    let wheelAccum = 0;
    let wheelAccumDir = 0;   // +1 down / -1 up
    let wheelLocked = false; // a step fired; swallow its inertia tail
    let lastStepDir = 0;
    let lastStepAt = 0;

    window.addEventListener(
      "wheel",
      (e) => {
        // Ctrl+wheel / trackpad pinch is the browser's zoom: leave it alone.
        if (e.ctrlKey) return;

        e.preventDefault();

        // Normalise line/page delta modes to pixels.
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
        const dy = e.deltaY * unit;
        const dx = e.deltaX * unit;
        // Horizontal swipes (and zero deltas) never change panel.
        if (dy === 0 || Math.abs(dx) > Math.abs(dy)) return;

        const abs = Math.abs(dy);
        const dir = dy > 0 ? 1 : -1;
        const now = performance.now();
        const gap = now - wheelLastTime;
        const prevGap = wheelLastGap;
        const prevAbs = wheelLastAbs;
        wheelLastTime = now;
        wheelLastGap = gap;
        wheelLastAbs = abs;

        // Silence ends the gesture: start clean.
        if (gap > WHEEL_GESTURE_GAP) {
          wheelLocked = false;
          wheelAccum = 0;
        }

        // Just moved one way: a late bounce the other way is ignored.
        if (dir === -lastStepDir && now - lastStepAt < SLIDE_MS + WHEEL_REVERSE_LOCKOUT) return;

        // Still in the stream that produced the last step: stay locked
        // unless this is clearly a new push.
        if (wheelLocked) {
          const isNotch = gap >= WHEEL_TICK_GAP && prevGap >= WHEEL_TICK_GAP;
          const isNewFlick = abs >= WHEEL_RISE_MIN && abs > prevAbs * WHEEL_RISE_FACTOR;
          if (animating || !(isNotch || isNewFlick)) return;
          wheelLocked = false;
          wheelAccum = 0;
        }

        // Mid-slide: nothing to do (and nothing to accumulate).
        if (animating) return;

        // A direction change restarts the accumulation instead of
        // cancelling it, so one stray opposite event can't mask the push.
        if (dir !== wheelAccumDir) {
          wheelAccum = 0;
          wheelAccumDir = dir;
        }
        wheelAccum += abs;
        if (wheelAccum < WHEEL_THRESHOLD) return;

        wheelAccum = 0;
        const down = dir > 0; // wheel down = next panel
        const target = currentIndex + (down ? 1 : -1);
        if (target < 0 || target >= panels.length) return; // at either end: no step, no lock

        wheelLocked = true;
        lastStepDir = dir;
        lastStepAt = now;
        gotoPanel(target, down);
      },
      { passive: false }
    );

    // Pins the swipe section so the browser's own scroll never moves
    // it — panel switching happens entirely through the Observer above.
    ScrollTrigger.create({
      trigger: swipeSection,
      pin: true,
      start: "top top",
      end: "+=1"
    });

    updateNav();

    // Nav links (and any other in-page anchor, e.g. the hero buttons)
    // jump straight to their target panel instead of the browser's
    // default anchor scroll, which wouldn't do anything visible here.
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        const id = link.getAttribute("href").slice(1);
        const targetIndex = panels.findIndex((p) => p.id === id);
        if (targetIndex === -1) return;
        e.preventDefault();
        gotoPanelDirect(targetIndex);
      });
    });

    // The flipbook (turn.js) inside the "Sobre" panel handles its own
    // mouse/touch drag gestures for turning pages. Disable the panel
    // Observer only while an actual drag is happening (mouse/touch
    // down inside the flipbook), not just while hovering — hovering
    // alone must keep wheel-driven panel swiping working. Leaving the
    // Observer on during hover also keeps its preventDefault active,
    // which stops the browser's native scroll (and its scrollbar)
    // from taking over the panel underneath.
    //
    // The Módulos prev/next buttons (and the cards themselves) need
    // the same treatment for a different reason: they're a plain tap,
    // not a drag, but this Observer is attached document-wide and its
    // onPress still fires first, on touchstart, before the button's
    // own click. Módulos is one end of the Sobre<->Módulos<->
    // Conquistas horizontal pair, so onPress's preventDefault (and, on
    // any tap with a hint of movement, onUp/onDown itself) can swallow
    // the tap or swipe the whole panel away instead of letting the
    // button register it — the intermittent "can't move to the next/
    // prev module card" bug. Disabling on press and re-enabling on
    // release, exactly like the flipbook, stops the Observer from ever
    // seeing that touchstart.
    const disableForDrag = () => intentObserver.disable();
    const enableAfterDrag = () => intentObserver.enable();

    const moduleTrail = document.querySelector(".module-trail");
    const flipbookWrap = document.querySelector(".flipbook-wrap");
    const dragGuardedEls = [flipbookWrap, moduleTrail].filter(Boolean);

    if (dragGuardedEls.length) {
      dragGuardedEls.forEach((el) => {
        el.addEventListener("mousedown", disableForDrag);
        el.addEventListener("touchstart", disableForDrag, { passive: true });
      });

      window.addEventListener("mouseup", enableAfterDrag);
      window.addEventListener("touchend", enableAfterDrag);
      window.addEventListener("touchcancel", enableAfterDrag);
    }

    // Arriving from another page with a hash (e.g. index.html#modulos):
    // open that panel straight away, with no swipe, once the swipe system is ready.
    const hashId = window.location.hash.slice(1);
    const hashIndex = hashId ? panels.findIndex((p) => p.id === hashId) : -1;
    if (hashIndex > 0) {
      // Sem animação: a página já abre no painel pedido (a transição é levada logo ao fim).
      const jump = gotoPanelDirect(hashIndex);
      if (jump) jump.progress(1);
    }
  }

  document.addEventListener("loading-complete", initSwipePanels, { once: true });


})(window.PAS = window.PAS || {});