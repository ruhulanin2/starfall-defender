// Starfall Defender — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const LIVES = 3;

export const PLAYER = {
  radius: 13,
  speed: 540,
  minY: 250,
  maxY: 688,
  startX: 640,
  startY: 610,
  invulnerable: 2.2,
  respawnDelay: 1.1,
  fireInterval: 0.15,
  rapidMultiplier: 0.55,
  rapidSeconds: 10,
  shieldSeconds: 12,
};

export const BULLET = {
  speed: 840,
  radius: 4,
  enemySpeed: 255,
  enemyRadius: 5,
};

export const DRONE = {
  radius: 16,
  hp: 1,
  speed: 104,
  speedPerWave: 7,
  sway: 46,
  swaySpeed: 1.7,
  score: 50,
  dropChance: 0.06,
};

export const WEAVER = {
  radius: 17,
  hp: 2,
  speed: 158,
  sway: 120,
  swaySpeed: 2.6,
  fireInterval: 2.3,
  score: 100,
  dropChance: 0.16,
};

export const CARRIER = {
  radius: 34,
  hp: 7,
  speed: 42,
  fireInterval: 2.9,
  score: 300,
  dropChance: 1,
};

export const STINGER = {
  radius: 11,
  hp: 1,
  speed: 262,
  homing: 66,
  sway: 30,
  swaySpeed: 5.2,
  score: 80,
  dropChance: 0.05,
};

/** The Dreadnought: a boss every fifth wave. hp grows past wave 5. */
export const BOSS = {
  radius: 74,
  hp: 120,
  hpPerWave: 12,
  speed: 30,
  hoverY: 122,
  strafe: 300,
  strafeSpeed: 0.45,
  fireInterval: 1.55,
  score: 2000,
  trickleInterval: 2.0,
  trickleMax: 4,
};

/** Kill chains: every 5 kills inside the window raise the score multiplier. */
export const COMBO = {
  window: 2.5,
  perKill: 5,
  max: 5,
};

export const POWERUP = {
  radius: 15,
  speed: 120,
  lifeChance: 0.07,
  /** Drop kinds cycle in this order (with a rare life mixed in by chance). */
  cycle: ['weapon', 'rapid', 'weapon', 'shield'],
};

export const WAVE = {
  /** Seconds between one wave clearing and the next one's banner. */
  gap: 1.6,
  spawnInterval: 0.62,
  spawnIntervalMin: 0.3,
};

export const PALETTE = {
  spaceTop: '#050914',
  spaceBottom: '#0d1030',
  nebulaA: 'rgba(64, 42, 160, 0.55)',
  nebulaB: 'rgba(10, 90, 140, 0.5)',
  nebulaC: 'rgba(170, 80, 20, 0.40)',
  ship: '#ffd76a',
  shipCore: '#fff8e1',
  flame: '#ffb347',
  bullet: '#ffe9a3',
  enemyBullet: '#ff5d8f',
  drone: '#ff4fd8',
  weaver: '#ff9f2e',
  carrier: '#ff4757',
  carrierCore: '#ffd32a',
  stinger: '#3fd2ff',
  boss: '#ff3860',
  bossCore: '#ffe74c',
  bossDark: '#7a1030',
  powerWeapon: '#ffe74c',
  powerRapid: '#3dffc8',
  powerShield: '#54a0ff',
  powerLife: '#ff6b81',
  text: '#eef6ff',
  muted: '#8fa3c8',
  accent: '#ffe74c',
  danger: '#ff4757',
  panel: 'rgba(8, 14, 34, 0.72)',
};

export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'starfall-defender.best';
