(function (PAS) {

/* ===========================================================
   CONQUISTAS: RANDOM STICKERS OVER THE BADGE ROW
   Adds ONE div (.badge-row__stickers) to .badge-row, the same size as the
   row and laid over it. The 19 pictures (pics/sticker1.png ...
   pics/sticker19.png) are placed inside it at random: random position,
   random size and random rotation (0-360deg), different on every page load.

   Every sticker is always TOTALLY inside the div: the room a picture needs
   is its rotated bounding box (w*|cos| + h*|sin| wide, w*|sin| + h*|cos|
   tall) plus a small margin for its shadow, and its centre can only land
   where that box fits. What is stored per sticker is the random choice
   (picture, size, angle and a 0-1 position inside the free area), and the
   pixel layout is recomputed whenever the row changes size, so the stickers
   stay inside after a resize too.

   Spots are picked with a "best candidate" pass (each sticker takes the
   free spot farthest from the others) so they spread out instead of
   clumping. Like the badges, the div starts fully clipped and is uncovered
   by the hands (addConquistasHand() in swipe-panels.js).
   Tweak the constants below.
=========================================================== */
function initRandomBadgeStickers() {
  const row = document.querySelector(".badge-row");
  if (!row || row.querySelector(".badge-row__stickers")) return;

  const STICKER_TOTAL = 19;   // pics/sticker1.png ... sticker19.png
  const STICKER_COUNT = 19;   // how many to place (each picture used once)
  const MIN_W = 8;            // sticker width, % of the row's width (min)
  const MAX_W = 12;           // sticker width, % of the row's width (max)
  const EDGE_PAD = 6;         // px kept free at the div's edges (shadow room)
  const PUSH_DISTANCE = 20;   // px a sticker moves away each time the mouse touches it
  const MASK_MAX = 96;        // px: hit-test masks are downscaled to this (full-size getImageData on 19 PNGs was heavy)
  const CANDIDATES = 15;      // spots tried per sticker (higher = more even)

  const rand = (min, max) => min + Math.random() * (max - min);

  // Shuffle the picture numbers (Fisher-Yates).
  const pool = Array.from({ length: STICKER_TOTAL }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const layer = document.createElement("div");
  layer.className = "badge-row__stickers";
  layer.setAttribute("aria-hidden", "true");

  // In the page now, so the div's real size is known (its height comes from
  // --stickers-extra in style.css: the div is taller than the row).
  row.appendChild(layer);

  // Random choices, as fractions: u / v = 0..1 position in the free area.
  const items = [];
  const placed = [];
  const count = Math.min(STICKER_COUNT, pool.length);
  const rowW0 = layer.clientWidth || 900;
  const rowH0 = layer.clientHeight || 400;
  for (let n = 0; n < count; n++) {
    // Best candidate: of a few random spots, keep the one farthest from the others.
    let best = null, bestDist = -1;
    for (let c = 0; c < CANDIDATES; c++) {
      const u = Math.random(), v = Math.random();
      const dist = placed.length
        ? Math.min(...placed.map((p) => Math.hypot((p.u - u) * rowW0, (p.v - v) * rowH0)))
        : Infinity;
      if (dist > bestDist) { best = { u, v }; bestDist = dist; }
    }
    placed.push(best);

    // box = wrapper that is positioned, sized, pushed and given the drop shadow;
    // img = the picture inside it, the only thing that is rotated. The shadow
    // is on the wrapper, so it is drawn after the rotation and keeps the same
    // direction on every sticker instead of turning with the picture.
    const box = document.createElement("div");
    box.className = "badge-row__sticker";
    const img = document.createElement("img");
    img.src = "pics/sticker" + pool.pop() + ".png";
    img.alt = "";
    img.draggable = false;
    box.appendChild(img);
    layer.appendChild(box);

    items.push({
      box,
      img,
      u: best.u,
      v: best.v,
      widthPct: rand(MIN_W, MAX_W),
      angle: rand(0, 360),
      ox: 0, // how far the mouse has pushed it so far (px)
      oy: 0
    });
  }

  // Pixel layout: size, then a centre that keeps the rotated box inside the div.
  const layout = () => {
    const W = layer.clientWidth;
    const H = layer.clientHeight;
    if (!W || !H) return;
    const lim = sectionBounds();
    items.forEach((it) => {
      const nw = it.img.naturalWidth, nh = it.img.naturalHeight;
      if (!nw || !nh) return; // picture not loaded yet: its load event calls layout()
      const w = (it.widthPct / 100) * W;
      const h = w * (nh / nw);
      const rad = (it.angle * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
      const bw = w * cos + h * sin; // rotated bounding box
      const bh = w * sin + h * cos;
      // The size never depends on the rotation: w x h is the picture's own size
      // (width from widthPct, height from its proportions), exactly what it
      // would be unrotated. Only the POSITION takes the rotation into account.
      const minX = EDGE_PAD + bw / 2, maxX = W - EDGE_PAD - bw / 2;
      const minY = EDGE_PAD + bh / 2, maxY = H - EDGE_PAD - bh / 2;
      it.w = w; it.h = h;                           // kept for the mouse hit test
      it.bw = bw; it.bh = bh;                       // rotated box, kept to keep pushes inside the section
      it.cx = minX + it.u * (maxX - minX);          // centre, px inside the div
      it.cy = minY + it.v * (maxY - minY);
      it.box.style.width = w.toFixed(1) + "px";
      it.box.style.left = it.cx.toFixed(1) + "px";
      it.box.style.top = it.cy.toFixed(1) + "px";
      it.box.style.transform = "translate(-50%, -50%)"; // centre only: no rotation here
      it.img.style.transform = "rotate(" + it.angle.toFixed(0) + "deg)"; // rotates around its own centre
      applyOffset(it, lim); // keeps a pushed sticker where it was pushed (re-clamped to the new size)
    });
  };

  // The section the stickers live in: pushed stickers may leave the div but
  // never the section. Its edges, in the div's own pixels (the same units as
  // it.cx / it.cy), measured on demand so scrolling, sliding and resizing are
  // all accounted for. The ratio handles a page that is scaled by a transform.
  const section = row.closest(".section--conquistas") || row.closest("section");
  const sectionBounds = () => {
    if (!section) return null;
    const box = layer.getBoundingClientRect();
    const sec = section.getBoundingClientRect();
    const sx = (box.width / (layer.offsetWidth || 1)) || 1;
    const sy = (box.height / (layer.offsetHeight || 1)) || 1;
    return {
      left: (sec.left - box.left) / sx,
      right: (sec.right - box.left) / sx,
      top: (sec.top - box.top) / sy,
      bottom: (sec.bottom - box.top) / sy
    };
  };

  // A sticker's accumulated push (ox / oy, px), kept so that its whole rotated
  // box (plus EDGE_PAD) stays inside the section.
  const applyOffset = (it, limIn) => {
    const lim = limIn || sectionBounds();
    if (lim && it.bw) {
      const minX = lim.left + EDGE_PAD + it.bw / 2, maxX = lim.right - EDGE_PAD - it.bw / 2;
      const minY = lim.top + EDGE_PAD + it.bh / 2, maxY = lim.bottom - EDGE_PAD - it.bh / 2;
      if (maxX >= minX) it.ox = Math.min(maxX - it.cx, Math.max(minX - it.cx, it.ox));
      if (maxY >= minY) it.oy = Math.min(maxY - it.cy, Math.max(minY - it.cy, it.oy));
    }
    it.box.style.translate = it.ox.toFixed(2) + "px " + it.oy.toFixed(2) + "px";
  };

  let layoutRaf = 0;
  const scheduleLayout = () => {
    if (layoutRaf) return;
    layoutRaf = requestAnimationFrame(() => { layoutRaf = 0; layout(); });
  };
  items.forEach((it) => it.img.addEventListener("load", scheduleLayout));
  layout();

  /* -- Buttons only work where they are visible ---------------------
     The sticker div is laid over the badges' buttons, so a sticker can hide
     part of one. A button must only react (hover, cursor, click) on a part
     that is visible, i.e. where no sticker covers it.
     "Covers" means the sticker's visible (non-transparent) pixels, read from
     a hidden copy of the picture (alpha channel); if the browser refuses to
     read the pixels (a page opened from file:// has no pixel access), the
     sticker's rotated rectangle is used instead.
     - While the mouse is over a sticker, the buttons get .is-covered
       (pointer-events: none in style.css): no hover effect, no pointer cursor.
     - A click that lands on a sticker is cancelled before it reaches the
       button (touch screens have no mouse move first, so this covers them).
     Keyboard use (Tab + Enter) is not affected. */
  const ALPHA_VISIBLE = 24; // 0-255: a pixel counts as "there" above this alpha
  const buildMask = (it) => {
    const nw = it.img.naturalWidth, nh = it.img.naturalHeight;
    if (!nw || !nh) return;
    try {
      const canvas = document.createElement("canvas");
      const k = Math.min(1, MASK_MAX / Math.max(nw, nh));
      const mw = Math.max(1, Math.round(nw * k)), mh = Math.max(1, Math.round(nh * k));
      canvas.width = mw; canvas.height = mh;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(it.img, 0, 0, mw, mh);
      it.mask = ctx.getImageData(0, 0, mw, mh).data;
      it.maskW = mw; it.maskH = mh;
    } catch (err) {
      it.mask = null; // pixels not readable: fall back to the rectangle
    }
  };
  items.forEach((it) => {
    it.img.addEventListener("load", () => buildMask(it));
    if (it.img.complete) buildMask(it);
  });

  // Is the point (px, py), in the div's own pixels, on a visible part of this sticker?
  const onSticker = (it, px, py) => {
    if (!it.w) return false;
    const dx = px - (it.cx + it.ox), dy = py - (it.cy + it.oy); // from its current centre
    const rad = (it.angle * Math.PI) / 180;
    const lx = dx * Math.cos(rad) + dy * Math.sin(rad);          // in the sticker's own axes
    const ly = -dx * Math.sin(rad) + dy * Math.cos(rad);
    if (Math.abs(lx) > it.w / 2 || Math.abs(ly) > it.h / 2) return false;
    if (!it.mask) return true;
    const mx = Math.min(it.maskW - 1, Math.max(0, Math.floor((lx / it.w + 0.5) * it.maskW)));
    const my = Math.min(it.maskH - 1, Math.max(0, Math.floor((ly / it.h + 0.5) * it.maskH)));
    return it.mask[(my * it.maskW + mx) * 4 + 3] > ALPHA_VISIBLE;
  };

  // Stickers are only "there" once the hands have uncovered them.
  const stickerAt = (clientX, clientY) => {
    if (layer.style.clipPath !== "none") return false;
    const box = layer.getBoundingClientRect();
    const px = (clientX - box.left) / ((box.width / (layer.offsetWidth || 1)) || 1);
    const py = (clientY - box.top) / ((box.height / (layer.offsetHeight || 1)) || 1);
    return items.some((it) => onSticker(it, px, py));
  };

  const buttons = Array.from(row.querySelectorAll(".badge .btn"));
  const onCoverMove = (e) => {
    const covered = stickerAt(e.clientX, e.clientY);
    buttons.forEach((b) => b.classList.toggle("is-covered", covered));
  };
  document.addEventListener("click", (e) => {
    if (e.detail === 0) return; // keyboard-triggered click: no pointer position
    if (!e.target.closest || !e.target.closest(".badge-row .btn")) return;
    if (stickerAt(e.clientX, e.clientY)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  /* -- Mouse collision ------------------------------------------------
     The div has pointer-events: none (so the badges' buttons underneath keep
     working), so the collision is tested here from the mouse position: is the
     pointer inside the sticker's rotated rectangle (at its CURRENT place)?
     When the mouse touches a sticker it moves PUSH_DISTANCE px directly away
     from the mouse, eased out (transition on `translate` in style.css), and
     it STAYS there: it never goes back. Each new touch (the mouse leaves it
     and touches it again) pushes it a further PUSH_DISTANCE px, and it can be
     pushed out of the div, but never out of the section. Nothing happens until the hands have finished
     uncovering the stickers. */
  const onPushMove = (e) => {
    const revealed = layer.style.clipPath === "none";
    const box = layer.getBoundingClientRect();
    const px = (e.clientX - box.left) / ((box.width / (layer.offsetWidth || 1)) || 1);
    const py = (e.clientY - box.top) / ((box.height / (layer.offsetHeight || 1)) || 1);
    const near = revealed; // stickers can be anywhere now, even outside the div

    items.forEach((it) => {
      let hit = false;
      const cx = it.cx + it.ox, cy = it.cy + it.oy;   // where the sticker is now
      if (near && it.w) {
        const dx = px - cx, dy = py - cy;
        const rad = (it.angle * Math.PI) / 180;
        const lx = dx * Math.cos(rad) + dy * Math.sin(rad);   // pointer in the sticker's own axes
        const ly = -dx * Math.sin(rad) + dy * Math.cos(rad);
        hit = Math.abs(lx) <= it.w / 2 && Math.abs(ly) <= it.h / 2;
      }
      if (hit && !it.touching) {
        // Direction: from the mouse through the sticker's centre = away from the mouse.
        const vx = cx - px, vy = cy - py;
        const len = Math.hypot(vx, vy) || 1;
        it.ox += (vx / len) * PUSH_DISTANCE;
        it.oy += (vy / len) * PUSH_DISTANCE;
        applyOffset(it);
        it.touching = true;
      } else if (!hit && it.touching) {
        it.touching = false; // the next touch pushes it again
      }
    });
  };

  // PERF: both behaviours share ONE mousemove listener that is throttled to one
  // run per frame and only active while Conquistas is on screen and uncovered.
  // Before, two document-wide handlers ran getBoundingClientRect() (forced layout)
  // on every mouse event, on every panel.
  let inView = false;
  if (section && "IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      if (!inView) buttons.forEach((b) => b.classList.remove("is-covered"));
    }).observe(section);
  } else {
    inView = true;
  }
  let pendingMove = null, moveRaf = 0;
  document.addEventListener("mousemove", (e) => {
    if (!inView || layer.style.clipPath !== "none") return;
    pendingMove = e;
    if (moveRaf) return;
    moveRaf = requestAnimationFrame(() => {
      moveRaf = 0;
      const ev = pendingMove;
      pendingMove = null;
      if (ev) { onCoverMove(ev); onPushMove(ev); }
    });
  }, { passive: true });
}

PAS.initRandomBadgeStickers = initRandomBadgeStickers;

})(window.PAS = window.PAS || {});
