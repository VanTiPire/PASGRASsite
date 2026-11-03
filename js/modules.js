(function (PAS) {

/* ===========================================================
   MODULE CARD SELECTION + EXPANDED DETAIL VIEW
   Clicking a module card still marks it .is-active so its filter/
   text-colour state (see .section--modulos:has(...) in style.css)
   persists instead of only showing on :hover, and still flips the
   card to its back face via the existing .is-active rule on
   .module-card__inner.

   On top of that, clicking a card now expands it into a detail
   view: .section__intro's own title+lead cross-fade and resize into
   a "O que vais descobrir neste módulo?" heading (see
   .section__intro-default/.section__intro-expanded in style.css —
   .section__intro itself resizes to match whichever of the two is
   showing, via a 1fr/0fr row-height animation, rather than staying
   fixed or collapsing away entirely), the other three cards fade
   away, the clicked card grows to the height .section__inner had a
   moment ago, and a .module-detail panel appears to its right with
   that module's title/text — read straight from the card's own front
   face, so there's nothing to keep in sync by hand. A close button,
   Escape, or clicking the expanded card again reverses it.
=========================================================== */
function initModuleCardSelection() {
  const modulesSection = document.getElementById("modulos");
  if (!modulesSection) return;

  const cards = modulesSection.querySelectorAll(".module-card");
  const cardList = Array.from(cards);
  const trail = modulesSection.querySelector(".module-trail");
  const sectionInner = modulesSection.querySelector(".section__inner");
  const detail = modulesSection.querySelector(".module-detail");
  const detailTitle = detail ? detail.querySelector(".module-detail__title") : null;
  const detailText = detail ? detail.querySelector(".module-detail__text") : null;
  const detailCta = detail ? detail.querySelector(".module-detail__cta") : null;
  const detailCtaImg = detailCta ? detailCta.querySelector("img") : null;

  // Fills the detail panel from a module card's own front face, so
  // there's nothing to keep in sync by hand. The last <p>/<ul> pair
  // (the "vais aprender sobre..." line + its list) is split off into a
  // .module-detail__highlight wrapper appended at the end of
  // .module-detail__text — everything earlier is appended directly.
  function populateDetailText(frontFace) {
    if (detailText) detailText.innerHTML = "";
    if (!frontFace) return;

    const items = Array.from(frontFace.querySelectorAll("p, ul"));
    const lastUlIndex = items.map((el) => el.tagName).lastIndexOf("UL");

    let highlightEl = null;

    items.forEach((el, i) => {
      const clone = el.cloneNode(true);
      const belongsToHighlight =
        lastUlIndex !== -1 && (i === lastUlIndex || i === lastUlIndex - 1);

      if (belongsToHighlight) {
        if (!highlightEl) {
          highlightEl = document.createElement("div");
          highlightEl.className = "module-detail__highlight";
        }
        highlightEl.appendChild(clone);
      } else if (detailText) {
        detailText.appendChild(clone);
      }
    });

    if (highlightEl && detailText) detailText.appendChild(highlightEl);
  }
  const prevBtn = modulesSection.querySelector(".module-nav--prev");
  const nextBtn = modulesSection.querySelector(".module-nav--next");
  const introEl = modulesSection.querySelector(".section__intro");
  const introTitle = modulesSection.querySelector(".section__intro .section__title");
  const introDefaultText = introTitle ? introTitle.getAttribute("data-default-text") : "";
  const introExpandedText = introTitle ? introTitle.getAttribute("data-expanded-text") : "";

  if (!cards.length || !trail) return;

  let expandedCard = null;

  // Bumped every time collapse() or expand() starts. The scheduled steps
  // inside expand() (see GROW_AT_MS / FOCUS_AT_MS below) check their own
  // captured id against this before doing anything, so closing (or
  // switching to another card) mid-sequence turns the rest of an
  // in-flight expand() into a no-op instead of applying it after the
  // fact.
  let sequenceId = 0;
  let pendingTimers = [];
  function clearPendingTimers() {
    pendingTimers.forEach((id) => clearTimeout(id));
    pendingTimers = [];
  }
  function after(ms, fn) {
    pendingTimers.push(setTimeout(fn, ms));
  }

  // These mirror the delays baked into style.css for the opening
  // sequence — see the .section--modulos.is-modules-expanded rules for
  // .module-card:not(.is-expanded), .module-card.is-expanded,
  // .module-card__inner and .module-detail. Every one of those was
  // written as the literal time-reverse of the matching close-side rule
  // (see the comments there for the close-side numbers this mirrors),
  // so opening and closing add up to the same total duration (1s) played
  // in opposite directions. GROW_AT_MS is when the siblings have
  // finished fading out and the card/detail panel start growing;
  // CLOSE_DURATION_MS is that same total, used when switching directly
  // between two cards (close fully, then open the new one).
  const GROW_AT_MS = 300;
  const CLOSE_DURATION_MS = 1000;
  // .section__intro's own heading text swap (see introTitle below) is
  // timed independently of GROW_AT_MS: it dips out and back in over a
  // short opacity fade rather than growing/shrinking, so this only
  // needs to land the swap-back once it's fully faded out and roughly
  // in step with .section__lead's own reappearance (its `opacity 0.7s
  // ease 0.5s` transition in style.css).
  const INTRO_SWAP_AT_MS = 300;

  // Unlike the flipbook's own updateNavButtons (see the turn.js block
  // further down this file), prev/next here wrap around the ends of
  // the trail instead of disabling — only disabled when nothing is
  // expanded at all (there's nothing to move between).
  function updateModuleNavButtons() {
    if (!prevBtn || !nextBtn) return;
    const index = expandedCard ? cardList.indexOf(expandedCard) : -1;
    prevBtn.disabled = index === -1;
    nextBtn.disabled = index === -1;
  }

  // Clears any inline transform/opacity/transition and .is-carousel-move
  // class a slideCarousel() may have left mid-flight — called before
  // every collapse()/expand()/slideCarousel() so an interrupted slide
  // (e.g. clicking next twice fast, or closing mid-slide) never leaves a
  // card or the detail panel stuck off-position or invisible.
  function resetCarouselInlineStyles() {
    cardList.concat(detail || []).forEach((el) => {
      if (!el) return;
      el.classList.remove("is-carousel-move");
      el.style.transform = "";
      el.style.opacity = "";
      el.style.transition = "";
    });
  }

  function collapse({ restoreFocus = true } = {}) {
    sequenceId++;
    const mySeq = sequenceId;
    clearPendingTimers();
    resetCarouselInlineStyles();

    const cardToRefocus = expandedCard;

    cards.forEach((c) => {
      c.classList.remove("is-active", "is-expanded");
      c.setAttribute("aria-pressed", "false");
      // Drop the inline height set while this card was expanded (see
      // expand()) — left in place it would override the collapsed
      // .module-card rule's aspect-ratio-driven sizing permanently.
      // Harmless here regardless of transition timing: height isn't
      // animated on close (0s in the base rule), it's invisible the
      // whole time the resize happens.
      c.style.height = "";
    });
    modulesSection.classList.remove("is-modules-expanded", "is-nav-visible");
    modulesSection.style.removeProperty("--modulos-expanded-height");
    if (detail) detail.setAttribute("aria-hidden", "true");

    // Fades out fast and undelayed (disappearing is brisk, as
    // elsewhere), then the text swaps back and fades in slowly once
    // faded out (INTRO_SWAP_AT_MS below) — landing alongside
    // .section__lead's own reappearance rather than snapping back in
    // well before the rest of the close sequence settles.
    if (introEl) {
      introEl.style.transition = "opacity 0.4s ease";
      introEl.style.opacity = "0";
    }
    after(INTRO_SWAP_AT_MS, () => {
      if (mySeq !== sequenceId) return;
      // Removed here (not synchronously above with is-modules-expanded)
      // for the same reason it's added at GROW_AT_MS in expand(): only
      // flip the layout back to left-aligned once .section__intro is
      // actually invisible, alongside the text reverting.
      modulesSection.classList.remove("is-intro-centered");
      if (introTitle && introDefaultText) {
        introTitle.innerHTML = introDefaultText;
      }
      // Released here rather than at the top of collapse(): until this
      // point the intro still shows the short expanded heading, so
      // dropping the pin any earlier would let it shrink back to that
      // content's height and jump the trail up mid-close — the exact
      // movement the pin exists to prevent. By the time this runs the
      // default two-line heading and the lead are back, so natural
      // height matches the frozen one and nothing moves.
      if (introEl) {
        introEl.style.minHeight = "";
      }
      if (introEl) {
        introEl.style.transition = "opacity 0.7s ease";
        introEl.style.opacity = "1";
      }
    });

    expandedCard = null;
    updateModuleNavButtons();

    if (restoreFocus && cardToRefocus) {
      cardToRefocus.focus({ preventScroll: true });
    }
  }

  // Opens `card` as the literal time-reverse of collapse(): every motion
  // collapse() plays is mirrored here in both direction (grow instead of
  // shrink, appear instead of disappear, flip-forward instead of
  // flip-back) and position in time (whatever finishes last on close
  // happens first on open, and vice-versa). The actual choreography
  // lives in style.css's .is-modules-expanded rules; this function just
  // triggers it in one go, the same way collapse() triggers its own
  // reverse in one go by removing the classes.
  function expand(card) {
    sequenceId++;
    const mySeq = sequenceId;
    clearPendingTimers();
    resetCarouselInlineStyles();

    // Measure the section's current full height (intro + trail) before
    // anything collapses, so the card can grow to match it later.
    const targetHeight = sectionInner.getBoundingClientRect().height;

    // Freeze the card's own expanded-height variable at its CURRENT
    // (collapsed) height first. .module-card.is-expanded reads this
    // variable for its `height`, and Chromium applies height/
    // aspect-ratio changes the instant the value is available, ignoring
    // any transition-delay (see the note on that rule in style.css).
    // Starting the variable equal to the card's present height means
    // adding .is-expanded below doesn't cause a premature jump; the
    // real jump only happens at GROW_AT_MS, once we deliberately raise
    // the variable to its target.
    const currentCardHeight = card.getBoundingClientRect().height;
    modulesSection.style.setProperty("--modulos-expanded-height", `${currentCardHeight}px`);
    // Same pin, but as a direct inline height on the card itself (see
    // the note on the height transition in style.css): the var above
    // still drives .module-detail's own (unanimated) height, but the
    // card's own height is now animated off this inline value instead,
    // so it can actually transition instead of snapping.
    card.style.height = `${currentCardHeight}px`;

    // Pin .section__intro at the height it has right now, while it still
    // holds the two-line heading and the lead. Expanding shrinks its
    // content (the lead collapses to height 0 and the heading becomes a
    // single centred line), and since the trail sits directly below the
    // intro in normal flow, that shrink used to drag every card upwards.
    // min-height rather than height, so the frozen value can only stop
    // the intro getting shorter — if a narrow viewport wraps the
    // expanded heading onto more lines than fit, it's still free to grow
    // rather than clipping the text. Released in collapse().
    if (introEl) {
      introEl.style.minHeight = `${introEl.getBoundingClientRect().height}px`;
    }

    // Everything fires together, exactly like collapse() removes every
    // class together — style.css's own delays (all mirrored from the
    // close-side rules) are what stagger the actual visual result.
    cards.forEach((c) => {
      const isThisCard = c === card;
      c.classList.toggle("is-expanded", isThisCard);
      c.setAttribute("aria-pressed", isThisCard ? "true" : "false");
    });
    card.classList.add("is-active");
    modulesSection.classList.add("is-modules-expanded");
    expandedCard = card;
    updateModuleNavButtons();

    // Disappears in step with the other module cards fading away
    // (opacity 0.3s ease, undelayed). Fires at the same instant as the
    // siblings' own fade-out below, using the same trigger point
    // (GROW_AT_MS still marks when that fade-out finishes).
    if (introEl) {
      introEl.style.transition = "opacity 0.3s ease";
      introEl.style.opacity = "0";
    }
    after(GROW_AT_MS, () => {
      if (mySeq !== sequenceId) return;
      // Added here rather than synchronously with is-modules-expanded
      // above: .section__intro is fully invisible by GROW_AT_MS (its
      // 0.3s fade-out has finished), so the jump to the centred layout
      // lands exactly when nothing is visible to jump, right alongside
      // the text swap below.
      modulesSection.classList.add("is-intro-centered");
      if (introTitle && introExpandedText) {
        introTitle.textContent = introExpandedText;
      }
      // Reappears in step with .module-detail fading in (opacity 0.2s
      // ease 0.8s in style.css). GROW_AT_MS (0.3s) has already elapsed,
      // so the remaining 0.5s of that 0.8s delay is baked into this
      // transition's own delay rather than a second JS wait — landing
      // the new heading at the exact moment the detail panel itself
      // becomes visible (0.3s + 0.5s = 0.8s, then 0.2s to fully shown).
      if (introEl) {
        introEl.style.transition = "opacity 0.2s ease 0.5s";
        introEl.style.opacity = "1";
      }
    });

    // The detail text itself isn't animated (only the panel's opacity
    // is), and that opacity stays at 0 until style.css lifts it near the
    // end of the sequence, so it's safe to fill it in right away.
    const frontFace = card.querySelector(".module-card__face--front");
    const titleEl = frontFace ? frontFace.querySelector("h3") : null;
    if (detailTitle) detailTitle.textContent = titleEl ? titleEl.textContent.trim() : "";
    populateDetailText(frontFace);
    if (detailCta) {
      detailCta.href = card.dataset.moduleHref || "#";
    }
    if (detailCtaImg) {
      detailCtaImg.src = card.dataset.ctaImage || "";
      detailCtaImg.alt = titleEl ? `Entrar no módulo: ${titleEl.textContent.trim()}` : "Entrar no módulo";
    }
    if (detail) detail.setAttribute("aria-hidden", "false");

    // Reveals the prev/next buttons in step with .module-detail's own
    // fade-in (opacity 0.2s ease 0.8s in style.css) via .is-nav-visible
    // (see the note on .module-nav there) — same 800ms mark used below
    // for the detail height jump, just a separate timer since this one
    // must survive independently of GROW_AT_MS's own check.
    after(800, () => {
      if (mySeq !== sequenceId) return;
      modulesSection.classList.add("is-nav-visible");
    });

    // The one step CSS can't drive on its own: raise the height to its
    // real target once the siblings have faded away, so the card's
    // growth lands at the same instant it and the detail panel start
    // growing (see GROW_AT_MS above). Sets both: the var (still what
    // .module-detail's own height reads) and the card's own inline
    // height, which is what actually animates now (see the note on
    // height in style.css) — kept in sync with .module-card.is-expanded's
    // mobile-only `min(55vh, ...)` cap, since an inline value would
    // otherwise override that cap outright.
    after(GROW_AT_MS, () => {
      if (mySeq !== sequenceId) return;
      modulesSection.style.setProperty("--modulos-expanded-height", `${targetHeight}px`);
      const isCompact = window.matchMedia("(max-width: 900px)").matches;
      const cardTargetHeight = isCompact
        ? Math.min(targetHeight, window.innerHeight * 0.55)
        : targetHeight;
      card.style.height = `${cardTargetHeight}px`;
    });

  }

  function toggleCard(card) {
    if (expandedCard === card) {
      collapse({ restoreFocus: false });
    } else if (expandedCard) {
      // Switching directly from one module to another: let the existing
      // close sequence fully play out first, then open the new one -
      // so a direct switch still reads as "close, then open" rather
      // than cross-fading two cards at once.
      collapse({ restoreFocus: false });
      after(CLOSE_DURATION_MS, () => expand(card));
    } else {
      expand(card);
    }
  }

  // Carousel-style move between two already-expanded modules (the
  // prev/next buttons). Unlike toggleCard()'s switch path, this never
  // returns to the grid: the section stays .is-modules-expanded the
  // whole time, and only the current card+detail pair slides out one
  // side while the next pair slides in from the other — the other,
  // already-collapsed cards are left alone throughout.
  const SLIDE_MS = 250;
  const SLIDE_DISTANCE = 40; // px

  function slideCarousel(newCard, direction) {
    sequenceId++;
    const mySeq = sequenceId;
    clearPendingTimers();
    resetCarouselInlineStyles();

    const outCard = expandedCard;
    const outX = direction > 0 ? -SLIDE_DISTANCE : SLIDE_DISTANCE;
    const inX = -outX;

    // Phase 1: slide the current pair out and fade it, in the
    // direction of travel.
    [outCard, detail].forEach((el) => {
      if (!el) return;
      el.classList.add("is-carousel-move");
      el.style.transform = `translateX(${outX}px)`;
      el.style.opacity = "0";
    });

    after(SLIDE_MS, () => {
      if (mySeq !== sequenceId) return;

      // The old pair has finished sliding out. It also needs to collapse
      // back to the grid's 0-width state — but instantly, rather than
      // being released into the default `:not(.is-expanded)` rule's own
      // transition (flex-basis/width/height delayed 0.3s, then animated
      // over 0.5s). Left alone, that delay means the outgoing card keeps
      // its full expanded width in the flex row for hundreds of ms after
      // it's already invisible — fighting the incoming card (which snaps
      // to its own full width instantly, see newInner/newCard below) for
      // space, so the incoming card/detail pair lands in the wrong spot
      // and visibly drifts into place as the outgoing one finally catches
      // up. Suspending its transition here and forcing it through the
      // same reflow used below collapses it in the same instant the
      // incoming card grows, so the row is already correctly sized
      // before the slide-in animation even starts.
      if (outCard) {
        outCard.classList.remove("is-carousel-move");
        outCard.style.transition = "none";
        outCard.style.transform = "";
        outCard.style.opacity = "";
        // Same reason as collapse(): this card is no longer expanded,
        // so its inline height (set while it was, see expand()) has to
        // go or it'll override the collapsed sizing rule.
        outCard.style.height = "";
      }

      // The new card's flip (.module-card__inner's rotateY, driven by
      // .is-active) normally takes 0.7s — far slower than this slide.
      // Suspend its transition so adding .is-active below resolves the
      // rotation instantly, while the card is still off-screen/invisible
      // (Phase 2 hasn't revealed it yet); it then arrives already turned
      // instead of flipping into view after the fact.
      const newInner = newCard.querySelector(".module-card__inner");
      if (newInner) newInner.style.transition = "none";

      cards.forEach((c) => {
        const isThisCard = c === newCard;
        c.classList.toggle("is-expanded", isThisCard);
        c.classList.toggle("is-active", isThisCard);
        c.setAttribute("aria-pressed", isThisCard ? "true" : "false");
      });
      // The expanded height itself isn't changing (only x-position/
      // opacity slide during a carousel move) — carry over the same
      // value the outgoing card had, already correctly capped for
      // mobile when it was first set in expand().
      newCard.style.height = modulesSection.style.getPropertyValue("--modulos-expanded-height");
      expandedCard = newCard;
      updateModuleNavButtons();

      if (newInner) {
        void newInner.offsetWidth; // apply the instant rotation before restoring the transition
        newInner.style.transition = "";
      }
      if (outCard) {
        void outCard.offsetWidth; // apply the instant collapse before restoring the transition
        outCard.style.transition = "";
      }

      // Same source of truth as expand(): the new module's own front
      // face, so there's nothing to keep in sync by hand.
      const newFrontFace = newCard.querySelector(".module-card__face--front");
      const titleEl = newFrontFace ? newFrontFace.querySelector("h3") : null;
      if (detailTitle) detailTitle.textContent = titleEl ? titleEl.textContent.trim() : "";
      populateDetailText(newFrontFace);
      if (detailCta) {
        detailCta.href = newCard.dataset.moduleHref || "#";
      }
      if (detailCtaImg) {
        detailCtaImg.src = newCard.dataset.ctaImage || "";
        detailCtaImg.alt = titleEl ? `Entrar no módulo: ${titleEl.textContent.trim()}` : "Entrar no módulo";
      }

      // Phase 2: place the incoming pair at the opposite edge with the
      // transition suspended, force a reflow so that position actually
      // paints, then release the transition on the next frame so it
      // slides in to rest — the same FLIP-style technique the loader
      // and other transitions in this file use elsewhere.
      [newCard, detail].forEach((el) => {
        if (!el) return;
        el.classList.add("is-carousel-move");
        el.style.transition = "none";
        el.style.transform = `translateX(${inX}px)`;
        el.style.opacity = "0";
      });
      void trail.offsetWidth;

      requestAnimationFrame(() => {
        if (mySeq !== sequenceId) return;
        [newCard, detail].forEach((el) => {
          if (!el) return;
          el.style.transition = "";
          el.style.transform = "";
          el.style.opacity = "";
        });
      });

      after(SLIDE_MS, () => {
        if (mySeq !== sequenceId) return;
        [newCard, detail].forEach((el) => el && el.classList.remove("is-carousel-move"));
      });
    });
  }

  // Moves the expanded card by `offset` positions (-1 = prev, +1 =
  // next), wrapping around the ends of the trail: stepping past the
  // last card lands on the first, and stepping before the first lands
  // on the last.
  function step(offset) {
    if (!expandedCard) return;
    const currentIndex = cardList.indexOf(expandedCard);
    const newIndex = (currentIndex + offset + cardList.length) % cardList.length;
    const newCard = cardList[newIndex];
    if (newCard) slideCarousel(newCard, offset);
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => toggleCard(card));

    // Keyboard support, since the cards are now focusable (tabindex + role="button").
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleCard(card);
      }
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener("click", () => step(-1));
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => step(1));
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && expandedCard) {
      collapse();
    }
  });
}

PAS.initModuleCardSelection = initModuleCardSelection;

})(window.PAS = window.PAS || {});
