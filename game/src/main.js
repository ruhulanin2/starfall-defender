// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens:
// title, play, paused and game over. Tiny synth sounds (no audio files) mark
// hits, power-ups and new waves.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|battle|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_OVER, EVENT_POWER, EVENT_SHIELD, EVENT_WAVE } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
const IDLE = { mx: 0, my: 0, fire: false };

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

// --- Tiny synth: three oscillator voices, created on the first user gesture.
let audio = null;
function ensureAudio() {
  if (!audio) {
    try { audio = new window.AudioContext(); } catch { audio = null; }
  }
  if (audio && audio.state === 'suspended') audio.resume();
}
function tone(freq, end, seconds, type = 'square', volume = 0.05, delay = 0) {
  if (!audio) return;
  const t0 = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, end), t0 + seconds);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + seconds);
}
const sfx = {
  hit() { tone(220, 40, 0.35, 'sawtooth', 0.09); },
  shield() { tone(500, 120, 0.25, 'triangle', 0.08); },
  power() { tone(520, 520, 0.07, 'square', 0.05); tone(660, 660, 0.07, 'square', 0.05, 0.07); tone(880, 880, 0.12, 'square', 0.05, 0.14); },
  wave() { tone(392, 392, 0.09, 'square', 0.05); tone(587, 587, 0.14, 'square', 0.05, 0.09); },
};

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    ensureAudio();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, IDLE, true);
      return;
    }
    if (screen === SCREEN_OVER) {
      world.step(STEP, IDLE, false);
      return;
    }
    const control = input.control(world.state.player.x, world.state.player.y);
    const events = world.step(STEP, control, false);
    if (events & EVENT_OVER) { sfx.hit(); endGame(); return; }
    if (events & EVENT_HIT) {
      sfx.hit();
      announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
    } else if (events & EVENT_SHIELD) {
      sfx.shield();
      announce('Shield down.');
    } else if (events & EVENT_POWER) sfx.power();
    else if (events & EVENT_WAVE) sfx.wave();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PAUSED) {
      accumulator = 0;
    } else {
      while (accumulator >= STEP && screen !== SCREEN_PAUSED) {
        step();
        accumulator -= STEP;
        if (screen === SCREEN_OVER || screen === SCREEN_TITLE) break;
      }
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Starfall Defender. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
