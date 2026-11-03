'use strict';
/* Jogo "Corta o que é saudável" — página modulo1.html (módulo Metabolismo).
   Jogo de cortar alimentos ao estilo "ninja": os alimentos são lançados de baixo, desliza o dedo/rato por cima
   para os cortar. Alimentos saudáveis = pontos; se um cair, perdes uma vida; a comida pouco saudável faz
   o papel das bombas (se a cortares, o jogo acaba). Usa as classes jb-* do jogo-banco.css (painéis, HUD, moldura)
   e as jf-* do jogo-fruta.css. */

/* =========================================================
   CONFIGURAÇÃO — ajusta aqui a dificuldade e os alimentos
   ========================================================= */
const CONFIG = {
  LIVES: 3,                 // vidas (cada alimento saudável que cai sem ser cortado tira uma)
  EXTRA_LIFE_EVERY: 100,    // pontos para recuperar uma vida perdida
  GRAVITY: 2.1,             // gravidade, em alturas do cenário por segundo²
  ITEM_SIZE: 0.17,          // diâmetro do alimento = 17% da altura do cenário
  ITEM_MIN: 56,             // diâmetro mínimo (px)
  ITEM_MAX: 130,            // diâmetro máximo (px)
  SPAWN_GAP_START: 1.35,    // segundos entre lançamentos no início...
  SPAWN_GAP_MIN: 0.55,      // ...até este mínimo...
  SPAWN_RAMP_S: 90,         // ...ao fim de tantos segundos de jogo
  WAVE_MAX: 5,              // máximo de alimentos lançados de uma vez (cresce com o tempo)
  JUNK_CHANCE: 0.14,        // probabilidade de um lançamento ser comida pouco saudável ("bomba")
  JUNK_AFTER: 6,            // só aparece depois de tantos alimentos saudáveis lançados
  COMBO_WINDOW: 0.3,        // s entre cortes para contarem como combo (3+ cortes = bónus)
  TRAIL_MS: 260,            // duração do rasto da lâmina
  MITO_DELAY: 0.16,         // s que as metades ainda se afastam do corte antes de seguirem para a mitocôndria
  MITO_FLY_S: 0.6,          // s que as metades demoram a chegar à mitocôndria
  MITO_END_SCALE: 0.25,     // tamanho com que chegam (1 = tamanho inicial)
  SOUND: true,              // sons simples (podem ser desligados no botão "Som")

  /* Alimentos: "splat" (opcional) = escala do respingo (1 = acompanha o tamanho do alimento); "size" = tamanho relativo (1 = tamanho base; maior = alimento maior; é o lado MAIOR da imagem já sem margens
     transparentes). Cada um usa uma IMAGEM (src) — PNG com fundo transparente, de preferência quadrada, o alimento
     inteiro e centrado. "flesh" é a cor do interior (face do corte) e "color" a cor do sumo. */
  HEALTHY: [
    { name: 'Maçã', size: 0.9, src: 'pics/jogo-fruta/maca.png',     color: '#d62839', flesh: '#fff3c9' },
    { name: 'Laranja', size: 0.9, src: 'pics/jogo-fruta/laranja.png',  color: '#ff9f1c', flesh: '#ffb23d' },
    { name: 'Morango', size: 0.7, src: 'pics/jogo-fruta/morango.png',  color: '#e63946', flesh: '#ff7a85' },
    { name: 'Banana', size: 1.15, src: 'pics/jogo-fruta/banana.png',   color: '#f2c94c', flesh: '#fff6c8' },
    { name: 'Pera', size: 1.0, src: 'pics/jogo-fruta/pera.png',     color: '#c0ca33', flesh: '#f6f3c2' },
    { name: 'Melancia', size: 1.4, src: 'pics/jogo-fruta/melancia.png', color: '#ef476f', flesh: '#f0476a' },
    { name: 'Pimento', size: 1.0, src: 'pics/jogo-fruta/pimento.png',  color: '#e53935', flesh: '#ff8a65' },
    { name: 'Alface', size: 1.5, splat: 0.85, src: 'pics/jogo-fruta/alface.png',   color: '#7cb342', flesh: '#c5e1a5' },
    { name: 'Brócolo', size: 1.1, src: 'pics/jogo-fruta/brocolo.png',  color: '#4caf50', flesh: '#8fd26a' },
    { name: 'Tomate', size: 0.85, src: 'pics/jogo-fruta/tomate.png',   color: '#e53935', flesh: '#ff6a5e' },
    { name: 'Cenoura', size: 1.5, splat: 0.733, src: 'pics/jogo-fruta/cenoura.png',  color: '#f77f00', flesh: '#ff9a2e' }
  ],
  JUNK: [
    { name: 'Chocolate', size: 0.95, src: 'pics/jogo-fruta/chocolate.png',      color: '#5d3a1a', flesh: '#8a5a33' },
    { name: 'Batatas fritas', size: 1.0, src: 'pics/jogo-fruta/batatas-fritas.png', color: '#f2b705', flesh: '#ffe08a' },
    { name: 'Hambúrguer', size: 1.2, src: 'pics/jogo-fruta/hamburguer.png',     color: '#8d5524', flesh: '#c98a4b' },
    { name: 'Donut', size: 1.0, src: 'pics/jogo-fruta/donut.png',          color: '#e75480', flesh: '#f3c58b' },
    { name: 'Pizza', size: 1.3, src: 'pics/jogo-fruta/pizza.png',          color: '#d9822b', flesh: '#ffd27a' }
  ]
};

/* =========================================================
   Elementos e estado
   ========================================================= */
const $ = (id) => document.getElementById(id);
const stage = $('stage');
const canvas = $('jf-canvas');
const ctx = canvas.getContext('2d');
/* Camada própria para as manchas de sumo, por trás da mitocôndria (z-index 2; a mitocôndria tem 4 e os alimentos/canvas 10).
   Criada aqui, não precisa de nada no HTML. */
const splatCanvas = document.createElement('canvas');
splatCanvas.setAttribute('aria-hidden', 'true');
Object.assign(splatCanvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '2', pointerEvents: 'none' });
stage.insertBefore(splatCanvas, canvas);
const sctx = splatCanvas.getContext('2d');
const scoreEl = $('score');
const scoreBox = $('score-box');
const bestEl = $('best');
const livesEl = $('lives');
const restartBtn = $('restart-btn');
const soundBtn = $('sound-btn');
const flashEl = $('flash');

const FONT = getComputedStyle(document.body).fontFamily || 'sans-serif';
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let W = 0, H = 0, dpr = 1;
let muted = !CONFIG.SOUND;

const state = {
  screen: 'start',
  score: 0, best: 0, lives: CONFIG.LIVES, nextLife: CONFIG.EXTRA_LIFE_EVERY,
  time: 0, spawnTimer: 0, healthyLaunched: 0,
  over: false, overTimer: 0,
  items: [], halves: [], drops: [], splats: [], popups: [], rings: [], slashes: [],
  trail: [], combo: { n: 0, last: 0, x: 0, y: 0 },
  shake: 0
};

try { state.best = parseInt(localStorage.getItem('jf-best'), 10) || 0; } catch (e) { /* sem armazenamento */ }
bestEl.textContent = state.best;

/* =========================================================
   Imagens dos alimentos (desenhadas uma só vez num canvas)
   ========================================================= */
const SPRITE_PX = 256;

function makeSprite(def) {
  const c = document.createElement('canvas');
  c.width = c.height = SPRITE_PX;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  const img = new Image();
  img.onload = () => {
    // Recorta as margens transparentes: o que se vê passa a ocupar a imagem toda, e assim o tamanho do alimento,
    // a zona de corte e o efeito de corte coincidem com o desenho
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    try {
      const t = document.createElement('canvas');
      t.width = sw; t.height = sh;
      const tg = t.getContext('2d');
      tg.drawImage(img, 0, 0);
      const px = tg.getImageData(0, 0, sw, sh).data;
      let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        if (px[(y * sw + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 >= x0 && y1 >= y0) { sx = x0; sy = y0; sw = x1 - x0 + 1; sh = y1 - y0 + 1; }
    } catch (e) { /* sem acesso aos pixels (ex.: ficheiro aberto sem servidor): usa a imagem inteira */ }
    const k = Math.min(SPRITE_PX / sw, SPRITE_PX / sh);
    const w = sw * k, h = sh * k;
    def.ar = sw / sh;                                       // proporção do que se vê (largura / altura)
    g.clearRect(0, 0, SPRITE_PX, SPRITE_PX);
    g.drawImage(img, sx, sy, sw, sh, (SPRITE_PX - w) / 2, (SPRITE_PX - h) / 2, w, h);
  };
  img.onerror = () => {                                     // imagem em falta: círculo simples para o jogo continuar jogável
    console.warn('Imagem não encontrada:', def.src);
    g.fillStyle = def.color;
    g.beginPath(); g.arc(SPRITE_PX / 2, SPRITE_PX / 2, SPRITE_PX * 0.4, 0, Math.PI * 2); g.fill();
  };
  img.src = def.src;
  return c;
}
CONFIG.HEALTHY.forEach((d) => { d.sprite = makeSprite(d); d.bad = false; });
CONFIG.JUNK.forEach((d) => { d.sprite = makeSprite(d); d.bad = true; });

/* =========================================================
   Sons (gerados no browser, sem ficheiros)
   ========================================================= */
let audio = null, noiseBuf = null;
function audioCtx() {
  if (muted) return null;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    if (!noiseBuf) {
      noiseBuf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return audio;
  } catch (e) { return null; }
}
function noise(a, dur, f0, f1, vol) {
  const src = a.createBufferSource(); src.buffer = noiseBuf;
  const filt = a.createBiquadFilter(); filt.type = 'bandpass'; filt.Q.value = 1.2;
  filt.frequency.setValueAtTime(f0, a.currentTime);
  filt.frequency.exponentialRampToValueAtTime(f1, a.currentTime + dur);
  const gain = a.createGain();
  gain.gain.setValueAtTime(vol, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  src.connect(filt); filt.connect(gain); gain.connect(a.destination);
  src.start(); src.stop(a.currentTime + dur);
}
function sfxSlice() { const a = audioCtx(); if (a) noise(a, 0.16, 5200, 1200, 0.5); }
function sfxMiss() { const a = audioCtx(); if (a) noise(a, 0.25, 500, 160, 0.4); }
function sfxBoom() {
  const a = audioCtx(); if (!a) return;
  noise(a, 0.7, 900, 60, 0.9);
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(130, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(30, a.currentTime + 0.6);
  g.gain.setValueAtTime(0.8, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.6);
  o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.65);
}

/* =========================================================
   Ecrãs, HUD e vidas
   ========================================================= */
// O balão do fim de jogo tem de ter exatamente o tamanho do do tutorial: copia-lhe a altura da zona de texto
function syncEndSize() {
  const slides = $('tut-slides');
  if (slides) stage.style.setProperty('--jb-tut-slides-h', slides.offsetHeight + 'px');
}

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setScreen(name) {
  state.screen = name;
  stage.dataset.screen = name;
  restartBtn.disabled = name !== 'playing';
  // O balão do fim de jogo entra com a mesma animação do tutorial
  if (name === 'end') { syncEndSize(); if (mitoEl) mitoEl.classList.remove('is-pulse'); }
  const endCard = document.querySelector('#end-panel .jb-tut-card');
  if (endCard) {
    endCard.classList.remove('is-entering');
    if (name === 'end' && !REDUCED_MOTION) {
      void endCard.offsetWidth;                          // reinicia a animação
      endCard.classList.add('is-entering');
    }
  }
}

function bump() {
  scoreBox.classList.remove('jb-bump');
  void scoreBox.offsetWidth;
  scoreBox.classList.add('jb-bump');
}

function renderScore() { scoreEl.textContent = state.score; }

/* Aspeto da mitocôndria conforme as vidas: 3 = mitocondria.png (614x289), 2 = mitocondria2.png (614x247, fase
   intermédia), 1 = mitocondria3.png (608x205), 0 = mitocondria4.png (608x175, sem vidas). */
const MITO_SRC = {
  normal: 'pics/jogo-fruta/mitocondria.png',
  2: 'pics/jogo-fruta/mitocondria2.png',
  1: 'pics/jogo-fruta/mitocondria3.png',
  0: 'pics/jogo-fruta/mitocondria4.png'
};
Object.values(MITO_SRC).forEach((src) => { new Image().src = src; });   // pré-carrega, para a troca ser instantânea
function renderMito() {
  const mito = document.getElementById('jf-mito');
  if (!mito) return;
  const src = MITO_SRC[state.lives] || MITO_SRC.normal;
  if (!mito.src.endsWith(src)) mito.src = src;
}

function renderLives() {
  renderMito();
  livesEl.innerHTML = '';
  for (let i = 0; i < CONFIG.LIVES; i++) {
    const s = document.createElement('img');                // pics/jogo-fruta/lifeMito.png (mitocôndria em coração)
    s.className = 'jf-life' + (i >= state.lives ? ' is-lost' : '');
    s.src = 'pics/jogo-fruta/lifeMito.png';
    s.alt = i >= state.lives ? 'Vida perdida' : 'Vida';
    s.draggable = false;
    livesEl.appendChild(s);
  }
}

function addScore(n) {
  state.score += n;
  renderScore();
  bump();
  while (state.score >= state.nextLife) {          // vida extra a cada 100 pontos (se houver alguma perdida)
    state.nextLife += CONFIG.EXTRA_LIFE_EVERY;
    if (state.lives < CONFIG.LIVES) {
      state.lives++;
      renderLives();
      popup('+ vida', W / 2, H * 0.22, 34, '#8be28b');
    }
  }
}

/* =========================================================
   Início / fim do jogo
   ========================================================= */
function startGame() {
  if (mitoEl) mitoEl.classList.remove('is-pulse');         // para o salto não repetir quando a mitocôndria volta ao lugar
  delete stage.dataset.bench;                              // a mitocôndria já voltou ao lugar (ver startWithBubble)
  Object.assign(state, {
    score: 0, lives: CONFIG.LIVES, nextLife: CONFIG.EXTRA_LIFE_EVERY,
    time: 0, spawnTimer: 0.5, healthyLaunched: 0, over: false, overTimer: 0, shake: 0,
    items: [], halves: [], drops: [], splats: [], popups: [], rings: [], slashes: [], trail: [],
    combo: { n: 0, last: 0, x: 0, y: 0 }
  });
  renderScore();
  renderLives();
  setScreen('playing');
}

// Frases do ecrã final, por pontuação: 0 | menos de 20 | de 20 a 50 | mais de 50
const END_QUIPS = {
  zero: [
    'Todos começamos do zero. Tenta outra vez!',
    'Não faz mal, a primeira tentativa é para aprender!',
    'Respira fundo e volta a tentar, tu consegues!',
    'O primeiro passo é o mais difícil. A seguir vai correr melhor!'
  ],
  low: [
    'Bom começo! Com mais uma tentativa vais ainda mais longe!',
    'Estás a aprender! Cada jogo é um passo em frente.',
    'Não desistas, estás cada vez mais perto!',
    'Boa tentativa! Tenho a certeza de que consegues mais!',
    'A prática leva à perfeição. Vamos outra vez!'
  ],
  mid: [
    'Muito bem! Estás a melhorar a cada jogo!',
    'Ótima pontaria! Continua assim!',
    'Estás no bom caminho, não pares agora!',
    'Que bom resultado! Será que consegues ainda mais?',
    'Já és quase um mestre dos alimentos saudáveis!'
  ],
  high: [
    'Fantástico! Foste incrível!',
    'Uau, que resultado! Tens mesmo jeito para isto!',
    'Parabéns! Foi uma jogada de campeão!',
    'Excelente! Estás de parabéns, continua a surpreender-nos!',
    'Brilhante! A tua mitocôndria está orgulhosa de ti!'
  ]
};
function pickQuip(score) {
  const list = score <= 0 ? END_QUIPS.zero : score < 20 ? END_QUIPS.low : score <= 50 ? END_QUIPS.mid : END_QUIPS.high;
  return pick(list);
}

function gameOver(delay) {
  if (state.over) return;
  state.over = true;
  state.overTimer = delay;
  finishCombo();
  const newBest = state.score > state.best;
  if (newBest) {
    state.best = state.score;
    try { localStorage.setItem('jf-best', String(state.best)); } catch (e) { /* sem armazenamento */ }
  }
  bestEl.textContent = state.best;
  $('end-quip').textContent = pickQuip(state.score);
  $('end-score').textContent = state.score;
  $('end-score-unit').textContent = state.score === 1 ? 'alimento saudável' : 'alimentos saudáveis';
  $('end-best').textContent = state.best;
  $('end-best-unit').textContent = state.best === 1 ? 'ponto' : 'pontos';
  $('end-note').textContent = newBest && state.score > 0 ? 'Novo recorde!' : '';
}

// Comida pouco saudável cortada: perde-se uma vida (o jogo só acaba quando as vidas chegam a 0)
function loseLife(delay) {
  state.lives--;
  renderLives();
  if (state.lives <= 0) gameOver(delay);
}

// Alimento saudável que caiu sem ser cortado: perde-se 1 ponto (nunca abaixo de 0)
function missHealthy(x) {
  sfxMiss();
  if (state.score > 0) { state.score--; renderScore(); }
  popup('-1', Math.max(40, Math.min(W - 40, x)), H - 46, 40, '#e4572e');
}

/* =========================================================
   Lançamento dos alimentos
   ========================================================= */
function spawnGap() {
  const k = Math.min(1, state.time / CONFIG.SPAWN_RAMP_S);
  return CONFIG.SPAWN_GAP_START + (CONFIG.SPAWN_GAP_MIN - CONFIG.SPAWN_GAP_START) * k;
}

function launch(def) {
  const d = Math.max(CONFIG.ITEM_MIN, Math.min(CONFIG.ITEM_MAX, H * CONFIG.ITEM_SIZE));
  const r = (d / 2) * (def.size || 1);                      // metade do lado maior do alimento
  const ar = def.ar || 1;
  const hw = ar >= 1 ? r : r * ar, hh = ar >= 1 ? r / ar : r;   // meia largura / meia altura do que se vê
  const g = CONFIG.GRAVITY * H;
  const x0 = rand(0.12, 0.88) * W, y0 = H + r;
  const apexY = H * (1 - rand(0.6, 0.88));                  // até onde sobe
  const vy = -Math.sqrt(2 * g * (y0 - apexY));
  const flight = (2 * -vy) / g;                             // tempo até voltar à altura de lançamento
  const vx = (rand(0.1, 0.9) * W - x0) / flight;
  state.items.push({
    def, bad: def.bad, x: x0, y: y0, vx, vy, r, hw, hh,
    rot: rand(0, Math.PI * 2), vr: rand(-4, 4), sliced: false
  });
}

function spawnWave() {
  const waveMax = Math.min(CONFIG.WAVE_MAX, 1 + Math.floor(state.time / 20) + (state.time > 8 ? 1 : 0));
  const n = 1 + Math.floor(Math.random() * waveMax);
  let junkInWave = 0;
  for (let i = 0; i < n; i++) {
    const junk = state.healthyLaunched >= CONFIG.JUNK_AFTER && junkInWave < 1 && Math.random() < CONFIG.JUNK_CHANCE;
    if (junk) junkInWave++; else state.healthyLaunched++;
    launch(junk ? pick(CONFIG.JUNK) : pick(CONFIG.HEALTHY));
  }
}

/* =========================================================
   Cortes
   ========================================================= */
/* Respingo de sumo ao estilo Fruit Ninja, desenhado UMA vez para uma imagem (canvas) no momento do corte.
   Técnica "metaballs": desenham-se muitos círculos suaves (centro, raios com gota na ponta, gotinhas) que se somam e,
   depois, um limiar de opacidade funde-os numa só mancha orgânica, com pescoços e gotas que "pingam" do corpo,
   em vez de formas geométricas coladas. A imagem tem 4,4 raios de lado; o centro é o centro da mancha. */
const SPLAT_PX = 320, SPLAT_SPAN = 4.4;                      // tamanho da imagem (px) e quantos raios cabem nela
function makeSplatSprite(color) {
  const c = document.createElement('canvas');
  c.width = c.height = SPLAT_PX;
  const g = c.getContext('2d');
  const U = SPLAT_PX / SPLAT_SPAN, mid = SPLAT_PX / 2;       // px por raio; centro
  const ball = (x, y, r) => {                                // círculo suave (visível com raio ~r depois do limiar)
    const px = mid + x * U, py = mid + y * U, rg = r * U * 1.7;
    const grad = g.createRadialGradient(px, py, 0, px, py, rg);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.35, 'rgba(0,0,0,.85)');
    grad.addColorStop(0.6, 'rgba(0,0,0,.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(px, py, rg, 0, Math.PI * 2); g.fill();
  };
  // corpo central: vários círculos sobrepostos (contorno irregular)
  const nc = Math.round(rand(7, 10));
  for (let i = 0; i < nc; i++) {
    const a = rand(0, Math.PI * 2), d = rand(0, 0.28);
    ball(Math.cos(a) * d, Math.sin(a) * d, rand(0.3, 0.46));
  }
  // raios: cadeia de círculos que afinam para fora; os compridos acabam numa gota maior
  const nr = Math.round(rand(9, 14));
  for (let i = 0; i < nr; i++) {
    const a = (i / nr) * Math.PI * 2 + rand(-0.25, 0.25);
    const ca = Math.cos(a), sa = Math.sin(a);
    const long = Math.random() < 0.4;
    const len = long ? rand(1.2, 1.75) : rand(0.7, 1.1);
    const w0 = rand(0.16, 0.26) * (long ? 0.8 : 1);
    for (let d = 0.3; d < len; d += 0.045) {
      const t = (d - 0.3) / (len - 0.3);
      ball(ca * d, sa * d, Math.max(0.035, w0 * (1 - t * 0.85)));
    }
    if (long || Math.random() < 0.5) ball(ca * (len + 0.05), sa * (len + 0.05), rand(0.07, 0.15));   // gota na ponta
  }
  // gotinhas soltas
  const nd = Math.round(rand(10, 18));
  for (let i = 0; i < nd; i++) {
    const a = rand(0, Math.PI * 2), d = rand(1.0, 1.95);
    ball(Math.cos(a) * d, Math.sin(a) * d, rand(0.025, 0.075));
  }
  // limiar: transforma a soma de círculos suaves numa só mancha com bordo nítido.
  // O limiar varia de ponto para ponto (ruído suave em duas escalas): o bordo fica com pequenas irregularidades
  // e ondulações, como nas manchas reais, em vez de liso.
  const img = g.getImageData(0, 0, SPLAT_PX, SPLAT_PX), px = img.data;
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color) || [0, 'd6', '28', '39'];
  const cr = parseInt(m[1], 16), cg = parseInt(m[2], 16), cb = parseInt(m[3], 16);
  const makeNoise = (cell) => {                              // ruído de valor, interpolado suavemente
    const n = Math.ceil(SPLAT_PX / cell) + 2, grid = [];
    for (let i = 0; i < n * n; i++) grid.push(Math.random());
    return (x, y) => {
      const gx = x / cell, gy = y / cell, ix = Math.floor(gx), iy = Math.floor(gy);
      const fx = gx - ix, fy = gy - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const v = (i, j) => grid[(iy + j) * n + ix + i];
      return (v(0, 0) * (1 - sx) + v(1, 0) * sx) * (1 - sy) + (v(0, 1) * (1 - sx) + v(1, 1) * sx) * sy;
    };
  };
  // 1) Deformação do bordo: cada ponto lê o campo noutro sítio, deslocado por ruído em 3 escalas (ondulações grandes,
  //    médias e rugosidade fina). É isto que torna o contorno claramente irregular.
  const U1 = U;                                              // px por raio
  const wx = [makeNoise(U1 * 0.5), makeNoise(U1 * 0.2), makeNoise(U1 * 0.08)];
  const wy = [makeNoise(U1 * 0.5), makeNoise(U1 * 0.2), makeNoise(U1 * 0.08)];
  const WARP = [0.1 * U1, 0.06 * U1, 0.03 * U1];             // amplitude de cada escala (px) — aumenta para mais irregular
  const src = new Uint8Array(SPLAT_PX * SPLAT_PX);
  for (let i = 0; i < src.length; i++) src[i] = px[i * 4 + 3];
  const nBig = makeNoise(U1 * 0.25), nFine = makeNoise(U1 * 0.1);
  const IRREG = 0.3;                                         // variação do limiar (0 = nenhuma)
  for (let y = 0; y < SPLAT_PX; y++) {
    for (let x = 0; x < SPLAT_PX; x++) {
      let dx = 0, dy = 0;
      for (let k = 0; k < 3; k++) { dx += (wx[k](x, y) - 0.5) * 2 * WARP[k]; dy += (wy[k](x, y) - 0.5) * 2 * WARP[k]; }
      const sx = Math.max(0, Math.min(SPLAT_PX - 1, Math.round(x + dx)));
      const sy = Math.max(0, Math.min(SPLAT_PX - 1, Math.round(y + dy)));
      const i = (y * SPLAT_PX + x) * 4;
      const thr = 0.5 + (0.6 * nBig(x, y) + 0.4 * nFine(x, y) - 0.5) * IRREG * 2;
      const t = Math.max(0, Math.min(1, (src[sy * SPLAT_PX + sx] / 255 - (thr - 0.08)) / 0.16));
      px[i] = cr; px[i + 1] = cg; px[i + 2] = cb;
      px[i + 3] = Math.round(255 * t * t * (3 - 2 * t));
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function sliceItem(it, ang, px, py) {
  it.sliced = true;
  const nx = -Math.sin(ang), ny = Math.cos(ang);           // perpendicular ao corte
  // O corte passa por onde a lâmina realmente cruzou o alimento (não necessariamente pelo centro): as metades
  // ficam desiguais, como no Fruit Ninja
  const localCut0 = ang - it.rot;
  const ux = Math.cos(localCut0), uy = Math.sin(localCut0), vx = -uy, vy = ux;   // eixos do corte, no referencial da imagem
  const extent = Math.hypot(vx * it.hw, vy * it.hh);       // meia altura do alimento na direção perpendicular ao corte
  const off = 0;                                           // o corte passa sempre pelo meio do alimento (as duas metades ficam iguais)
  // Corda: onde a linha do corte entra e sai da elipse do alimento (comprimento real do corte)
  const qa = (ux / it.hw) ** 2 + (uy / it.hh) ** 2;
  const qb = 2 * off * (vx * ux / (it.hw * it.hw) + vy * uy / (it.hh * it.hh));
  const qc = (vx * off / it.hw) ** 2 + (vy * off / it.hh) ** 2 - 1;
  const qd = Math.sqrt(Math.max(0, qb * qb - 4 * qa * qc));
  const t1 = (-qb - qd) / (2 * qa), t2 = (-qb + qd) / (2 * qa);
  const tm = (t1 + t2) / 2;
  const push = H * 0.32;
  const localCut = ang - it.rot;                           // direção do corte em coordenadas da imagem
  const shared = { burst: false };                         // as duas metades partilham: a mitocôndria só reage uma vez
  [1, -1].forEach((side) => {
    state.halves.push({
      def: it.def, r: it.r, R: Math.max(it.hw, it.hh), side, localCut, off, t1, t2, rot: it.rot,
      toMito: !it.bad, shared, age: 0, scale: 1, alpha: 1, fly: null,   // saudável: segue para a mitocôndria
      x: it.x, y: it.y,
      vx: it.vx * 0.6 + nx * push * side + rand(-20, 20),
      vy: it.vy * 0.6 + ny * push * side - H * 0.1,
      vr: it.vr + side * rand(1.5, 4)
    });
  });
  state.slashes.push({ x: it.x + off * nx + tm * Math.cos(ang), y: it.y + off * ny + tm * Math.sin(ang), ang, len: t2 - t1, age: 0 });   // risco de luz do corte
  // sumo
  for (let i = 0; i < 16; i++) {
    const a = rand(0, Math.PI * 2), s = rand(0.15, 0.7) * H;
    state.drops.push({ x: it.x, y: it.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - H * 0.15, r: rand(2, 5) * (H / 500), life: rand(0.5, 0.9), age: 0, color: it.def.color });
  }
  state.splats.push({ x: it.x, y: it.y, r: (it.hw + it.hh) / 2 * (it.def.splat || 1) * rand(0.9, 1.3), color: it.def.color, age: 0, sprite: makeSplatSprite(it.def.color), rot: rand(0, Math.PI * 2) });

  if (it.bad) {                                            // comida pouco saudável: "explode"
    state.rings.push({ x: it.x, y: it.y, age: 0 });
    state.shake = 1;
    flashEl.classList.remove('is-on'); void flashEl.offsetWidth; flashEl.classList.add('is-on');
    sfxBoom();
    popup(it.def.name + '!', it.x, it.y - it.r, 34, '#e4572e');
    loseLife(0.9);
    return;
  }
  sfxSlice();                                              // a mitocôndria reage quando as metades chegam (ver update)
  addScore(1);
  popup('+1', it.x, it.y - it.r * 0.4, 28, '#fff');
  const c = state.combo;                                   // combo: cortes seguidos
  c.n++; c.last = state.time; c.x = it.x; c.y = it.y;
}

/* Libertação de energia da mitocôndria (pics/jogo-fruta/mitocondria.png): ela própria salta (bounce), brilha e
   solta ecos de energia com o mesmo contorno. O desenho é todo em CSS (.jf-mito.is-pulse e .jf-echo em jogo-fruta.css);
   aqui só se dispara. */
const mitoEl = document.getElementById('jf-mito');
const energyEl = document.getElementById('jf-energy');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function mitoBurst() {
  if (!mitoEl) return;
  mitoEl.classList.remove('is-pulse');
  void mitoEl.offsetWidth;                                 // reinicia a animação se acertares em dois seguidos
  mitoEl.classList.add('is-pulse');
  if (!energyEl || reducedMotion.matches) return;
  [0, 0.12].forEach((delay) => {                           // dois ecos seguidos
    const echo = document.createElement('img');
    echo.className = 'jf-echo';
    echo.src = mitoEl.src;
    echo.alt = '';
    echo.draggable = false;
    echo.style.setProperty('--delay', delay + 's');
    echo.addEventListener('animationend', () => echo.remove());
    energyEl.appendChild(echo);
  });
}

/* Centro da mitocôndria em coordenadas do canvas (o canvas cobre o cenário todo) */
function mitoTarget() {
  if (!mitoEl) return { x: W / 2, y: H * 0.3 };
  const m = mitoEl.getBoundingClientRect(), c = canvas.getBoundingClientRect();
  return {
    x: (m.left + m.width / 2 - c.left) * (W / c.width),
    y: (m.top + m.height / 2 - c.top) * (H / c.height)
  };
}

function finishCombo() {
  const c = state.combo;
  if (c.n >= 3) {
    addScore(c.n);
    popup('Combo x' + c.n + '  +' + c.n, Math.max(110, Math.min(W - 110, c.x)), Math.max(60, c.y - 40), 40, '#ffe27a');
  }
  c.n = 0;
}

/* A zona de corte é a elipse do que se vê (meia largura x meia altura, rodada com o alimento).
   Devolve o ponto do traço mais perto do centro, ou null se não tocou. */
function segmentHits(x0, y0, x1, y1, it) {
  const c = Math.cos(it.rot), sn = Math.sin(it.rot);
  const toLocal = (x, y) => {
    const dx = x - it.x, dy = y - it.y;
    return [(c * dx + sn * dy) / (it.hw * 0.97), (-sn * dx + c * dy) / (it.hh * 0.97)];
  };
  const [ax, ay] = toLocal(x0, y0), [bx, by] = toLocal(x1, y1);
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  const qx = ax + t * dx, qy = ay + t * dy;
  return qx * qx + qy * qy <= 1 ? { x: x0 + t * (x1 - x0), y: y0 + t * (y1 - y0) } : null;
}

function cutAlong(x0, y0, x1, y1) {
  if (state.screen !== 'playing' || state.over) return;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  for (let i = 0; i < state.items.length; i++) {
    const it = state.items[i];
    if (!it.sliced) {
      const hit = segmentHits(x0, y0, x1, y1, it);
      if (hit) sliceItem(it, ang, hit.x, hit.y);
    }
  }
  state.items = state.items.filter((it) => !it.sliced);
}

/* =========================================================
   Rato / toque
   ========================================================= */
let pressed = false, lastPt = null;

function pointFrom(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) };
}

canvas.addEventListener('pointerdown', (e) => {
  if (state.screen !== 'playing' || state.over) return;
  e.preventDefault();
  pressed = true;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignorar */ }
  lastPt = pointFrom(e);
  state.trail = [{ x: lastPt.x, y: lastPt.y, t: performance.now() }];
  audioCtx();                                              // desbloqueia o som no primeiro gesto
});

canvas.addEventListener('pointermove', (e) => {
  if (!pressed || !lastPt) return;
  e.preventDefault();
  const p = pointFrom(e);
  if (Math.hypot(p.x - lastPt.x, p.y - lastPt.y) < 2) return;
  state.trail.push({ x: p.x, y: p.y, t: performance.now() });
  cutAlong(lastPt.x, lastPt.y, p.x, p.y);
  lastPt = p;
});

['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) =>
  canvas.addEventListener(ev, () => { pressed = false; lastPt = null; }));

/* =========================================================
   Atualização
   ========================================================= */
function popup(text, x, y, size, color) {
  state.popups.push({ text, x, y, size, color, age: 0 });
}

function update(dt) {
  const g = CONFIG.GRAVITY * H;

  if (state.screen === 'playing' && !state.over) {
    state.time += dt;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) { spawnWave(); state.spawnTimer = spawnGap(); }
    if (state.combo.n > 0 && state.time - state.combo.last > CONFIG.COMBO_WINDOW) finishCombo();
  }
  if (state.over) {
    state.overTimer -= dt;
    if (state.overTimer <= 0 && state.screen === 'playing') setScreen('end');
  }

  state.items.forEach((it) => {
    it.vy += g * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt;
    if (it.vy > 0 && it.y - it.r > H) {
      it.gone = true;
      if (!it.bad && !state.over && state.screen === 'playing') missHealthy(it.x);
    }
  });
  state.items = state.items.filter((it) => !it.gone);

  state.halves.forEach((h) => {
    h.age += dt;
    if (h.toMito && h.age >= CONFIG.MITO_DELAY) {          // alimento saudável cortado: voa até à mitocôndria
      if (!h.fly) h.fly = { t: 0, x0: h.x, y0: h.y, to: mitoTarget(), rot0: h.rot };
      const f = h.fly;
      f.t = Math.min(1, f.t + dt / CONFIG.MITO_FLY_S);
      const e = f.t * f.t * (3 - 2 * f.t);                 // arranque e chegada suaves
      h.x = f.x0 + (f.to.x - f.x0) * e;
      h.y = f.y0 + (f.to.y - f.y0) * e;
      h.rot += h.vr * dt;
      h.scale = 1 + (CONFIG.MITO_END_SCALE - 1) * e;
      h.alpha = f.t < 0.8 ? 1 : (1 - f.t) / 0.2;
      if (f.t >= 1) {
        h.gone = true;
        if (!h.shared.burst) { h.shared.burst = true; mitoBurst(); }   // a mitocôndria liberta energia
      }
      return;
    }
    h.vy += g * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt;
  });
  state.halves = state.halves.filter((h) => !h.gone && (h.toMito || h.y - h.r < H + 40));

  state.drops.forEach((d) => { d.vy += g * 0.6 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.age += dt; });
  state.drops = state.drops.filter((d) => d.age < d.life);

  state.splats.forEach((s) => { s.age += dt; });
  state.splats = state.splats.filter((s) => s.age < 3);
  state.slashes.forEach((c) => { c.age += dt; });
  state.slashes = state.slashes.filter((c) => c.age < 0.28);
  state.rings.forEach((r) => { r.age += dt; });
  state.rings = state.rings.filter((r) => r.age < 0.6);
  state.popups.forEach((p) => { p.age += dt; });
  state.popups = state.popups.filter((p) => p.age < 0.9);

  const now = performance.now();
  state.trail = state.trail.filter((p) => now - p.t < CONFIG.TRAIL_MS);
  state.shake = Math.max(0, state.shake - dt * 2.2);
}

/* =========================================================
   Desenho
   ========================================================= */
function drawSprite(def, size) {
  ctx.drawImage(def.sprite, -size / 2, -size / 2, size, size);
}

function drawSplats() {
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sctx.clearRect(0, 0, W, H);
  state.splats.forEach((s) => {
    sctx.globalAlpha = 0.75 * (1 - s.age / 3);
    const size = s.r * SPLAT_SPAN;
    sctx.save();
    sctx.translate(s.x, s.y);
    sctx.rotate(s.rot);
    sctx.drawImage(s.sprite, -size / 2, -size / 2, size, size);
    sctx.restore();
  });
  sctx.globalAlpha = 1;
}

function draw() {
  drawSplats();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (state.shake > 0) ctx.translate((Math.random() - 0.5) * 16 * state.shake, (Math.random() - 0.5) * 16 * state.shake);

  // metades
  state.halves.forEach((h) => {
    ctx.save();
    ctx.globalAlpha = h.alpha;
    ctx.translate(h.x, h.y);
    ctx.scale(h.scale, h.scale);
    ctx.rotate(h.rot);
    ctx.rotate(h.localCut);
    // recorta a metade pela linha do corte (a linha y = off, no referencial da lâmina)
    ctx.beginPath();
    ctx.rect(-h.R * 2, h.side > 0 ? h.off : -h.R * 2, h.R * 4, h.side > 0 ? h.R * 2 : h.R * 2 + h.off);
    ctx.clip();
    ctx.rotate(-h.localCut);
    drawSprite(h.def, h.r * 2);
    ctx.rotate(h.localCut);
    // face cortada: o interior do alimento, com uma borda mais escura e um brilho (em vez de uma linha simples)
    const fw = Math.max(4, h.R * 0.14);
    const fy = h.off + (h.side > 0 ? fw / 2 : -fw / 2);
    ctx.lineCap = 'butt';                                   // sem pontas redondas: a face acaba exatamente onde o alimento acaba
    ctx.strokeStyle = h.def.color;
    ctx.lineWidth = fw + 3;
    ctx.beginPath(); ctx.moveTo(h.t1, h.off); ctx.lineTo(h.t2, h.off); ctx.stroke();
    ctx.strokeStyle = h.def.flesh || '#fff';
    ctx.lineWidth = fw;
    const inset = Math.min(fw * 0.5, (h.t2 - h.t1) * 0.2);
    ctx.beginPath(); ctx.moveTo(h.t1 + inset, fy); ctx.lineTo(h.t2 - inset, fy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = Math.max(1.5, fw * 0.25);
    const inset2 = (h.t2 - h.t1) * 0.15;
    ctx.beginPath(); ctx.moveTo(h.t1 + inset2, fy); ctx.lineTo(h.t2 - inset2, fy); ctx.stroke();
    ctx.restore();
  });

  // alimentos inteiros
  state.items.forEach((it) => {
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot);
    drawSprite(it.def, it.r * 2);
    ctx.restore();
  });

  // gotas de sumo
  state.drops.forEach((d) => {
    ctx.globalAlpha = Math.max(0, 1 - d.age / d.life);
    ctx.fillStyle = d.color;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // explosão
  state.rings.forEach((r) => {
    const k = r.age / 0.6;
    const rad = H * (0.05 + 0.4 * k);
    const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, rad);
    grad.addColorStop(0, 'rgba(255,240,170,' + (0.9 * (1 - k)) + ')');
    grad.addColorStop(0.6, 'rgba(255,140,40,' + (0.6 * (1 - k)) + ')');
    grad.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.fill();
  });

  // rasto da lâmina (como no Fruit Ninja): fita branca luminosa, fina na cauda e grossa na ponta, a desvanecer depressa
  const now = performance.now();
  const tr = state.trail;
  if (tr.length >= 2) {
    const maxW = Math.max(8, H * 0.024);
    const L = [], R = [];
    tr.forEach((p, i) => {
      const a = tr[Math.max(0, i - 1)], b = tr[Math.min(tr.length - 1, i + 1)];
      let dx = b.x - a.x, dy = b.y - a.y;
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const k = Math.max(0, 1 - (now - p.t) / CONFIG.TRAIL_MS);
      const w = maxW * Math.pow(k, 1.2) / 2;                // meia largura: 0 na cauda, máxima na ponta
      L.push({ x: p.x - dy * w, y: p.y + dx * w });
      R.push({ x: p.x + dy * w, y: p.y - dx * w });
    });
    const smooth = (pts, first) => {                          // curva suave pelos pontos médios
      if (first) ctx.moveTo(pts[0].x, pts[0].y); else ctx.lineTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    };
    const head = tr[tr.length - 1];
    const headW = (L[L.length - 1].x - R[R.length - 1].x) ** 2 + (L[L.length - 1].y - R[R.length - 1].y) ** 2;
    const buildPath = () => {
      ctx.beginPath();
      smooth(L, true);
      smooth(R.slice().reverse(), false);
      ctx.closePath();
    };
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(150,210,255,.95)';             // brilho azulado à volta
    ctx.shadowBlur = maxW * 1.8;
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    buildPath(); ctx.fill();
    ctx.shadowBlur = maxW * 0.6;
    buildPath(); ctx.fill();                                // segunda passagem: núcleo mais branco
    ctx.beginPath(); ctx.arc(head.x, head.y, Math.sqrt(headW) / 2, 0, Math.PI * 2); ctx.fill();   // ponta redonda
    ctx.restore();
  }

  // risco de luz no ponto do corte (desvanece depressa)
  state.slashes.forEach((c) => {
    const k = 1 - c.age / 0.28;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.ang);
    const grad = ctx.createLinearGradient(-c.len / 2, 0, c.len / 2, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,' + k + ')');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, c.len / 2, Math.max(1.5, 5 * k), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // textos que sobem
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  state.popups.forEach((p) => {
    const k = p.age / 0.9;
    ctx.globalAlpha = 1 - k * k;
    ctx.font = '800 ' + p.size * (H / 500) + 'px ' + FONT;
    ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#26323a';
    ctx.strokeText(p.text, p.x, p.y - k * H * 0.09);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - k * H * 0.09);
  });
  ctx.globalAlpha = 1;
}

/* =========================================================
   Tamanho do cenário e ciclo principal
   ========================================================= */
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = w; H = h;
  canvas.width = splatCanvas.width = Math.round(w * dpr);
  canvas.height = splatCanvas.height = Math.round(h * dpr);
}
resize();
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
window.addEventListener('resize', resize);

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);        // se o separador ficar em segundo plano, não "salta" no tempo
  lastT = now;
  if (W && H) { update(dt); draw(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* =========================================================
   Botões
   ========================================================= */
/* O balão (tutorial ou fim de jogo) sai com a animação do loading e só depois o jogo (re)começa */
const BUBBLE_OUT_MS = 800;                                 // = duração de jb-card-out (jogo-banco.css)
const EXPAND_MS = 1000;                                    // duração da elipse a expandir-se (fundo do tutorial)
stage.style.setProperty('--jf-intro-ms', EXPAND_MS + 'ms');
stage.style.setProperty('--jf-home-ms', BUBBLE_OUT_MS + 'ms');   // a mitocôndria volta ao lugar enquanto o balão sai
let bubbleTimer = 0;
/* "Jogar outra vez": enquanto o balão sai e a mitocôndria volta ao lugar, ela regenera-se passando pelas outras fases
   (0 vidas -> 1 -> 2 -> normal), um passo de cada vez, e chega ao jogo já com o aspeto original. */
const REGEN_START_MS = 100, REGEN_STEP_MS = 200;
function regenerateMito() {
  if (!mitoEl || REDUCED_MOTION) return;
  [MITO_SRC[1], MITO_SRC[2], MITO_SRC.normal].forEach((src, i) => {
    setTimeout(() => { if (state.screen === 'end') mitoEl.src = src; }, REGEN_START_MS + i * REGEN_STEP_MS);
  });
}

function startWithBubble(card, expand) {
  if (bubbleTimer) return;                                 // a saída já está a decorrer
  if (expand) stage.dataset.scene = 'game';                // a elipse do tutorial expande-se (só na primeira vez)
  else { stage.dataset.bench = 'home'; regenerateMito(); } // "Jogar outra vez": a mitocôndria volta ao lugar e regenera-se
  if (REDUCED_MOTION) { startGame(); return; }
  card.classList.remove('is-entering');
  card.classList.add('is-leaving');
  const wait = expand ? Math.max(BUBBLE_OUT_MS, EXPAND_MS) : BUBBLE_OUT_MS;
  bubbleTimer = setTimeout(() => {
    bubbleTimer = 0;
    startGame();                                           // o painel faz fade (.35s); o balão tem de continuar invisível até ele desaparecer
    setTimeout(() => card.classList.remove('is-leaving'), 600);
  }, wait);
}

/* =========================================================
   Tutorial em slides (painel inicial): Anterior / Seguinte / pontos; no último slide aparece "Começar"
   ========================================================= */
(function tutorial() {
  const slides = [...document.querySelectorAll('#tut-slides .jb-slide')];
  const prev = $('tut-prev'), next = $('tut-next'), start = $('start-btn'), dotsEl = $('tut-dots');
  const card = document.querySelector('#start-panel .jb-tut-card');
  let cur = 0;
  const dots = slides.map((_, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'jb-dot';
    d.setAttribute('aria-label', `Slide ${i + 1} de ${slides.length}`);
    d.addEventListener('click', () => show(i));
    dotsEl.appendChild(d);
    return d;
  });
  function show(i) {
    cur = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, k) => s.classList.toggle('is-active', k === cur));
    dots.forEach((d, k) => { d.classList.toggle('is-active', k === cur); d.setAttribute('aria-current', k === cur ? 'true' : 'false'); });
    const last = cur === slides.length - 1;
    prev.disabled = cur === 0;
    next.hidden = last;
    start.hidden = !last;
  }
  prev.addEventListener('click', () => show(cur - 1));
  next.addEventListener('click', () => show(cur + 1));
  start.addEventListener('click', () => startWithBubble(card, true));
  document.addEventListener('keydown', (e) => {      // setas do teclado, só enquanto o tutorial está visível
    if (state.screen !== 'start') return;
    if (e.key === 'ArrowRight') show(cur + 1);
    else if (e.key === 'ArrowLeft') show(cur - 1);
  });
  show(0);
  // O balão só aparece (animação do loading) quando o tutorial abre; entre slides só muda o conteúdo
  if (!REDUCED_MOTION) card.classList.add('is-entering');
})();

$('again-btn').addEventListener('click', () => startWithBubble(document.querySelector('#end-panel .jb-tut-card')));
window.addEventListener('resize', syncEndSize);
restartBtn.addEventListener('click', startGame);
soundBtn.addEventListener('click', () => {
  muted = !muted;
  soundBtn.textContent = muted ? 'Som: desligado' : 'Som: ligado';
  soundBtn.setAttribute('aria-pressed', String(!muted));
});

renderLives();
setScreen('start');
soundBtn.textContent = muted ? 'Som: desligado' : 'Som: ligado';