// The screenshot scenes behind ?shot=start|play|battle|end. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by an autopilot, so the frame is what a real game looks like and
// the same seed always gives the same frame. The play and battle pilots aim
// at the lowest enemy and sidestep incoming fire; the end scene's pilot is
// careless — no dodging, firing only at what is directly overhead — and
// starts several waves in, so the swarm overwhelms it as it would a
// distracted player.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_MIN_SECONDS = 16;
const PLAY_LIMIT_SECONDS = 40;
const BATTLE_MIN_SECONDS = 24;
const BATTLE_LIMIT_SECONDS = 75;
const END_LIMIT_SECONDS = 600;
const IDLE = { mx: 0, my: 0, fire: false };

/** Enemies actually visible in the frame (not still above the top edge). */
function onScreen(state) {
  return state.enemies.filter((e) => e.y > 0 && e.y < FIELD.height).length;
}

function clamp(v) { return Math.max(-1, Math.min(1, v)); }

/** A competent pilot: hunt the lowest enemy, keep a firing line, dodge bolts and hulls. */
function goodPilot(state) {
  const player = state.player;
  if (!player || !player.alive) return IDLE;
  let target = null;
  for (const e of state.enemies) {
    if (target === null || e.y > target.y) target = e;
  }
  let mx = target ? clamp((target.x - player.x) / 30) : clamp((FIELD.width / 2 - player.x) / 40);
  // Dodge incoming bolts
  for (const b of state.enemyBullets) {
    if (b.vy > 0 && b.y < player.y && player.y - b.y < 280 && Math.abs(b.x - player.x) < 60) {
      mx = b.x <= player.x ? 1 : -1;
    }
  }
  // Dodge descending hulls
  for (const e of state.enemies) {
    if (e.y < player.y && player.y - e.y < 110 && Math.abs(e.x - player.x) < 54) {
      mx = e.x <= player.x ? 1 : -1;
    }
  }
  // Chase a falling power-up when the sky is calm
  if (state.powerups.length > 0 && state.enemyBullets.length === 0) {
    mx = clamp((state.powerups[0].x - player.x) / 30);
  }
  const my = clamp((605 - player.y) / 30);
  const fire = state.enemies.some((e) => e.y > -20 && Math.abs(e.x - player.x) < 190);
  return { mx, my, fire: fire || state.enemies.length > 0 };
}

/** A careless pilot: drifts to the middle, fires only at what is right overhead, never dodges. */
function weakPilot(state) {
  const player = state.player;
  if (!player || !player.alive) return IDLE;
  const mx = clamp((FIELD.width / 2 - player.x) / 160);
  const fire = state.enemies.some((e) => Math.abs(e.x - player.x) < 42 && e.y < player.y);
  return { mx, my: 0, fire };
}

/** Advance whole steps until a blinking prompt is in its visible phase, so it shows in the still frame. */
function settleBlink(world, attract) {
  let guard = 0;
  while (Math.floor(world.state.time * 1.6) % 2 !== 0 && guard < 120) {
    world.step(STEP, IDLE, attract);
    guard += 1;
  }
}

/**
 * Set `world` to the named scene (start, play, battle or end; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play' || name === 'battle') {
    // Play forward, then hold on the first dense mid-action frame: enough
    // enemies on screen, shots in the air and no wave banner in the way.
    // A fixed end time too often lands in the lull between waves.
    const battle = name === 'battle';
    if (battle) world.state.player.weapon = 2;
    const minSteps = (battle ? BATTLE_MIN_SECONDS : PLAY_MIN_SECONDS) / STEP;
    const limitSteps = (battle ? BATTLE_LIMIT_SECONDS : PLAY_LIMIT_SECONDS) / STEP;
    const minEnemies = battle ? 6 : 5;
    const minBullets = battle ? 4 : 0;
    for (let i = 0; i < limitSteps; i += 1) {
      if (world.step(STEP, goodPilot(world.state), false) & EVENT_OVER) break;
      const s = world.state;
      if (i >= minSteps && !s.over && s.banner.t <= 0
        && onScreen(s) >= minEnemies && s.bullets.length >= minBullets) break;
    }
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    world.state.wave = 4; // the first wave staged is wave 5: fast, dense, lethal
    world.state.score = 2350; // a good run behind it — this is the moment it ends
    world.state.player.weapon = 2;
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      if (world.step(STEP, weakPilot(world.state), false) & EVENT_OVER) break;
    }
    if (world.state.over) {
      settleBlink(world, false);
      return { screen: SCREEN_OVER, best: world.state.score };
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, IDLE, true);
  settleBlink(world, true);
  return { screen: SCREEN_TITLE, best: 0 };
}
