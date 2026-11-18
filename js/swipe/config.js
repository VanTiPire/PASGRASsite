(function (PAS) {

  const HORIZONTAL_PAIRS = [
    [2, 3], // Sobre <-> Módulos
    [3, 4]  // Módulos <-> Conquistas
  ];

  // Sobre, Módulos and Conquistas form one horizontal strip, so any move
  // between two of them is horizontal — including the direct jump from a
  // nav click that skips the panel in between (Sobre <-> Conquistas).
  const HORIZONTAL_MIN = Math.min(...HORIZONTAL_PAIRS.flat());
  const HORIZONTAL_MAX = Math.max(...HORIZONTAL_PAIRS.flat());

  function axisFor(a, b) {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const isHorizontal = lo >= HORIZONTAL_MIN && hi <= HORIZONTAL_MAX;
    return isHorizontal ? "xPercent" : "yPercent";
  }

  function otherAxis(axis) {
    return axis === "xPercent" ? "yPercent" : "xPercent";
  }

  // Two pairs also crossfade a filter, so the transition reads as one
  // continuous shift across the swipe rather than something that only
  // happens to the incoming panel:
  //
  //  - Frase (statement) <-> Sobre: goes from a normal look to the
  //    dimmed background (--sobre-brightness/--sobre-saturate and
  //    --statement-brightness/--statement-saturate in style.css).
  //
  //  - Sobre <-> Módulos and Módulos <-> Conquistas: whichever
  //    module card is active (if any) tints Módulos via CSS. That
  //    tint fades out of Módulos and across onto the neighbouring
  //    panel as you swipe toward it, then disappears entirely once
  //    that panel settles — and grows back into Módulos as you swipe
  //    back (see addFilterContinuity / crossfadeModulosTint).
  //
  // Every other transition leaves these variables at their CSS
  // defaults, so no filter animation happens there.
  const STATEMENT_INDEX = 1;
  const SOBRE_INDEX = 2;
  const MODULOS_INDEX = 3;
  const CONQUISTAS_INDEX = 4;
  const FAMILIA_INDEX = 5;

const HERO_INDEX = 0;
PAS.swipe = {
  HORIZONTAL_PAIRS, axisFor, otherAxis,
  HERO_INDEX, STATEMENT_INDEX, SOBRE_INDEX, MODULOS_INDEX, CONQUISTAS_INDEX, FAMILIA_INDEX
};


})(window.PAS = window.PAS || {});