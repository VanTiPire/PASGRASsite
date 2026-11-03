(function (PAS) {

const { STATEMENT_INDEX, SOBRE_INDEX, MODULOS_INDEX, CONQUISTAS_INDEX, FAMILIA_INDEX, HERO_INDEX } = PAS.swipe;


  // Família's ground picture (FooterSection.png): normal look <-> its
  // resting filter (brightness .65, saturate 1.8, hue-rotate 30deg),
  // crossfaded during the Conquistas <-> Família swipe.
  // FAMILIA_NORMAL is Conquistas' own resting look (brightness .65, saturate
  // 1.06), so Família starts the swipe looking exactly like Conquistas and
  // then turns into the new filter.
  const FAMILIA_NORMAL = { "--familia-brightness": 0.65, "--familia-saturate": 1.06, "--familia-hue": "0deg" };
  const FAMILIA_FILTERED = { "--familia-brightness": 0.65, "--familia-saturate": 1.8, "--familia-hue": "30deg" };
  // Conquistas takes on that same look while it slides away toward Família
  // (and comes back from it), like Frase <-> Sobre share one look.
  const CONQUISTAS_FAMILIA_LOOK = {
    "--conquistas-sepia": "0%",
    "--conquistas-hue": "30deg",
    "--conquistas-saturate": 1.8,
    "--conquistas-brightness": 0.65,
    "--conquistas-contrast": 1
  };

  const STATEMENT_NORMAL = { "--statement-brightness": 1, "--statement-saturate": 1 };
  const STATEMENT_DIMMED = { "--statement-brightness": 0.65, "--statement-saturate": 1.06 };
  const SOBRE_NORMAL = { "--sobre-brightness": 1, "--sobre-saturate": 1 };
  const SOBRE_DIMMED = { "--sobre-brightness": 0.65, "--sobre-saturate": 1.06 };

  // Sobre<->Módulos / Módulos<->Conquistas: whichever module card is
  // active (if any) tints Módulos via CSS (--modulos-active-* on
  // .section--modulos, set by the :has() rules in style.css). While
  // mid-swipe between Módulos and either neighbour, that tint is
  // animated: it fades out of Módulos and across onto the neighbour's
  // matching --<neighbour>-active-* variables as the neighbour comes
  // into view, then fades away entirely once it settles — and grows
  // back into Módulos (from nothing) as you swipe back toward it.
  const MODULOS_ACTIVE_PROPS = [
    "--modulos-active-sepia",
    "--modulos-active-hue",
    "--modulos-active-saturate",
    "--modulos-active-brightness",
    "--modulos-active-contrast"
  ];
  const MODULOS_ACTIVE_IDENTITY = {
    "--modulos-active-sepia": "0%",
    "--modulos-active-hue": "0deg",
    "--modulos-active-saturate": 1,
    "--modulos-active-brightness": 1,
    "--modulos-active-contrast": 1
  };

  // Each neighbour panel that can crossfade the Módulos tint, keyed
  // by panel index: its own identity object and the CSS variable
  // prefix its filter chain in style.css reads (--<prefix>-active-*).
  const MODULOS_NEIGHBORS = {
    [SOBRE_INDEX]: {
      prefix: "sobre",
      identity: {
        "--sobre-active-sepia": "0%",
        "--sobre-active-hue": "0deg",
        "--sobre-active-saturate": 1,
        "--sobre-active-brightness": 1,
        "--sobre-active-contrast": 1
      }
    },
    [CONQUISTAS_INDEX]: {
      prefix: "conquistas",
      identity: {
        "--conquistas-active-sepia": "0%",
        "--conquistas-active-hue": "0deg",
        "--conquistas-active-saturate": 1,
        "--conquistas-active-brightness": 1,
        "--conquistas-active-contrast": 1
      }
    }
  };

  // Reads the *true* CSS-cascade tint for whichever module card is
  // active — not whatever value an earlier crossfade animation may
  // have left sitting in Módulos' inline style. Any inline override
  // is stripped before reading and restored right after, so nothing
  // visually jumps before the tween itself runs.
  function readActiveModuleTint(modulosPanel) {
    const prevInline = MODULOS_ACTIVE_PROPS.map((name) => modulosPanel.style.getPropertyValue(name));
    MODULOS_ACTIVE_PROPS.forEach((name) => modulosPanel.style.removeProperty(name));

    const cs = getComputedStyle(modulosPanel);
    const tint = {};
    MODULOS_ACTIVE_PROPS.forEach((name, i) => {
      tint[name] = cs.getPropertyValue(name).trim() || MODULOS_ACTIVE_IDENTITY[name];
    });

    MODULOS_ACTIVE_PROPS.forEach((name, i) => {
      if (prevInline[i]) modulosPanel.style.setProperty(name, prevInline[i]);
    });

    return tint;
  }

  // Crossfades the active module tint between Módulos and one of its
  // two neighbours (Sobre or Conquistas) for a single swipe transition.
  function crossfadeModulosTint(tl, panels, toIndex, neighborIndex) {
    const neighbor = MODULOS_NEIGHBORS[neighborIndex];
    const enteringNeighbor = toIndex === neighborIndex;
    const modulosPanel = panels[MODULOS_INDEX];
    const neighborPanel = panels[neighborIndex];

    const modulosTint = readActiveModuleTint(modulosPanel);
    const neighborTint = {};
    MODULOS_ACTIVE_PROPS.forEach((name) => {
      const suffix = name.slice("--modulos-active-".length);
      neighborTint[`--${neighbor.prefix}-active-${suffix}`] = modulosTint[name];
    });

    // Off for the duration of the crossfade (see the matching CSS
    // rule) so Módulos' own 0.4s "click a card" filter transition
    // doesn't also apply here and lag it behind the neighbour's tween.
    modulosPanel.classList.add("is-filter-crossfading");

    tl.fromTo(
      neighborPanel,
      enteringNeighbor ? neighborTint : neighbor.identity,
      enteringNeighbor ? neighbor.identity : neighborTint,
      0
    );
    tl.fromTo(
      modulosPanel,
      enteringNeighbor ? modulosTint : MODULOS_ACTIVE_IDENTITY,
      enteringNeighbor ? MODULOS_ACTIVE_IDENTITY : modulosTint,
      0
    );
    // Once the crossfade lands, drop the inline override so Módulos
    // goes back to relying purely on the CSS cascade — otherwise a
    // later click on a different module card while resting on
    // Módulos would be blocked by this leftover inline value (inline
    // always outranks the :has() rule).
    tl.set(modulosPanel, { clearProps: MODULOS_ACTIVE_PROPS.join(",") });
    tl.call(() => modulosPanel.classList.remove("is-filter-crossfading"));

    // Swiping back toward Módulos leaves the neighbour (Sobre /
    // Conquistas) with the tint still set inline. It is off-screen once
    // the slide lands, so drop it — otherwise the stale tint would show
    // up the next time that panel is entered without passing through
    // Módulos (e.g. Início -> Frase -> Sobre).
    if (!enteringNeighbor) {
      tl.set(neighborPanel, { clearProps: Object.keys(neighbor.identity).join(",") });
    }
  }

  // Drops any leftover module-card tint from Sobre and Conquistas
  // (except `exceptIndex`, the panel currently animating out).
  function clearNeighborTints(panels, exceptIndex) {
    [SOBRE_INDEX, CONQUISTAS_INDEX].forEach((i) => {
      if (i === exceptIndex) return;
      gsap.set(panels[i], { clearProps: Object.keys(MODULOS_NEIGHBORS[i].identity).join(",") });
    });
  }


  // Leaving a dimmed panel (Sobre, Módulos, Conquistas) for the hero
  // (Início). The hero has no filter of its own, so without this the
  // outgoing panel would slide away still dimmed/tinted. Instead its
  // filter fades out to the normal look over the same tween as the
  // slide — the same "disappearing" animation Frase<->Sobre uses.
  //
  // Once the tween lands the panel is off-screen, so the inline
  // overrides are cleared: the CSS cascade takes back over and the
  // panel is back to its dimmed resting look for the next time it is
  // entered (that jump is invisible, since the panel is out of view).

  // How long the filter fade takes when leaving for the hero. Shorter
  // than the 0.75s slide, so the dimming is gone quickly (lower = faster).
  const HERO_FILTER_DURATION = 0.35;

  const MODULOS_BASE_PROPS = [
    "--modulos-sepia",
    "--modulos-hue",
    "--modulos-saturate",
    "--modulos-brightness",
    "--modulos-contrast"
  ];
  const MODULOS_DIMMED = {
    "--modulos-sepia": "0%",
    "--modulos-hue": "0deg",
    "--modulos-saturate": 1.06,
    "--modulos-brightness": 0.65,
    "--modulos-contrast": 1
  };
  const MODULOS_NORMAL = {
    "--modulos-sepia": "0%",
    "--modulos-hue": "0deg",
    "--modulos-saturate": 1,
    "--modulos-brightness": 1,
    "--modulos-contrast": 1
  };

  const CONQUISTAS_BASE_PROPS = [
    "--conquistas-sepia",
    "--conquistas-hue",
    "--conquistas-saturate",
    "--conquistas-brightness",
    "--conquistas-contrast"
  ];
  const CONQUISTAS_DIMMED = {
    "--conquistas-sepia": "0%",
    "--conquistas-hue": "0deg",
    "--conquistas-saturate": 1.06,
    "--conquistas-brightness": 0.65,
    "--conquistas-contrast": 1
  };
  const CONQUISTAS_NORMAL = {
    "--conquistas-sepia": "0%",
    "--conquistas-hue": "0deg",
    "--conquistas-saturate": 1,
    "--conquistas-brightness": 1,
    "--conquistas-contrast": 1
  };

  const FAMILIA_BASE_PROPS = [
    "--familia-brightness",
    "--familia-saturate",
    "--familia-hue"
  ];
  // Normal look for the hero swipe: no dimming, no saturation boost, no hue shift.
  const FAMILIA_NORMAL_LOOK = {
    "--familia-brightness": 1,
    "--familia-saturate": 1,
    "--familia-hue": "0deg"
  };

  function fadeOutFilterForHero(tl, panels, fromIndex) {
    const panel = panels[fromIndex];

    // Frase isn't part of this transition (it's snapped off-screen by
    // gotoPanelDirect), but an earlier Frase -> Sobre swipe leaves its
    // dimmed --statement-* values inline. Reset them to normal now,
    // while it's out of view, so it doesn't reappear dimmed when you
    // go from the hero back to Frase.
    // (Pass a copy: GSAP mutates the vars object it is given — e.g. adds
    // duration:0 for set() — and STATEMENT_NORMAL is shared with the
    // Frase<->Sobre tween, which would otherwise become instant.)
    gsap.set(panels[STATEMENT_INDEX], Object.assign({}, STATEMENT_NORMAL));
    clearNeighborTints(panels, fromIndex);

    if (fromIndex === SOBRE_INDEX) {
      tl.fromTo(panel, Object.assign({}, SOBRE_DIMMED), Object.assign({}, SOBRE_NORMAL, { duration: HERO_FILTER_DURATION }), 0);
      tl.set(panel, { clearProps: Object.keys(SOBRE_NORMAL).join(",") });
    } else if (fromIndex === MODULOS_INDEX) {
      // Base dimming + whichever module card's tint is active, both
      // fading out together. The tint is read from the CSS cascade
      // (not any leftover inline value) — see readActiveModuleTint.
      const activeTint = readActiveModuleTint(panel);

      // Off for the duration (see the matching CSS rule) so Módulos'
      // own 0.4s filter transition doesn't lag behind the tween.
      panel.classList.add("is-filter-crossfading");

      tl.fromTo(
        panel,
        Object.assign({}, MODULOS_DIMMED, activeTint),
        Object.assign({}, MODULOS_NORMAL, MODULOS_ACTIVE_IDENTITY, { duration: HERO_FILTER_DURATION }),
        0
      );
      tl.set(panel, { clearProps: MODULOS_BASE_PROPS.concat(MODULOS_ACTIVE_PROPS).join(",") });
      tl.call(() => panel.classList.remove("is-filter-crossfading"));
    } else if (fromIndex === CONQUISTAS_INDEX) {
      tl.fromTo(panel, Object.assign({}, CONQUISTAS_DIMMED), Object.assign({}, CONQUISTAS_NORMAL, { duration: HERO_FILTER_DURATION }), 0);
      tl.set(panel, { clearProps: CONQUISTAS_BASE_PROPS.join(",") });
    } else if (fromIndex === FAMILIA_INDEX) {
      // Família's resting filter (brightness .65, saturate 1.8, hue 30deg)
      // fades out to the normal look, same as the other panels do when
      // leaving for the hero.
      tl.fromTo(
        panel,
        Object.assign({}, FAMILIA_FILTERED),
        Object.assign({}, FAMILIA_NORMAL_LOOK, { duration: HERO_FILTER_DURATION }),
        0
      );
      // Once it's off-screen, hand the look back to the CSS default so the
      // next time Família is entered it starts from its normal resting state.
      tl.set(panel, { clearProps: FAMILIA_BASE_PROPS.join(",") });
    }
  }

  function addFilterContinuity(tl, panels, fromIndex, toIndex) {
    if (toIndex === HERO_INDEX) {
      fadeOutFilterForHero(tl, panels, fromIndex);
      return;
    }

    const isStatementSobrePair =
      (fromIndex === STATEMENT_INDEX && toIndex === SOBRE_INDEX) ||
      (fromIndex === SOBRE_INDEX && toIndex === STATEMENT_INDEX);

    const isSobreModulosPair =
      (fromIndex === SOBRE_INDEX && toIndex === MODULOS_INDEX) ||
      (fromIndex === MODULOS_INDEX && toIndex === SOBRE_INDEX);

    const isModulosConquistasPair =
      (fromIndex === MODULOS_INDEX && toIndex === CONQUISTAS_INDEX) ||
      (fromIndex === CONQUISTAS_INDEX && toIndex === MODULOS_INDEX);

    const isConquistasFamiliaPair =
      (fromIndex === CONQUISTAS_INDEX && toIndex === FAMILIA_INDEX) ||
      (fromIndex === FAMILIA_INDEX && toIndex === CONQUISTAS_INDEX);

    if (isConquistasFamiliaPair) {
      const enteringFamilia = toIndex === FAMILIA_INDEX;
      tl.fromTo(
        panels[FAMILIA_INDEX],
        Object.assign({}, enteringFamilia ? FAMILIA_NORMAL : FAMILIA_FILTERED),
        Object.assign({}, enteringFamilia ? FAMILIA_FILTERED : FAMILIA_NORMAL),
        0
      );
      // Conquistas: its resting look <-> the footer look (same 0.75s).
      tl.fromTo(
        panels[CONQUISTAS_INDEX],
        Object.assign({}, enteringFamilia ? CONQUISTAS_DIMMED : CONQUISTAS_FAMILIA_LOOK),
        Object.assign({}, enteringFamilia ? CONQUISTAS_FAMILIA_LOOK : CONQUISTAS_DIMMED),
        0
      );
      // Whichever panel ends off-screen, hand its look back to the CSS default
      // (the next swipe always starts from explicit values, so nothing jumps).
      tl.set(panels[FAMILIA_INDEX], { clearProps: Object.keys(FAMILIA_NORMAL).join(",") });
      tl.set(panels[CONQUISTAS_INDEX], { clearProps: Object.keys(CONQUISTAS_FAMILIA_LOOK).join(",") });
    } else if (isStatementSobrePair) {
      const enteringSobre = toIndex === SOBRE_INDEX;
      tl.fromTo(
        panels[SOBRE_INDEX],
        enteringSobre ? SOBRE_NORMAL : SOBRE_DIMMED,
        enteringSobre ? SOBRE_DIMMED : SOBRE_NORMAL,
        0
      );
      tl.fromTo(
        panels[STATEMENT_INDEX],
        enteringSobre ? STATEMENT_NORMAL : STATEMENT_DIMMED,
        enteringSobre ? STATEMENT_DIMMED : STATEMENT_NORMAL,
        0
      );
    } else if (isSobreModulosPair) {
      crossfadeModulosTint(tl, panels, toIndex, SOBRE_INDEX);
    } else if (isModulosConquistasPair) {
      crossfadeModulosTint(tl, panels, toIndex, CONQUISTAS_INDEX);
    }
  }


PAS.swipe.addFilterContinuity = addFilterContinuity;


})(window.PAS = window.PAS || {});