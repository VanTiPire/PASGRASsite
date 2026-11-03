'use strict';
/* Jogo "Apanha-os antes de se sentarem" — página modulo3.html */

/* =========================================================
   CONFIGURAÇÃO — ajusta aqui a duração, velocidade e dificuldade
   (velocidades em "fração da largura do cenário por segundo")
   ========================================================= */
const CONFIG = {
  // JOGO CONTÍNUO, sem rondas. O ritmo dos aparecimentos é o do jogo da fruta (jogo-fruta.js):
  // de X em X segundos aparece uma "vaga" de 1 a waveMax pessoas ao mesmo tempo; o intervalo entre vagas
  // encurta com o tempo e o tamanho máximo da vaga cresce com o tempo.
  LIVES: 3,                 // vidas: perde-se 1 sempre que uma pessoa se senta no banco
  SPAWN_START: 0.5,         // a primeira vaga aparece ao fim de x s
  SPAWN_GAP_START: 1.35,    // segundos entre vagas no início...
  SPAWN_GAP_MIN: 0.55,      // ...até este mínimo...
  SPAWN_RAMP_S: 90,         // ...ao fim de tantos segundos de jogo
  WAVE_MAX: 5,              // máximo de pessoas por vaga (waveMax = 1 + t/20 s, +1 depois dos 8 s, até este valor)
  JUNK_CHANCE: 0.14,        // probabilidade de cada pessoa da vaga ser a que salta (a "comida pouco saudável")
  JUNK_AFTER: 6,            // só pode aparecer depois de tantas pessoas normais já terem aparecido
  // Limites para o ecrã não ficar cheio. No jogo da fruta cada elemento desaparece ao fim de ~2 s; aqui as pessoas
  // demoram vários segundos a atravessar o cenário, por isso sem limites acumulam-se.
  MAX_WALKING: 5,           // máximo de pessoas normais a caminhar ao mesmo tempo (as sentadas não contam)
  JUMPER_MAX: 1,            // máximo de personagens que saltam em simultâneo
  JUMPER_COOLDOWN_S: 6,     // segundos mínimos entre o aparecimento de uma e o da seguinte
  WAVE_STAGGER: 1.2,        // pessoas da mesma vaga pelo mesmo lado entram afastadas x larguras de pessoa (para não se sobreporem)
  BASE_SPEED: 0.14,         // velocidade de caminhada no início (fração da largura do cenário por segundo)
  SPEED_MAX_MULT: 1.5,      // a velocidade vai subindo até x vezes a inicial...
  SPEED_RAMP_S: 90,         // ...ao fim de tantos segundos (1 = velocidade constante)
  GAME_OVER_DELAY: 0,       // s entre perder a última vida e aparecer o ecrã final (0 = logo que a pessoa se senta)
  SIT_ANIM_MS: 450,         // duração da animação de sentar
  SIT_STAY_MS: 2600,        // tempo que ficam sentadas antes de saírem
  LEAVE_MS: 400,            // desaparecimento suave da pessoa sentada
  CATCH_ANIM_MS: 260,       // animação de uma pessoa apanhada (começa quando a bola lhe bate)
  // Entrada do jogo (botão "Começar"): os miúdos do football.gif encolhem para o fundo e, ao mesmo tempo, o banco
  // sobe de baixo a crescer até ao tamanho final e o chão sobe (animação em jogo-banco-intro.css; o CSS lê estas durações).
  INTRO: { MS: 1000 },        // duração ÚNICA: miúdos, banco e caminho movem-se em sincronia
  // Bola (pics/jogo-banco/ball.png): voa até à cabeça, ressalta e bate no chão
  BALL_IMAGE: 'pics/jogo-banco/ball.png',
  BALL_FLIGHT_MS: 90,       // tempo que a bola demora a chegar à cabeça
  BALL_GRAVITY: 5200,       // em "píxeis da floorGame.png" por s² (escala com o cenário)
  BALL_BOUNCE: 0.55,        // fração da velocidade que se mantém em cada ressalto no chão
  BALL_MAX_BOUNCES: 3,
  BALL_FADE_MS: 350,        // a bola desaparece depois de parar
  // Caminhos (alturas em fração da altura do CHÃO; a zona de terra vai de ~0.66 a 1):
  LANE_JUMPER: 0.72,           // caminho de cima: só para a personagem que salta
  LANES_WALKER: [0.82, 0.92],  // dois caminhos para a personagem que caminha
  LANE_SIT: 0.82,              // caminho comum onde TODAS convergem mesmo antes de se sentarem (a animação de sentar fica igual)
  SIT_APPROACH: 0.15,          // distância ao lugar (fração da largura do cenário) em que começam a convergir
  SLOT_OFFSETS: [-0.34, 0, 0.34], // lugares no banco (fração da largura do banco)
  // Personagens: andam com um GIF (gif) ou, em plano B, por animação de frames (frames); sentam-se com uma imagem própria (sit).
  // Para acrescentar mais personagens, junta mais objetos a esta lista.
  CHARACTERS: [
    // Personagem que anda com um GIF animado (gif): 420x611, 8 frames de 200 ms. O tamanho (frameW x frameH) é
    // lido do próprio GIF quando carrega; os valores aqui têm de bater certo com ele. O GIF tem a sua própria velocidade (não acompanha a da ronda).
    // Se o GIF não existir, usa os 8 frames de baixo (frames), que são sincronizados com a velocidade:
    // stride = distância (px da imagem) que o corpo avança num ciclo. hip = altura das ancas (fração de frameH).
    {
      gif: 'pics/jogo-banco/person1Walk.gif',
      frames: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `pics/jogo-banco/Person1Frame${n}.png`),
      frameW: 420, frameH: 611, hip: 0.50,           // tamanho do GIF
      framesW: 340, framesH: 590, stride: 500,       // tamanho dos frames (plano B) e distância por ciclo
      // Imagem da pessoa sentada. sitSeat = que fração da altura da imagem (de cima para baixo)
      // fica em contacto com o assento do banco.
      sit: 'pics/jogo-banco/person1Sitting.png', sitW: 270, sitH: 463, sitSeat: 0.60
    },
    // Cada nova pessoa escolhe uma personagem desta lista ao acaso, todas com a MESMA probabilidade.
    // Anda com um GIF (420x611, 8 frames de 200 ms) e senta-se com uma imagem própria (sit).
    {
      gif: 'pics/jogo-banco/person2Walk.gif', frameW: 420, frameH: 611, hip: 0.50,
      sit: 'pics/jogo-banco/person2Sitting.png', sitW: 270, sitH: 427, sitSeat: 0.535
    },
    {
      gif: 'pics/jogo-banco/person3Walk.gif', frameW: 420, frameH: 611, hip: 0.50,
      sit: 'pics/jogo-banco/person3Sitting.png', sitW: 256, sitH: 392, sitSeat: 0.58
    }
  ],
  // Pessoa que SALTA e RODA 180° a cada salto (caminho de cima). Usa UMA imagem:
  //   posição 1 (a imagem de cabeça para baixo): toca no chão com os braços abertos e as pernas para cima;
  //   posição 2 (a imagem como está):             toca no chão com as pernas abertas e os braços para cima.
  // Salta e roda 180° → posição 2; salta e roda mais 180° → posição 1; e assim sucessivamente.
  // NÃO se senta: atravessa o ecrã de um lado ao outro, pelo caminho de cima, e sai do outro lado.
  // (Continua a poder ser apanhada com um clique, e só uma vez.)
  // pose: caminho da imagem (w x h píxeis), desenhada de pé, com as mãos no topo e os pés na base.
  //       Com null usa um desenho provisório.
  JUMPER: {
    ON_CLICK: 'point',                 // se o jogador a apanhar: 'point' (perde 1 ponto), 'life' (perde 1 vida), 'gameover' (fim de jogo) ou 'none'
    pose: 'pics/jogo-banco/personJumping.png',
    w: 532, h: 776,                    // tamanho da imagem (px)
    // Altura da personagem que salta em relação à das outras (1 = igual). No desenho o rapaz tem 481 px e o
    // homem 568 px (0.847), mas na página parecia grande, por isso baixou-se para 0.72. Ajusta só este valor.
    // Os pés ficam sempre no mesmo caminho.
    heightScale: 0.72,
    // Só avança na horizontal enquanto está NO AR; no chão (esmagada, parada, agachada) fica quieta.
    // Estes valores têm de bater certo com a animação jb-hop no CSS (ciclo de 3.8s = 2 saltos; em cada salto,
    // descola aos 8% e toca no chão aos 46% de metade do ciclo, ou seja, aos 8%-46% de cada 50%).
    cycleMs: 3800, airFrom: 8, airTo: 46,
    // Avanço horizontal em cada salto (1 = velocidade média igual à de quem caminha). Maior = saltos mais compridos, com
    // mais distância entre toques no chão (a altura do arco está em jb-hop, no CSS: o valor -.8).
    moveScale: 1.4
  }
};

/* ---------- Elementos da interface ---------- */
const $ = (id) => document.getElementById(id);
const stage = $('stage'), peopleLayer = $('people');
const scoreEl = $('score'), scoreBox = $('score-box');
const restartBtn = $('restart-btn');
const bestEl = $('best'), livesEl = $('lives');

/* ---------- Estado do jogo ---------- */
const state = {
  running: false, rafId: 0, lastTs: 0,
  elapsed: 0,          // segundos de jogo
  score: 0, best: 0,
  lives: CONFIG.LIVES,
  over: false, overAt: 0,   // fim de jogo (e instante em que aparece o ecrã final)
  speedMult: 1,        // multiplicador de velocidade (sobe com o tempo)
  spawnTimer: 0,       // s até à próxima vaga
  healthyLaunched: 0,  // pessoas normais que já apareceram
  lastJumperAt: -1e9,  // instante (s de jogo) em que apareceu a última personagem que salta
  nextId: 1,
  people: new Map(),   // id → pessoa
  balls: [],           // bolas em movimento
  slots: [null, null, null], // lugares do banco (id da pessoa que está sentada)
  m: { W: 1, H: 1, benchCenter: .5, benchW: .3, seatTop: 0, groundTop: 0, groundH: 1, unit: 1 } // medidas do cenário
};
try { state.best = parseInt(localStorage.getItem('jb-best'), 10) || 0; } catch (e) { /* sem armazenamento */ }

const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* =========================================================
   Medidas — lidas do DOM, por isso funcionam em qualquer resolução
   ========================================================= */
function updateMetrics() {
  // Lê as posições do LAYOUT (offsetLeft/offsetTop/offsetWidth...), que ignoram translate/scale/transform.
  // Assim as medidas são sempre as do banco no tamanho e sítio normais do jogo, mesmo que o banco esteja
  // maior e mais abaixo (ecrã final) ou a meio da transição ao carregar em "Jogar outra vez".
  const bench = $('bench'), seat = $('bench-seat'), ground = document.querySelector('.jb-ground');
  const W = stage.offsetWidth, H = stage.offsetHeight;
  const benchW = bench.offsetWidth;
  // o banco tem left: 50% e translateX(-50%): o translate não conta no offsetLeft, por isso o centro é o próprio offsetLeft
  const benchCenterPx = bench.offsetLeft;
  state.m = {
    W, H,
    benchCenter: benchCenterPx / W,
    benchW: benchW / W,
    seatTop: bench.offsetTop + seat.offsetTop,
    groundTop: ground.offsetTop, groundH: ground.offsetHeight,
    unit: W / 1863                            // 1px da floorGame.png à escala do cenário
  };
  for (const p of state.people.values()) { p.w = p.el.offsetWidth; p.h = p.el.offsetHeight; }
}
const slotX = (i) => state.m.benchCenter + CONFIG.SLOT_OFFSETS[i] * state.m.benchW;

/* =========================================================
   Personagem — devolve o elemento, a proporção largura/altura e onde ficam as ancas.
   ========================================================= */
function buildCharacter() {
  const c = pick(CONFIG.CHARACTERS);
  return c.gif ? buildGifCharacter(c) : buildFrameCharacter(c);
}

// Personagem com GIF animado: uma só imagem que ocupa a caixa da pessoa (o GIF trata da animação).
// Ao sentar-se, mostra a imagem sentada (sit).
function buildGifCharacter(c) {
  const W = c.frameW, H = c.frameH;
  const pct = (v) => `${(v * 100).toFixed(3)}%`;
  const node = document.createElement('div');
  node.className = 'jb-char';
  node.innerHTML = `<img class="jb-gif" src="${c.gif}" alt="" draggable="false" style="position:absolute;left:0;top:0;width:100%;height:100%;max-width:none">`;
  const hip = c.hip;
  if (c.sit) {
    const sitStyle = `top:${pct(hip - c.sitSeat * c.sitH / H)};height:${pct(c.sitH / H)};` +
      `width:${pct(c.sitW / W)};left:${pct((W - c.sitW) / 2 / W)}`;
    node.insertAdjacentHTML('beforeend', `<img class="jb-sit" src="${c.sit}" style="${sitStyle}" alt="" draggable="false">`);
  }
  return { node, aspect: W / H, hip, framed: true, cycleK: 0.204 };   // (cycleK não é usado por GIFs)
}

// Personagem com animação por frames: as imagens ficam empilhadas e o CSS mostra uma de cada vez
// (cada frame fica visível 1/8 do ciclo; ver .jb-frame no CSS).
function buildFrameCharacter(c) {
  const W = c.framesW || c.frameW, total = c.framesH || c.frameH, hip = c.hip;   // tamanho dos frames
  const pct = (v) => `${(v * 100).toFixed(3)}%`;
  const node = document.createElement('div');
  node.className = 'jb-char';
  const n = c.frames.length;
  node.innerHTML = c.frames.map((src, i) =>
    `<img class="jb-wf" src="${src}" style="animation-delay: calc(var(--jb-cycle, 1.2s) * ${(i / n).toFixed(4)})" alt="" draggable="false">`
  ).join('');
  if (c.sit) {
    const sitStyle = `top:${pct(hip - c.sitSeat * c.sitH / total)};height:${pct(c.sitH / total)};` +
      `width:${pct(c.sitW / W)};left:${pct((W - c.sitW) / 2 / W)}`;
    node.insertAdjacentHTML('beforeend', `<img class="jb-sit" src="${c.sit}" style="${sitStyle}" alt="" draggable="false">`);
  }
  // cycleK: duração do ciclo = cycleK / velocidade  (stride/frameH x altura da pessoa / largura do cenário)
  return { node, aspect: W / total, hip, framed: true, cycleK: 0.2899 * c.stride / total };
}

/* =========================================================
   Pessoa que salta e roda 180° a cada salto: uma só imagem, que fica ora de pé
   (pernas abertas, braços para cima) ora de cabeça para baixo (ver .jb-jumper no CSS).
   Atravessa o ecrã sem se sentar.
   ========================================================= */
function buildJumper() {
  const c = CONFIG.JUMPER;
  const node = document.createElement('div');
  node.className = 'jb-char';
  node.innerHTML = `<img class="jb-jpose" src="${c.pose || jumperPoseSVG()}" alt="" draggable="false">`;
  return { node, aspect: c.w / c.h, hip: 0.5, heightScale: c.heightScale || 1 };
}

// Desenho provisório (SVG): de pé, pernas abertas em V e braços para cima em V.
// Substitui por um PNG em CONFIG.JUMPER.pose quando tiveres a ilustração.
function jumperPoseSVG() {
  const ink = '#2a2623', fill = '#d9d9d9';
  const limb = (d, w) =>
    `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w + 10}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const ball = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${ink}" stroke-width="6"/>`;
  const shoe = (x) => `<ellipse cx="${x}" cy="584" rx="36" ry="14" fill="#fff" stroke="${ink}" stroke-width="6"/>`;
  const torso = `<rect x="112" y="150" width="106" height="165" rx="26" fill="${fill}" stroke="${ink}" stroke-width="6"/>`;
  const face = ball(165, 100, 44) +
    `<circle cx="150" cy="94" r="5" fill="${ink}"/><circle cx="180" cy="94" r="5" fill="${ink}"/>` +
    `<path d="M150 116 Q165 130 180 116" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`;
  const body =
    limb('M145 300 L84 566', 40) + limb('M185 300 L246 566', 40) + shoe(60) + shoe(270) + torso +
    limb('M120 182 L66 48', 28) + limb('M210 182 L264 48', 28) + ball(62, 30, 21) + ball(268, 30, 21) + face;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 600">${body}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* =========================================================
   Iniciar / reiniciar / terminar
   ========================================================= */
function startGame() {
  stopLoop();
  clearScene();
  Object.assign(state, {
    elapsed: 0, score: 0, lives: CONFIG.LIVES, over: false, overAt: 0, speedMult: 1,
    spawnTimer: CONFIG.SPAWN_START, healthyLaunched: 0, lastJumperAt: -1e9
  });
  updateScore(false);
  renderLives();
  setScreen('playing');
  updateMetrics();
  state.running = true;
  state.lastTs = performance.now();
  state.rafId = requestAnimationFrame(frame);
}
const restartGame = startGame;

// Frases do ecrã final, por pontuação: 0 | menos de 20 | de 20 a 50 | mais de 50
const END_QUIPS = {
  zero: [
    'Então? Vieste só passear?',
    'Estavas à espera que eu fizesse tudo sozinho?',
    'Nem um? Isto promete…',
    'Boa pontaria… se o objetivo fosse falhar!'
  ],
  low: [
    'Podias ter feito melhor, não achas?',
    'Ainda estás a aquecer?',
    'Já vi pessoas a andar mais depressa do que tu a acertar!',
    'Bem… pelo menos tentaste!',
    'Não te quero pressionar, mas… podias acertar em mais alguns!'
  ],
  mid: [
    'Olha, afinal até tens jeito para isto!',
    'Nada mal! Estás a surpreender-me.',
    'Parece que começaste a perceber como isto funciona!',
    'Até que enfim! Já estava a perder a esperança.',
    'Vais no bom caminho. Não estragues tudo agora!'
  ],
  high: [
    'Uau! Quem diria que eras capaz?',
    'Estou impressionado! Não te habitues ao elogio.',
    'Olha só para ti! Afinal, és mesmo capaz!',
    'Nada mau! Quase me deixaste sem palavras.',
    'Parece que temos aqui um profissional. Ou foi sorte?'
  ]
};
function pickQuip(score) {
  const list = score <= 0 ? END_QUIPS.zero : score < 20 ? END_QUIPS.low : score <= 50 ? END_QUIPS.mid : END_QUIPS.high;
  return list[Math.floor(Math.random() * list.length)];
}

// Perdeu a última vida: o jogo continua mais um instante (para se ver o que aconteceu) e depois mostra o ecrã final
function gameOver() {
  if (state.over) return;
  state.over = true;
  state.overAt = state.elapsed + CONFIG.GAME_OVER_DELAY;
  const newBest = state.score > state.best;
  if (newBest) {
    state.best = state.score;
    try { localStorage.setItem('jb-best', String(state.best)); } catch (e) { /* sem armazenamento */ }
  }
  bestEl.textContent = state.best;
  $('end-quip').textContent = pickQuip(state.score);
  $('end-score').textContent = state.score;
  $('end-score-unit').textContent = state.score === 1 ? 'pessoa' : 'pessoas';
  $('end-best').textContent = state.best;
  $('end-best-unit').textContent = state.best === 1 ? 'ponto' : 'pontos';
  $('end-note').textContent = newBest && state.score > 0 ? 'Novo recorde!' : '';
}

function stopLoop() {
  state.running = false;
  cancelAnimationFrame(state.rafId);
  state.rafId = 0;
}

// Fim de jogo: as pessoas (e a bola, as marcas...) desaparecem com um fade, igual ao de quem se levanta do banco
// (.jb-leaving: opacity .4s, CONFIG.LEAVE_MS), em vez de sumirem de repente. Só depois é que a cena é limpa.
let fadeTimer = 0;
function fadeOutScene() {
  for (const el of peopleLayer.children) {
    el.style.transition = `opacity ${CONFIG.LEAVE_MS}ms`;
    el.style.opacity = '0';
  }
  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => { fadeTimer = 0; clearScene(); }, CONFIG.LEAVE_MS + 50);
}

function clearScene() {
  clearTimeout(fadeTimer); fadeTimer = 0;
  peopleLayer.replaceChildren();
  state.people.clear();
  state.balls.length = 0;
  state.slots.fill(null);
}

// O balão do fim de jogo tem de ter exatamente o tamanho do do tutorial: copia-lhe a altura da zona de texto
function syncEndSize() {
  const slides = $('tut-slides');
  if (slides) stage.style.setProperty('--jb-tut-slides-h', slides.offsetHeight + 'px');
}

function setScreen(name) {
  stage.dataset.screen = name;
  if (name === 'end') delete stage.dataset.bench;       // ecrã final: o banco fica em baixo e grande
  restartBtn.disabled = name !== 'playing';
  // O balão do fim de jogo entra com a mesma animação do tutorial
  const endCard = document.querySelector('#end-panel .jb-tut-card');
  if (name === 'end') syncEndSize();
  if (endCard) {
    endCard.classList.remove('is-entering');
    if (name === 'end' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void endCard.offsetWidth;                          // reinicia a animação
      endCard.classList.add('is-entering');
    }
  }
}

function renderLives() {
  livesEl.innerHTML = '';
  for (let i = 0; i < CONFIG.LIVES; i++) {
    const s = document.createElement('img');                // pics/jogo-banco/lifeBall.png (bola de futebol em coração)
    s.className = 'jb-life' + (i >= state.lives ? ' is-lost' : '');
    s.src = 'pics/jogo-banco/lifeBall.png';
    s.alt = i >= state.lives ? 'Vida perdida' : 'Vida';
    s.draggable = false;
    livesEl.appendChild(s);
  }
}

function loseLife(p) {
  if (state.over) return;
  state.lives--;
  renderLives();
  showMark(p, '✕', '#e4572e', 46);          // cruz vermelha, como no jogo da fruta
  if (state.lives <= 0) gameOver();
}

/* =========================================================
   Ciclo principal (um único requestAnimationFrame controla
   movimento, aparecimento e tempo — não há setTimeout a limpar)
   ========================================================= */
function frame(ts) {
  if (!state.running) return;
  const dt = Math.min((ts - state.lastTs) / 1000, 0.1); // limita saltos (ex.: separador em segundo plano)
  state.lastTs = ts;
  state.elapsed += dt;

  if (state.over && state.elapsed >= state.overAt) {     // fim de jogo: mostra o ecrã final
    stopLoop();
    fadeOutScene();
    setScreen('end');
    return;
  }

  // dificuldade: a velocidade sobe com o tempo
  state.speedMult = 1 + (CONFIG.SPEED_MAX_MULT - 1) * Math.min(1, state.elapsed / CONFIG.SPEED_RAMP_S);

  if (!state.over) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) { spawnWave(); state.spawnTimer = spawnGap(); }
  }
  movePeople(dt);
  updateBalls(dt);
  state.rafId = requestAnimationFrame(frame);
}

/* ---------- Pontuação ---------- */
function updateScore(animate = true) {
  scoreEl.textContent = state.score;
  if (animate) {
    scoreBox.classList.remove('jb-bump');
    void scoreBox.offsetWidth; // reinicia a animação
    scoreBox.classList.add('jb-bump');
  }
}

/* =========================================================
   Criar pessoas — ritmo copiado de jogo-fruta.js
   ========================================================= */
// Intervalo entre vagas: 1,35 s no início, a descer até 0,55 s ao fim de SPAWN_RAMP_S
function spawnGap() {
  const k = Math.min(1, state.elapsed / CONFIG.SPAWN_RAMP_S);
  return CONFIG.SPAWN_GAP_START + (CONFIG.SPAWN_GAP_MIN - CONFIG.SPAWN_GAP_START) * k;
}

// Uma vaga: 1 a waveMax pessoas ao mesmo tempo. Cada uma tem JUNK_CHANCE de ser a que salta
// (no máximo uma por vaga, e só depois de JUNK_AFTER pessoas normais).
function spawnWave() {
  const t = state.elapsed;
  const waveMax = Math.min(CONFIG.WAVE_MAX, 1 + Math.floor(t / 20) + (t > 8 ? 1 : 0));
  let n = 1 + Math.floor(Math.random() * waveMax);
  // Limites: não deixa o ecrã encher (pessoas a caminhar) nem juntar várias personagens que saltam
  let walking = 0, jumpers = 0;
  for (const p of state.people.values()) {
    if (p.jumper) jumpers++;
    else if (p.state === 'walking') walking++;
  }
  const room = CONFIG.MAX_WALKING - walking;
  const canJunk = jumpers < CONFIG.JUMPER_MAX && t - state.lastJumperAt >= CONFIG.JUMPER_COOLDOWN_S;
  const queued = { left: 0, right: 0 };    // quantas já entraram por cada lado nesta vaga
  let junkInWave = 0, healthyInWave = 0;
  for (let i = 0; i < n; i++) {
    const junk = canJunk && state.healthyLaunched >= CONFIG.JUNK_AFTER && junkInWave < 1 && Math.random() < CONFIG.JUNK_CHANCE;
    if (!junk && healthyInWave >= room) continue;      // já não cabem mais pessoas normais
    if (junk) { junkInWave++; state.lastJumperAt = t; } else { state.healthyLaunched++; healthyInWave++; }
    spawnPerson(junk, queued);
  }
}

// Escolhe o lugar do banco para quem vem de `side`: o mais perto do seu lado com menos "carga"
// (pessoas a caminho dele pesam mais do que uma já sentada, que sai quando a nova chega)
function chooseSlot(side) {
  const order = side === 'left' ? [0, 1, 2] : [2, 1, 0];
  const load = (i) => {
    let n = state.slots[i] !== null ? 1 : 0;
    for (const q of state.people.values()) if (q.state === 'walking' && q.slot === i) n += 2;
    return n;
  };
  return order.reduce((best, i) => (load(i) < load(best) ? i : best), order[0]);
}

function spawnPerson(jumper, queued) {
  const id = state.nextId++;
  const side = Math.random() < 0.5 ? 'left' : 'right';
  const off = queued[side]++;                              // posição na fila deste lado dentro da vaga
  const slot = jumper ? -1 : chooseSlot(side);             // quem salta não ocupa lugar no banco

  const el = document.createElement('div');
  el.className = `jb-person jb-walking jb-from-${side}${jumper ? ' jb-jumper' : ''}`;
  el.dataset.id = id;
  el.innerHTML = '<div class="jb-flip"><div class="jb-sprite"></div></div>';
  const ch = jumper ? buildJumper() : buildCharacter();
  el.querySelector('.jb-sprite').appendChild(ch.node);
  el.style.setProperty('--jb-aspect', ch.aspect);   // largura = altura x proporção
  if (ch.heightScale) el.style.setProperty('--jb-hscale', ch.heightScale);   // altura relativa às outras personagens
  if (ch.framed) el.classList.add('jb-framed');     // anda por frames: sem o balanço do corpo
  peopleLayer.appendChild(el);

  const speed = CONFIG.BASE_SPEED * state.speedMult;
  el.style.setProperty('--jb-cycle', `${((ch.cycleK || 0.204) / speed).toFixed(2)}s`);
  const w = el.offsetWidth, h = el.offsetHeight;
  const back = off * (w / state.m.W) * CONFIG.WAVE_STAGGER;   // afastamento em relação a quem entrou antes por este lado
  const p = {
    id, el, side, slot, speed, jumper,
    dir: side === 'left' ? 1 : -1,
    x: side === 'left' ? -0.06 - back : 1.06 + back,          // começa fora do cenário
    lane: jumper ? CONFIG.LANE_JUMPER : pick(CONFIG.LANES_WALKER),   // o caminho de cima é só da que salta
    targetX: jumper ? (side === 'left' ? 1.08 : -0.08) : slotX(slot),   // quem salta vai até ao outro lado
    state: 'walking', hip: ch.hip,
    sitStart: 0, sitT: 0, removeAt: 0, scored: false,
    w, h
  };
  state.people.set(id, p);
  renderPerson(p);
  return p;
}

/* =========================================================
   Movimento
   ========================================================= */
function movePeople(dt) {
  const now = state.elapsed * 1000;
  for (const p of state.people.values()) {
    if (p.state === 'walking') {
      if (p.slot >= 0) {
        p.targetX = slotX(p.slot);                  // acompanha redimensionamentos
        // perto do lugar, o caminho converge para LANE_SIT: ao sentar-se, todas fazem o mesmo trajeto vertical
        const t = Math.max(0, Math.min(1, 1 - Math.abs(p.targetX - p.x) / CONFIG.SIT_APPROACH));
        p.laneNow = lerp(p.lane, CONFIG.LANE_SIT, t * t * (3 - 2 * t));
      }
      p.x += p.dir * p.speed * dt * (p.jumper ? jumperMoveFactor(p) : 1);
      if ((p.targetX - p.x) * p.dir <= 0) {
        if (p.slot < 0) { removePerson(p); continue; }   // quem salta chegou ao outro lado: sai
        p.x = p.targetX; p.laneNow = CONFIG.LANE_SIT; sitDown(p, now);
      }
    } else if (p.state === 'sitting') {
      p.sitT = Math.min(1, (now - p.sitStart) / CONFIG.SIT_ANIM_MS);
      if (now >= p.sitStart + CONFIG.SIT_ANIM_MS + CONFIG.SIT_STAY_MS) leaveBench(p, now);
    } else if (now >= p.removeAt) {                 // 'caught' ou 'leaving' terminaram
      removePerson(p);
      continue;
    }
    renderPerson(p);
  }
}

// Quem salta só se desloca no ar (velocidade horizontal constante durante o voo) e fica parada quando toca no chão.
// Lê a fase do salto da própria animação CSS (jb-hop), por isso o movimento e o desenho nunca perdem o sincronismo.
// No ar compensa o tempo parado (fator > 1) para a travessia demorar o mesmo que antes.
function jumperMoveFactor(p) {
  const c = CONFIG.JUMPER;
  if (p.hopAnim === undefined) {
    const sprite = p.el.querySelector('.jb-sprite');
    const anims = sprite && sprite.getAnimations ? sprite.getAnimations() : [];
    p.hopAnim = anims.find((a) => a.animationName === 'jb-hop') || null;
  }
  if (!p.hopAnim || p.hopAnim.currentTime == null) return 1;   // sem animação (ex.: movimento reduzido): anda normalmente
  const half = c.cycleMs / 2;
  const u = (Number(p.hopAnim.currentTime) % half) / half * 50;    // posição dentro deste salto, na escala dos % do ciclo (0-50)
  const airborne = u >= c.airFrom && u < c.airTo;
  return airborne ? (50 / (c.airTo - c.airFrom)) * (c.moveScale || 1) : 0;
}

// Altura (px) dos pés de uma pessoa a caminhar: a faixa é relativa ao chão
const laneY = (p) => state.m.groundTop + (p.laneNow ?? p.lane) * state.m.groundH;

// Converte as frações guardadas em píxeis (assim nada depende de uma resolução fixa)
function renderPerson(p) {
  const { W, seatTop } = state.m;
  const ease = p.sitT * p.sitT * (3 - 2 * p.sitT);
  const feetY = lerp(laneY(p), seatTop + p.h * (1 - p.hip), ease); // sentada: ancas à altura do assento
  p.el.style.transform = `translate3d(${p.x * W - p.w / 2}px, ${feetY - p.h}px, 0)`;
  // Quem caminha fica sempre À FRENTE de quem está sentado (+1000); dentro de cada grupo, ordena pela altura dos pés
  const walking = p.state === 'walking' || p.state === 'caught';
  p.el.style.zIndex = (walking ? 1000 : 0) + Math.round(feetY);
}

/* =========================================================
   Sentar-se e sair do banco
   ========================================================= */
function sitDown(p, now) {
  // Se o lugar ainda está ocupado por alguém sentado, essa pessoa sai já
  const prev = state.slots[p.slot];
  if (prev !== null && prev !== p.id) {
    const o = state.people.get(prev);
    if (o && o.state === 'sitting') leaveBench(o, now);
  }
  state.slots[p.slot] = p.id;
  p.state = 'sitting';
  p.sitStart = now;
  p.el.classList.replace('jb-walking', 'jb-sitting'); // deixa de ser clicável (CSS) e (lógica) deixa de pontuar
  // Garante (sem depender do CSS) que deixa de se ver a pessoa a caminhar e passa a ver-se a sentada (.jb-sit)
  const seated = p.el.querySelector('.jb-sit');
  if (seated) {
    p.el.querySelectorAll('.jb-char > *').forEach((el) => { if (el !== seated) el.style.display = 'none'; });
    seated.style.display = 'block';
  }
  loseLife(p);                                        // sentou-se no banco: perde-se uma vida
}

function leaveBench(p, now) {
  p.state = 'leaving';
  p.removeAt = now + CONFIG.LEAVE_MS;
  releaseSlot(p);
  p.el.classList.replace('jb-sitting', 'jb-leaving');
}

function releaseSlot(p) {
  if (state.slots[p.slot] === p.id) state.slots[p.slot] = null;
}

function removePerson(p) {
  p.el.remove();
  state.people.delete(p.id);
}

/* =========================================================
   Cliques — só contam se a pessoa ainda estiver a caminhar
   ========================================================= */
function handleClick(e) {
  if (!state.running || state.over) return;
  const el = e.target.closest('.jb-person');
  if (!el) return;                                  // clique no cenário/banco: nada acontece
  const p = state.people.get(Number(el.dataset.id));
  if (p) catchPerson(p);
}

function catchPerson(p) {
  if (!state.running || state.over || p.state !== 'walking' || p.scored) return; // validação única
  p.scored = true;                                  // impede pontos duplicados
  p.state = 'caught';
  p.removeAt = Infinity;                            // só sai quando a bola lhe bater
  releaseSlot(p);
  p.el.classList.replace('jb-walking', 'jb-struck'); // pára de andar, já não é clicável
  throwBall(p);
  if (p.jumper) {                                   // a pessoa que salta é a "comida pouco saudável"
    const rule = CONFIG.JUMPER.ON_CLICK;
    if (rule === 'point') {
      state.score = Math.max(0, state.score - 1);   // nunca abaixo de 0
      updateScore(false);
      showMark(p, '-1', '#e4572e', 40);
    }
    else if (rule === 'gameover') { showMark(p, '✕', '#e4572e', 46); gameOver(); }
    else if (rule === 'life') loseLife(p);
    return;
  }
  showMark(p, '+1', '#fff', 28);
  state.score += 1;
  updateScore();
}

/* =========================================================
   Bola: voa até à cabeça → ressalta → bate no chão algumas vezes → desaparece
   ========================================================= */
function throwBall(p) {
  const m = state.m, k = m.unit;
  const el = document.createElement('img');
  el.className = 'jb-ball'; el.src = CONFIG.BALL_IMAGE; el.alt = ''; el.draggable = false;
  peopleLayer.appendChild(el);
  const size = el.offsetWidth || 90 * k;
  const hx = p.x * m.W;                             // centro da cabeça
  // Ponto de impacto: topo da cabeça (a bola fica ~15% dentro da cabeça, o resto fica por cima)
  const hy = laneY(p) - p.h - size * 0.35;
  state.balls.push({
    el, p, size, phase: 'fly', t: 0,
    sx: hx + (m.W / 2 - hx) * 0.2, sy: -size,        // cai do topo da secção
    hx, hy, floorY: laneY(p) - size / 2,
    x: 0, y: 0, scale: 1.25, rot: 0, vx: 0, vy: 0, bounces: 0, fade: 0
  });
  const b = state.balls[state.balls.length - 1];     // posição inicial (evita um flash no canto)
  b.x = b.sx; b.y = b.sy;
  el.style.transform = `translate3d(${b.x - size / 2}px, ${b.y - size / 2}px, 0) scale(${b.scale})`;
}

function updateBalls(dt) {
  const k = state.m.unit;
  for (let i = state.balls.length - 1; i >= 0; i--) {
    const b = state.balls[i];
    if (b.phase === 'fly') {
      b.t = Math.min(1, b.t + dt * 1000 / CONFIG.BALL_FLIGHT_MS);
      const e = 1 - (1 - b.t) * (1 - b.t);          // começa rápida, termina mais suave
      b.x = lerp(b.sx, b.hx, e); b.y = lerp(b.sy, b.hy, e);
      b.scale = lerp(1.25, 1, e);                   // ligeiramente maior ao entrar, normal ao chegar
      b.rot = b.t * Math.PI * 2;
      if (b.t >= 1) {                               // IMPACTO NA CABEÇA
        b.phase = 'fall';
        const dir = b.hx < state.m.W / 2 ? -1 : 1;  // ressalta para fora do centro
        b.vx = dir * rand(320, 450) * k;
        b.vy = -rand(650, 800) * k;                 // sobe um pouco e depois cai
        b.p.el.classList.add('jb-caught');          // a pessoa reage e desaparece
        b.p.removeAt = state.elapsed * 1000 + CONFIG.CATCH_ANIM_MS;
      }
    } else if (b.phase === 'fall') {
      b.vy += CONFIG.BALL_GRAVITY * k * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.rot += b.vx * dt / (b.size / 2);
      if (b.y >= b.floorY && b.vy > 0) {            // bate no chão
        b.y = b.floorY; b.bounces++;
        b.vy = -b.vy * CONFIG.BALL_BOUNCE; b.vx *= 0.8;
        if (b.bounces >= CONFIG.BALL_MAX_BOUNCES || Math.abs(b.vy) < 150 * k) { b.phase = 'roll'; b.vy = 0; }
      }
    } else {                                        // rola e desaparece
      b.x += b.vx * dt; b.vx *= Math.pow(0.15, dt);
      b.rot += b.vx * dt / (b.size / 2);
      b.fade += dt * 1000;
      b.el.style.opacity = Math.max(0, 1 - b.fade / CONFIG.BALL_FADE_MS);
      if (b.fade >= CONFIG.BALL_FADE_MS) { b.el.remove(); state.balls.splice(i, 1); continue; }
    }
    b.el.style.transform = `translate3d(${b.x - b.size / 2}px, ${b.y - b.size / 2}px, 0) rotate(${b.rot}rad) scale(${b.scale})`;
  }
}

// Texto que sobe e desaparece por cima da pessoa ('+1', '-1' ou '✕'), com o mesmo aspeto do jogo da fruta
function showMark(p, text, color, size) {
  const tag = document.createElement('div');
  tag.className = 'jb-plus-one';
  tag.textContent = text;
  tag.style.color = color;
  tag.style.fontSize = `${(size * 0.2).toFixed(2)}cqh`;   // tamanhos do jogo da fruta (px para um cenário de 500 px de altura)
  tag.style.left = `${p.x * state.m.W}px`;
  tag.style.top = `${laneY(p) - p.h - 20}px`;
  tag.addEventListener('animationend', () => tag.remove(), { once: true });
  peopleLayer.appendChild(tag);
}

/* =========================================================
   Entrada: tutorial (miúdos em primeiro plano) -> jogo (banco em primeiro plano)
   data-scene="tutorial" | "game" no #stage; o CSS faz as transições e o jogo só arranca no fim delas,
   para as medidas do banco (updateMetrics) serem lidas já no tamanho final.
   ========================================================= */
const introMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : CONFIG.INTRO.MS;
stage.style.setProperty('--jb-kids-ms', introMs + 'ms');
stage.style.setProperty('--jb-bench-ms', introMs + 'ms');

const BUBBLE_OUT_MS = 800;                                 // = duração de jb-card-out (jogo-banco.css)
let introTimer = 0;
function beginGame() {
  if (introTimer) return;                                  // a entrada já está a decorrer
  if (stage.dataset.scene === 'game') { startGame(); return; }
  const card = document.querySelector('.jb-tut-card');
  stage.dataset.scene = 'game';
  if (introMs === 0) {                                     // sem animações: esconde logo o painel do tutorial
    setScreen('intro');
    introTimer = setTimeout(() => { introTimer = 0; startGame(); }, 50);
    return;
  }
  // O balão sai (animação do loading) ao mesmo tempo que os miúdos encolhem; o painel só se esconde no fim dela
  card.classList.remove('is-entering');
  card.classList.add('is-leaving');
  setTimeout(() => {
    setScreen('intro');                                    // o painel faz fade (.35s); o balão tem de continuar invisível até ele desaparecer
    setTimeout(() => card.classList.remove('is-leaving'), 600);
  }, BUBBLE_OUT_MS);
  introTimer = setTimeout(() => { introTimer = 0; startGame(); }, Math.max(introMs, BUBBLE_OUT_MS) + 50);
}

/* =========================================================
   Tutorial em slides (painel inicial): Anterior / Seguinte / pontos; no último slide aparece "Começar"
   ========================================================= */
(function tutorial() {
  const slides = [...document.querySelectorAll('#tut-slides .jb-slide')];
  const prev = $('tut-prev'), next = $('tut-next'), start = $('start-btn'), dotsEl = $('tut-dots');
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
  document.addEventListener('keydown', (e) => {      // setas do teclado, só enquanto o tutorial está visível
    if (stage.dataset.screen !== 'start') return;
    if (e.key === 'ArrowRight') show(cur + 1);
    else if (e.key === 'ArrowLeft') show(cur - 1);
  });
  show(0);
  // O balão só aparece (animação do loading) quando o tutorial abre; entre slides só muda o conteúdo
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelector('.jb-tut-card').classList.add('is-entering');
})();

/* =========================================================
   Eventos
   ========================================================= */
peopleLayer.addEventListener('pointerdown', handleClick);
$('start-btn').addEventListener('click', beginGame);
// "Jogar outra vez": o balão sai com a mesma animação do tutorial e só depois o jogo recomeça
let againTimer = 0;
function playAgain() {
  if (againTimer) return;
  const card = document.querySelector('#end-panel .jb-tut-card');
  if (introMs === 0) { startGame(); return; }
  stage.dataset.bench = 'home';                            // o banco começa já a voltar ao seu lugar (CSS), enquanto o balão sai
  card.classList.remove('is-entering');
  card.classList.add('is-leaving');
  againTimer = setTimeout(() => {
    againTimer = 0;
    delete stage.dataset.bench;
    startGame();                                           // o painel faz fade (.35s); o balão tem de continuar invisível até ele desaparecer
    setTimeout(() => card.classList.remove('is-leaving'), 600);
  }, BUBBLE_OUT_MS);
}
$('again-btn').addEventListener('click', playAgain);
restartBtn.addEventListener('click', restartGame);
window.addEventListener('resize', updateMetrics);
window.addEventListener('resize', syncEndSize);

/* ---------- Céu em movimento (pics/jogo-banco/backgroundGame.png) ----------
   Calcula a largura de uma "telha" da imagem à altura do céu, para o CSS
   repetir o movimento sem saltos nem deformações. */
const sky = document.querySelector('.jb-sky');
const skyImg = new Image();
function updateSkyTile() {
  if (!skyImg.naturalHeight) return;
  const tile = skyImg.naturalWidth * (sky.clientHeight / skyImg.naturalHeight);
  sky.style.setProperty('--jb-sky-tile', `${tile}px`);
}
skyImg.onload = updateSkyTile;
skyImg.src = 'pics/jogo-banco/backgroundGame.png';
window.addEventListener('resize', updateSkyTile);

updateMetrics();
renderLives();
bestEl.textContent = state.best;

/* ---------- Mostrar o jogo só quando o layout assentou ----------
   Espera pelas fontes e por 2 frames (as medidas em cq e o céu já estão certos) e só então põe .jb-ready
   no .jb-page (ver jogo-banco-intro.css). O temporizador é uma rede de segurança. */
(function revealWhenReady() {
  const page = document.querySelector('.jb-page');
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    updateMetrics();
    updateSkyTile();
    page.classList.add('jb-ready');
  };
  const afterLayout = () => requestAnimationFrame(() => requestAnimationFrame(go));
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(afterLayout);
  setTimeout(go, 1500);
})();

/* ---------- Navbar: item ativo com a cor da linha que fica por baixo ----------
   Lê a cor da linha (pseudo-elemento ::after, borda ou sublinhado) definida no
   CSS da navbar e aplica-a ao texto do item ativo. */
(function colorActiveNav() {
  const a = document.querySelector('.site-nav a.is-active');
  if (!a) return;
  const clear = (c) => !c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)';
  const cs = getComputedStyle(a), after = getComputedStyle(a, '::after'), before = getComputedStyle(a, '::before');
  const candidates = [
    after.content !== 'none' && after.backgroundColor,
    after.content !== 'none' && parseFloat(after.borderBottomWidth) > 0 && after.borderBottomColor,
    before.content !== 'none' && before.backgroundColor,
    parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomColor,
    cs.textDecorationLine.includes('underline') && cs.textDecorationColor
  ];
  const color = candidates.find((c) => c && !clear(c));
  if (color) a.style.color = color;
})();
/* Pré-carrega as imagens das personagens (evita falhas visíveis quando aparecem pela primeira vez).
   Para os GIFs lê o tamanho real e, se o GIF não existir, passa a usar os frames (plano B). */
CONFIG.CHARACTERS.forEach((c) => {
  [...(c.frames || []), c.sit].filter(Boolean).forEach((src) => { new Image().src = src; });
  if (c.gif) {
    const g = new Image();
    g.onload = () => { if (g.naturalWidth) { c.frameW = g.naturalWidth; c.frameH = g.naturalHeight; } };
    g.onerror = () => { c.gif = null; };   // sem GIF: usa os frames (com o tamanho deles, framesW x framesH)
    g.src = c.gif;
  }
});