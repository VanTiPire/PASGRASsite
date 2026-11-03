(function (PAS) {

const { SOBRE_INDEX, MODULOS_INDEX, CONQUISTAS_INDEX } = PAS.swipe;

  // How far below its resting spot the flipbook starts — in viewport
  // heights, not pixels, so it's guaranteed fully off-screen (below
  // the bottom edge) regardless of where it sits inside the Sobre
  // panel or how tall the panel is. The very first time Sobre is
  // entered, it tweens up to y:0 after a short delay, slower than the
  // panel's own 0.75s slide. After that first settle it stays put —
  // it is never animated up and never reset off-screen again, so
  // leaving and re-entering Sobre later just finds the book already
  // in place.
  //
  // Targets .flipbook-scale (the book itself), not .flipbook-wrap —
  // the prev/next arrows are siblings of .flipbook-scale inside the
  // wrap, so they're excluded from this transform and stay in place.
  const FLIPBOOK_ENTER_Y = "115vh";
  const FLIPBOOK_SETTLE_DELAY = 0.3;
  const FLIPBOOK_SETTLE_DURATION = 1;
  let flipbookHasSettled = false;

  // The hands in front of the book (.flipbook-pic). They translate UP
  // together with the book (same delay / duration / ease), hold for a
  // beat, then translate back DOWN off-screen, leaving the book in
  // place. Runs on its own timeline (not the panel tl) so it never
  // keeps the swipe locked (`animating`) while the hands are moving.
  const HANDS_HOLD = 0;           // seconds the hands stay up
  const HANDS_DOWN_DURATION = 0.6;  // seconds to go back down
  const HANDS_DOWN_EASE = "power2.in";

  // Flipbook page turning is locked until the hands (front + back) have
  // finished their up-and-down translation. index.html reads this flag in
  // the turn.js 'turning' / 'start' handlers, the arrow keys and the nav
  // buttons, and listens for 'flipbook:unlocked' to refresh the arrows.
  window.flipbookLocked = true;

  function unlockFlipbook() {
    if (!window.flipbookLocked) return;
    window.flipbookLocked = false;
    document.dispatchEvent(new CustomEvent("flipbook:unlocked"));
  }

  function addFlipbookSettle(tl, panels, fromIndex, toIndex) {
    const flipbookScale = panels[SOBRE_INDEX].querySelector(".flipbook-scale");
    const hands = panels[SOBRE_INDEX].querySelectorAll(".flipbook-pic");
    if (!flipbookScale) { unlockFlipbook(); return; }
    if (flipbookHasSettled) return;

    if (toIndex === SOBRE_INDEX) {
      flipbookHasSettled = true;

      // Book: up, and stays.
      tl.fromTo(
        flipbookScale,
        { y: FLIPBOOK_ENTER_Y },
        { y: 0, duration: FLIPBOOK_SETTLE_DURATION, ease: "power2.out" },
        FLIPBOOK_SETTLE_DELAY
      );

      // Hands: up with the book, hold, then down.
      if (hands.length) {
        gsap
          .timeline({ delay: FLIPBOOK_SETTLE_DELAY, onComplete: unlockFlipbook })
          .fromTo(
            hands,
            { y: FLIPBOOK_ENTER_Y },
            { y: 0, duration: FLIPBOOK_SETTLE_DURATION, ease: "power2.out" }
          )
          .to(
            hands,
            { y: FLIPBOOK_ENTER_Y, duration: HANDS_DOWN_DURATION, ease: HANDS_DOWN_EASE },
            `+=${HANDS_HOLD}`
          );
      } else {
        // No hands to wait for: unlock once the book has settled.
        tl.call(unlockFlipbook, null, FLIPBOOK_SETTLE_DELAY + FLIPBOOK_SETTLE_DURATION);
      }
    } else if (fromIndex === SOBRE_INDEX) {
      tl.set(flipbookScale, { y: FLIPBOOK_ENTER_Y }, ">");
      if (hands.length) tl.set(hands, { y: FLIPBOOK_ENTER_Y }, ">");
    }
  }

  // Module cards in Módulos: the same entrance as the badges in Conquistas
  // (see addConquistasBadges below). The four cards travel from just
  // outside the left edge of the screen, left to right, all together
  // (stacked on top of each other) at one constant speed, and each one
  // drops out of the group only when it reaches its own place. A hand
  // (.conquistas-hand, the same one Conquistas uses) crosses the screen
  // with them. Starts together with the slide into Módulos (see
  // MODULOS_START_DELAY), only the first time (set MODULOS_HANDS_REPLAY to true to replay on every
  // entry). Not tied to the flipbook lock.
  //
  // The cards move by animating the CSS `translate` property (through a
  // proxy value) instead of `x`/`y`, so it doesn't clash with the cards'
  // own `transform` (hover lift, carousel slide) or its transition.
  const MODULOS_HANDS_REPLAY = false;
  const MODULOS_EASE = "power2.inOut"; // ease in and out ("none" = linear; "power3.inOut" = stronger, "sine.inOut" = softer)
  const MODULOS_START_DELAY = 0.75; // seconds after the slide into Módulos begins; = the panel slide duration, so the hand and cards enter from the screen's left edge (not from the moving panel's edge)
  const MODULOS_SPEED = 900; // px per second, shared by every card and the hand
  let modulosHandsHavePlayed = false;
  let modulosCardsTl = null;

  function addModulosHands(panels, toIndex) {
    if (toIndex !== MODULOS_INDEX) return;
    if (modulosHandsHavePlayed && !MODULOS_HANDS_REPLAY) return;

    const panel = panels[MODULOS_INDEX];
    const cards = Array.from(panel.querySelectorAll(".module-card"));
    if (!cards.length) return;

    modulosHandsHavePlayed = true;
    if (modulosCardsTl) modulosCardsTl.kill();

    // Measure from the natural layout: an inline `translate: none` beats
    // the CSS rule that parks the cards off-screen before the first visit.
    cards.forEach((c) => (c.style.translate = "none"));
    const first = cards[0].getBoundingClientRect();
    const hand = panel.querySelector(".conquistas-hand");

    // This runs while the panel is still parked off-screen (the slide-in
    // tween has just been created), so every position has to be taken
    // relative to the panel, never to the screen: measuring against the
    // screen would push the starting point a whole screen further away
    // and the cards would only show up after the panel had already
    // settled.
    const panelLeft = panel.getBoundingClientRect().left;
    const firstInPanel = first.left - panelLeft;

    // The group (the hand included) starts just outside the panel's left
    // edge, so it comes in together with the section itself.
    const handHalfExtra = hand ? Math.max(0, (hand.offsetWidth - first.width) / 2) : 0;
    const startX = -(firstInPanel + first.width + handHalfExtra);

    // Where each card starts: the group's position (the first card's
    // place, shifted off-screen to the left).
    const fromX = cards.map((c) => startX + first.left - c.getBoundingClientRect().left);
    const fromY = cards.map((c) => first.top - c.getBoundingClientRect().top);

    const speed = MODULOS_SPEED;

    // Inline start values keep the cards hidden while the CSS rule is
    // released (is-cards-risen).
    const pos = cards.map((_, i) => ({ x: fromX[i], y: fromY[i] }));
    const apply = (i) => (cards[i].style.translate = `${pos[i].x}px ${pos[i].y}px`);
    cards.forEach((_, i) => apply(i));
    panel.classList.add("is-cards-risen");

    modulosCardsTl = gsap.timeline({
      delay: MODULOS_START_DELAY,
      onComplete: () => cards.forEach((c) => c.style.removeProperty("translate"))
    });

    // ONE eased tween drives everything, so the hand stays centred on the
    // group at every moment: `g` is how far the group has travelled. Each
    // card rides the group (x = fromX + g) until it reaches its own place
    // (x = 0) and drops out there; the hand keeps going until it is
    // completely off the right side of the screen.
    const cardsDist = Math.max(...fromX.map((x) => -x));
    const groupCenter = firstInPanel + startX + first.width / 2; // panel coordinates
    const handFrom = hand ? groupCenter - hand.offsetWidth / 2 : 0;
    const handTo = hand ? panel.clientWidth : 0; // left edge at the right edge
    const totalDist = Math.max(cardsDist, hand ? handTo - handFrom : 0);

    if (hand) gsap.set(hand, { visibility: "visible", x: handFrom });

    const travel = { g: 0 };
    modulosCardsTl.to(
      travel,
      {
        g: totalDist,
        duration: totalDist / speed,
        ease: MODULOS_EASE,
        onUpdate: () => {
          cards.forEach((_, i) => {
            pos[i].x = Math.min(0, fromX[i] + travel.g);
            apply(i);
          });
          if (hand) gsap.set(hand, { x: handFrom + travel.g });
        },
        onComplete: () => {
          if (hand) gsap.set(hand, { visibility: "hidden" });
        }
      },
      0
    );
  }

  // The three badges in Conquistas. They travel from the left edge of
  // the screen, left to right, all together (stacked on top of each
  // other) at one constant speed, and each one drops out of the group
  // only when it reaches its own place: the first badge stops first, the
  // second keeps going to its place, and the third goes on to its own.
  // Linear movement, with the hands' / cards' delay; the first badge
  // takes BADGES_DURATION to arrive and the others take
  // proportionally longer (same speed). Played when Conquistas is
  // entered, only the first time (set BADGES_REPLAY to true to replay
  // on every entry).
  //
  // The hand (.conquistas-hand) travels with them at the same speed, from
  // off-screen left to off-screen right.
  //
  // The offsets are measured from the real layout (x and y), so it also
  // works when the badges wrap onto several rows on narrow screens.
  const BADGES_EASE = "none"; // linear
  const BADGES_DURATION = 1.6; // seconds the first badge takes to arrive (sets the shared speed)
  const BADGES_REPLAY = false;
  let badgesHavePlayed = false;
  let badgesTl = null;

  // The hand (pics/slide-hand.png) in Conquistas: when the section is
  // reached it first translates UP from below the screen (at the middle
  // of the screen), then translates RIGHT until it is completely off the right
  // side. Only the first time (HAND_REPLAY = true plays it on every entry).
  const HAND_REPLAY = false;
  const HAND_DELAY = 0.75;          // seconds after the slide into Conquistas begins (= the panel slide)
  const HAND_UP_DURATION = 0.7;     // seconds to rise (from the middle of the screen)
  const HAND_UP_EASE = "power2.out";
  const HAND_RIGHT_DURATION = 1.6;  // seconds to cross to the right
  const HAND_RIGHT_EASE = "power2.inOut";
  let handHasPlayed = false;
  let handTl = null;

  // The badges are uncovered by the hands themselves: the reveal edge of
  // each badge is the centre line of a hand, read on every frame, so the
  // two always move together (same timeline, same easing).
  //   left hand  (goes left)  -> 1st badge, right -> left
  //   both hands (from middle)-> 2nd badge, middle out to both sides
  //   right hand (goes right) -> 3rd badge, left -> right
  const BADGE_OPEN_MARGIN = 100; // px left open around a badge / the sticker layer (shadows, rotated stickers); keep in sync with style.css

  function addConquistasHand(panels, toIndex) {
    if (toIndex !== CONQUISTAS_INDEX) return;
    if (handHasPlayed && !HAND_REPLAY) return;

    const panel = panels[CONQUISTAS_INDEX];
    const hands = Array.from(panel.querySelectorAll(".conquistas-hand"));
    const badges = Array.from(panel.querySelectorAll(".badge"));
    // The random stickers (one div over the whole badge row, built by
    // initRandomBadgeStickers() in script.js) are uncovered by the same hand
    // edges as the badges, so they appear exactly the way the badges do.
    const stickers = panel.querySelector(".badge-row__stickers");
    if (!hands.length) {
      gsap.set(badges, { clipPath: "none" });
      if (stickers) gsap.set(stickers, { clipPath: "none" });
      return;
    }

    handHasPlayed = true;
    if (handTl) handTl.kill();

    const leftHand = hands.find((h) => h.classList.contains("conquistas-hand--left"));
    const rightHand = hands.find((h) => !h.classList.contains("conquistas-hand--left"));

    // Badge geometry, in panel coordinates. Measured when the timeline
    // actually starts (the panel has settled by then).
    let geo = [];
    let stickersGeo = null;
    const measure = () => {
      const pl = panel.getBoundingClientRect().left;
      geo = badges.map((b) => {
        const r = b.getBoundingClientRect();
        return { l: r.left - pl, r: r.right - pl, w: r.width };
      });
      if (stickers) {
        const r = stickers.getBoundingClientRect();
        stickersGeo = { l: r.left - pl, r: r.right - pl, w: r.width };
      }
    };

    const M = BADGE_OPEN_MARGIN;
    // Upper limit w + M (not w): the open margin M would otherwise leave a strip
    // of the oversized stickers visible outside the badge before it is uncovered.
    const clampInset = (v, w) => Math.min(w + M, Math.max(-M, v));
    const centreOf = (h) => (h ? gsap.getProperty(h, "x") + h.offsetWidth / 2 : null);

    const updateBadges = () => {
      if (!geo.length) return;
      const edgeL = centreOf(leftHand);
      const edgeR = centreOf(rightHand);
      badges.forEach((b, i) => {
        const g = geo[i];
        let left = -M, right = -M;
        if (i === 0 && edgeL !== null) left = clampInset(edgeL - g.l, g.w);            // 1st: right -> left
        else if (i === 2 && edgeR !== null) right = clampInset(g.r - edgeR, g.w);      // 3rd: left -> right
        else if (i === 1) {                                                            // 2nd: middle out
          if (edgeL !== null) left = clampInset(edgeL - g.l, g.w);
          if (edgeR !== null) right = clampInset(g.r - edgeR, g.w);
        }
        b.style.clipPath = `inset(${-M}px ${right}px ${-M}px ${left}px)`;
      });
      // Stickers: the whole badge row is uncovered between the two hands
      // (the union of the three badge reveals above), middle out to both sides.
      if (stickers && stickersGeo) {
        const sl = edgeL !== null ? clampInset(edgeL - stickersGeo.l, stickersGeo.w) : -M;
        const sr = edgeR !== null ? clampInset(stickersGeo.r - edgeR, stickersGeo.w) : -M;
        stickers.style.clipPath = `inset(${-M}px ${sr}px ${-M}px ${sl}px)`;
      }
    };

    handTl = gsap.timeline({
      delay: HAND_DELAY,
      onComplete: () => {
        badges.forEach((b) => (b.style.clipPath = "none"));
        if (stickers) stickers.style.clipPath = "none";
      }
    });
    handTl.add(() => { measure(); updateBadges(); }, 0);

    hands.forEach((hand) => {
      // The hand with .conquistas-hand--left goes to the left, the other one to the right.
      const goesLeft = hand === leftHand;

      // Starts fully below the screen, horizontally centred on the middle of
      // the screen (yPercent so the vertical start doesn't depend on the
      // image having loaded).
      const midX = (panel.clientWidth - hand.offsetWidth) / 2;
      const endX = goesLeft ? -hand.offsetWidth : panel.clientWidth;
      gsap.set(hand, { visibility: "visible", x: midX, yPercent: 100 });

      // Both hands rise together, then each goes to its own side.
      handTl.to(hand, { yPercent: 0, duration: HAND_UP_DURATION, ease: HAND_UP_EASE }, 0);
      handTl.to(
        hand,
        {
          x: endX,
          duration: HAND_RIGHT_DURATION * 0.6,
          ease: HAND_RIGHT_EASE,
          onUpdate: updateBadges,
          onComplete: () => gsap.set(hand, { visibility: "hidden" })
        },
        HAND_UP_DURATION
      );
    });
  }

  function addConquistasBadges(panels, toIndex) {
    addConquistasHand(panels, toIndex);
    // The flying badges + hand are off: the badges now sit in their final
    // place and are revealed left to right (clip-path) by title-wave.js,
    // like the Frase title. Set this to false to bring the flight back.
    const BADGES_FLIGHT_OFF = true;
    if (BADGES_FLIGHT_OFF) return;
    if (toIndex !== CONQUISTAS_INDEX) return;
    if (badgesHavePlayed && !BADGES_REPLAY) return;

    const badges = Array.from(panels[CONQUISTAS_INDEX].querySelectorAll(".badge"));
    if (!badges.length) return;

    badgesHavePlayed = true;
    if (badgesTl) badgesTl.kill();

    // Measure from the natural layout, with no leftover transform.
    gsap.set(badges, { clearProps: "transform" });
    const first = badges[0].getBoundingClientRect();
    const startX = -window.innerWidth; // fully off-screen on the left

    // Where each badge starts: the group's position (the first badge's
    // place, shifted off-screen to the left).
    const fromX = badges.map((b) => startX + first.left - b.getBoundingClientRect().left);
    const fromY = badges.map((b) => first.top - b.getBoundingClientRect().top);

    // One shared speed, set by the first badge's trip.
    const speed = Math.abs(fromX[0]) / BADGES_DURATION;

    badgesTl = gsap.timeline({
      delay: FLIPBOOK_SETTLE_DELAY,
      onComplete: () => gsap.set(badges, { clearProps: "transform" })
    });

    badges.forEach((badge, i) => {
      badgesTl.fromTo(
        badge,
        { x: fromX[i], y: fromY[i] },
        { x: 0, y: 0, duration: Math.abs(fromX[i]) / speed, ease: BADGES_EASE },
        0
      );
    });

    // The hand sits over the group (centred on it, in front of the badges
    // via z-index), moves at the same speed, so it stays over the
    // translating badges the whole time, and keeps going until it is
    // completely off the right side of the screen.
    const hand = panels[CONQUISTAS_INDEX].querySelector(".conquistas-hand");
    if (hand) {
      const panelLeft = panels[CONQUISTAS_INDEX].getBoundingClientRect().left;
      const groupCenter = first.left - panelLeft + startX + first.width / 2; // panel coordinates
      const handW = hand.offsetWidth;
      const handFrom = groupCenter - handW / 2;
      const handTo = panels[CONQUISTAS_INDEX].clientWidth;  // left edge at the right edge
      gsap.set(hand, { visibility: "visible" });
      badgesTl.fromTo(
        hand,
        { x: handFrom },
        {
          x: handTo,
          duration: (handTo - handFrom) / speed,
          ease: BADGES_EASE,
          onComplete: () => gsap.set(hand, { visibility: "hidden" })
        },
        0
      );
    }
  }


Object.assign(PAS.swipe, { addFlipbookSettle, addModulosHands, addConquistasBadges, FLIPBOOK_ENTER_Y });


})(window.PAS = window.PAS || {});
