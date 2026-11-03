// "Estás Pronto para começar?" — the walking kid stands on the left of the
// section. While the "Começar Já" button is hovered (or focused) it starts
// walking, slowly, to the button, and stops just short of it facing it.
// When the button is left it first turns round, then walks back to where it
// was and turns to its resting pose. Skipped with prefers-reduced-motion.
//
// The kid is a sprite: pics/walking_kid/Frame_1.png … Frame_8.png. At rest
// (and while turning on the spot) it shows Frame_2; while it is actually
// walking it cycles through all 8 frames at 10 FPS. The src in index.html
// (Frame_2.png) tells this script where the frames are.
(function initKidWalk() {
  const kid = document.querySelector(".familia__kid");
  const btn = document.querySelector(".familia__content .btn");
  const root = document.querySelector(".section--familia");
  if (!kid || !btn || !root) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const SPEED = 130;   // px per second — walking speed (lower = slower)
  const ACCEL = 160;   // px/s² — how gently it sets off and slows down
  const TURN = 4;      // higher = turns faster
  const GAP = 12;      // px left between the kid and the button
  const TURN_BACK = -1; // direction of every turn on the way home: -1 = left (counter-clockwise), 1 = right
  const FACING = 0;    // deg — where the picture "looks" when unrotated
                       // (0 = right, 90 = down, 180 = left, -90 = up)

  const FRAME_COUNT = 8;
  const REST_FRAME = 2; // frame shown when it isn't walking
  const FPS = 10;       // frames per second while walking

  const DEG = Math.PI / 180;
  const framesBase = kid.getAttribute("src").replace(/Frame_\d+\.png$/, "");
  const framePath = (n) => framesBase + "Frame_" + n + ".png";
  for (let n = 1; n <= FRAME_COUNT; n++) new Image().src = framePath(n); // preload
  let shown = REST_FRAME;   // frame currently on screen
  let walkTime = 0;         // seconds spent walking since it last set off
  let fx = 0, fy = 0;       // current offset from the resting place (px)
  let ang = 0;              // current rotation (rad)
  let v = 0;                // current walking speed (px/s)
  let goalX = 0, goalY = 0; // offset it is walking to
  let atButton = false;     // is the goal the button (or home)?
  let faceAng = 0;          // rotation it wants once it has arrived
  let running = false, last = 0;
  let turnDir = 0;          // +1 / -1 = forced direction of big turns (0 = shortest way)

  // Centre and size of an element inside the section, measured with
  // offsetLeft/offsetTop: they ignore transforms and `translate`, so the
  // result doesn't change while the kid walks or a panel is swiped.
  function box(el) {
    let x = 0, y = 0;
    for (let n = el; n && n !== root; n = n.offsetParent) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return { cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2, w: el.offsetWidth, h: el.offsetHeight };
  }

  function setGoal(toButton) {
    // Everything on the way back (turning to go home, turning to the resting
    // pose, reversing mid-walk) always rotates left (counter-clockwise).
    turnDir = toButton ? 0 : TURN_BACK;
    atButton = toButton;
    if (!toButton) {
      goalX = goalY = 0;
      faceAng = 0; // resting pose
      return;
    }
    // Resting place = where the kid is laid out; the current offset is
    // already included in `fx, fy`, so aim from the resting place.
    const k = box(kid), b = box(btn);
    // The kid rotates around its transform-origin (the right-centre of the
    // picture, see style.css), so that point is what travels: aim it, not
    // the picture's centre. It stays put while the kid turns, so the front
    // of the kid is what ends up GAP px from the button.
    const o = getComputedStyle(kid).transformOrigin.split(" ").map(parseFloat);
    const px = k.cx - k.w / 2 + (o[0] || 0), py = k.cy - k.h / 2 + (o[1] || 0);
    const dx = b.cx - px, dy = b.cy - py;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    // How far from the button's centre its edge is along that direction.
    const edge = Math.min(b.w / 2 / (Math.abs(ux) || 1e-6), b.h / 2 / (Math.abs(uy) || 1e-6));
    const stop = Math.min(edge + GAP, dist); // never walk past its own place
    goalX = dx - ux * stop;
    goalY = dy - uy * stop;
    faceAng = Math.atan2(uy, ux) - FACING * DEG;
  }

  // Turns `ang` towards `want` the short way round; returns what is left.
  function turnTo(want, dt) {
    let diff = Math.atan2(Math.sin(want - ang), Math.cos(want - ang));
    // Going home: big turns always go the TURN_BACK way, not the shortest way.
    if (turnDir && Math.abs(diff) > 0.3 && Math.sign(diff) !== turnDir) {
      diff += turnDir * 2 * Math.PI;
    }
    ang += diff * (1 - Math.exp(-TURN * dt));
    return Math.abs(diff);
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const dx = goalX - fx, dy = goalY - fy;
    const dist = Math.hypot(dx, dy);
    let busy = false;

    if (dist > 0.5) {
      busy = true;
      // 1. Turn to face the way it has to go...
      const left = turnTo(Math.atan2(dy, dx) - FACING * DEG, dt);
      // 2. ...and only set off once it is (nearly) facing that way. Speed
      // builds up gently and drops again over the last stretch.
      const wanted = left < 0.2 ? Math.min(SPEED, Math.sqrt(2 * ACCEL * dist)) : 0;
      v += Math.max(-ACCEL * dt, Math.min(ACCEL * dt, wanted - v));
      const step = Math.min(dist, v * dt);
      fx += (dx / dist) * step;
      fy += (dy / dist) * step;
    } else {
      // Arrived: face the button (or take the resting pose back at home).
      fx = goalX;
      fy = goalY;
      v = 0;
      busy = turnTo(faceAng, dt) > 0.002;
    }

    // Walking = actually moving (not while it is only turning on the spot).
    // It starts the cycle from the resting frame, so it sets off smoothly.
    let want = REST_FRAME;
    if (v > 2) {
      walkTime += dt;
      want = ((REST_FRAME - 1 + Math.floor(walkTime * FPS)) % FRAME_COUNT) + 1;
    } else {
      walkTime = 0;
    }
    if (want !== shown) {
      shown = want;
      kid.src = framePath(shown);
    }

    // Walk offset + the parallax offset the ground is moving with.
    kid.style.translate =
      "calc(" + fx.toFixed(2) + "px + var(--par-x, 0px)) calc(" + fy.toFixed(2) + "px + var(--par-y, 0px))";
    kid.style.rotate = ang.toFixed(4) + "rad";
    if (busy) {
      requestAnimationFrame(frame);
    } else {
      // Settled: drop the full turns it has accumulated (same look, no jump).
      ang = Math.atan2(Math.sin(ang), Math.cos(ang));
      kid.style.rotate = ang.toFixed(4) + "rad";
      running = false;
    }
  }

  function go(toButton) {
    setGoal(toButton);
    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
  }

  btn.addEventListener("pointerenter", (e) => {
    if (!e.pointerType || e.pointerType === "mouse") go(true);
  });
  btn.addEventListener("pointerleave", () => go(false));
  btn.addEventListener("focus", () => go(true));
  btn.addEventListener("blur", () => go(false));
  window.addEventListener("resize", () => {
    if (atButton) go(true); // re-aim after a layout change
  });
})();
