// Starfall Defender — the simulation. Everything that moves lives here; the
// renderer only reads state, and input only fills a control object, so the
// same seed and the same controls always produce the same game (which is
// what makes the staged screenshot scenes repeatable).
import {
  BULLET, CARRIER, DRONE, FIELD, LIVES, PLAYER, POWERUP, WAVE, WEAVER,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_SHIELD = 4;
export const EVENT_POWER = 8;
export const EVENT_WAVE = 16;

const ENEMY_STATS = { drone: DRONE, weaver: WEAVER, carrier: CARRIER };

export function createWorld(random) {
  const state = {
    time: 0,
    score: 0,
    lives: LIVES,
    wave: 0,
    over: false,
    player: null,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    powerups: [],
    particles: [],
    floaters: [],
    spawnQueue: [],
    spawnTimer: 0,
    waveState: 'gap',
    gapTimer: 0,
    banner: { text: '', t: 0 },
    shake: 0,
    flash: 0,
    dropIndex: 0,
    attractSpawn: 0,
  };

  function freshPlayer() {
    return {
      x: PLAYER.startX, y: PLAYER.startY, alive: true,
      invuln: 0, weapon: 1, rapid: 0, shield: 0, fireTimer: 0, respawn: 0,
    };
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.lives = LIVES;
    state.wave = 0;
    state.over = false;
    state.player = freshPlayer();
    state.bullets.length = 0;
    state.enemyBullets.length = 0;
    state.enemies.length = 0;
    state.powerups.length = 0;
    state.particles.length = 0;
    state.floaters.length = 0;
    state.spawnQueue.length = 0;
    state.spawnTimer = 0;
    state.waveState = 'gap';
    state.gapTimer = 0.9;
    state.banner = { text: '', t: 0 };
    state.shake = 0;
    state.flash = 0;
    state.dropIndex = 0;
    state.attractSpawn = 0;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const v = (0.25 + random() * 0.75) * speed;
      const life = 0.35 + random() * 0.5;
      state.particles.push({
        x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
        life, maxLife: life, color, size: 2 + random() * 3,
      });
    }
  }

  function floater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, t: 0 });
  }

  function buildWave(n) {
    const queue = [];
    const drones = 6 + n * 2;
    const weavers = n >= 2 ? (n - 1) * 2 : 0;
    const carriers = n >= 3 ? Math.floor((n + 1) / 3) : 0;
    for (let i = 0; i < drones; i += 1) queue.push('drone');
    for (let i = 0; i < weavers; i += 1) queue.splice(Math.floor(random() * (queue.length + 1)), 0, 'weaver');
    for (let i = 0; i < carriers; i += 1) queue.splice(Math.floor(queue.length * (0.3 + 0.4 * random())), 0, 'carrier');
    return queue;
  }

  function startWave() {
    state.wave += 1;
    state.spawnQueue = buildWave(state.wave);
    state.spawnTimer = 0.2;
    state.waveState = 'spawning';
    state.banner = { text: `WAVE ${state.wave}`, t: 1.8 };
  }

  function spawnEnemy(kind) {
    const stats = ENEMY_STATS[kind];
    const x = 70 + random() * (FIELD.width - 140);
    state.enemies.push({
      kind, x, baseX: x, y: -stats.radius - 6, hp: stats.hp, t: 0,
      phase: random() * Math.PI * 2,
      fireTimer: 1 + random() * stats.fireInterval || 0,
    });
  }

  function dropPowerup(x, y, guaranteed) {
    const roll = random();
    let kind;
    if (roll < POWERUP.lifeChance && state.lives < 5) kind = 'life';
    else {
      kind = POWERUP.cycle[state.dropIndex % POWERUP.cycle.length];
      state.dropIndex += 1;
    }
    if (guaranteed || kind) state.powerups.push({ x, y, kind, t: 0 });
  }

  function killEnemy(enemy, index, scored) {
    const stats = ENEMY_STATS[enemy.kind];
    state.enemies.splice(index, 1);
    burst(enemy.x, enemy.y, enemy.kind === 'drone' ? '#ff4fd8' : enemy.kind === 'weaver' ? '#ff9f2e' : '#ff4757', enemy.kind === 'carrier' ? 30 : 16, 260);
    if (scored) {
      state.score += stats.score;
      floater(enemy.x, enemy.y, `+${stats.score}`, '#cfe9ff');
      if (random() < stats.dropChance || enemy.kind === 'carrier') dropPowerup(enemy.x, enemy.y, enemy.kind === 'carrier');
    }
  }

  function hitPlayer(events) {
    const player = state.player;
    if (player.shield > 0) {
      player.shield = 0;
      player.invuln = Math.max(player.invuln, 1.2);
      burst(player.x, player.y, '#54a0ff', 18, 240);
      floater(player.x, player.y - 26, 'SHIELD DOWN', '#54a0ff');
      return events | EVENT_SHIELD;
    }
    state.lives -= 1;
    state.shake = 11;
    state.flash = 0.4;
    burst(player.x, player.y, '#ffd76a', 34, 320);
    player.weapon = Math.max(1, player.weapon - 1);
    player.rapid = 0;
    if (state.lives <= 0) {
      player.alive = false;
      state.over = true;
      return events | EVENT_HIT | EVENT_OVER;
    }
    player.alive = false;
    player.respawn = PLAYER.respawnDelay;
    return events | EVENT_HIT;
  }

  function shoot() {
    const player = state.player;
    const y = player.y - 18;
    if (player.weapon === 1) {
      state.bullets.push({ x: player.x, y, vx: 0, vy: -BULLET.speed });
    } else if (player.weapon === 2) {
      state.bullets.push({ x: player.x - 10, y: y + 4, vx: 0, vy: -BULLET.speed });
      state.bullets.push({ x: player.x + 10, y: y + 4, vx: 0, vy: -BULLET.speed });
    } else {
      state.bullets.push({ x: player.x, y, vx: 0, vy: -BULLET.speed });
      state.bullets.push({ x: player.x - 12, y: y + 6, vx: -130, vy: -BULLET.speed * 0.94 });
      state.bullets.push({ x: player.x + 12, y: y + 6, vx: 130, vy: -BULLET.speed * 0.94 });
    }
  }

  function enemyShoot(enemy) {
    const player = state.player;
    if (enemy.kind === 'weaver') {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      state.enemyBullets.push({
        x: enemy.x, y: enemy.y + 12,
        vx: (dx / len) * BULLET.enemySpeed, vy: (dy / len) * BULLET.enemySpeed,
      });
    } else if (enemy.kind === 'carrier') {
      for (const spread of [-0.32, 0, 0.32]) {
        state.enemyBullets.push({
          x: enemy.x, y: enemy.y + 24,
          vx: Math.sin(spread) * BULLET.enemySpeed, vy: Math.cos(spread) * BULLET.enemySpeed,
        });
      }
    }
  }

  function stepAttract(dt) {
    state.attractSpawn -= dt;
    if (state.attractSpawn <= 0 && state.enemies.length < 7) {
      spawnEnemy('drone');
      state.attractSpawn = 0.8 + random() * 0.7;
    }
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      e.t += dt;
      e.y += DRONE.speed * 0.55 * dt;
      e.x = e.baseX + Math.sin(e.t * DRONE.swaySpeed + e.phase) * DRONE.sway;
      if (e.y > FIELD.height + 50) state.enemies.splice(i, 1);
    }
    updateFx(dt);
    return 0;
  }

  function updateFx(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) { state.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const f = state.floaters[i];
      f.t += dt;
      f.y -= 34 * dt;
      if (f.t > 0.9) state.floaters.splice(i, 1);
    }
  }

  function step(dt, control, attract) {
    state.time += dt;
    if (state.banner.t > 0) state.banner.t -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
    if (attract) return stepAttract(dt);
    if (state.over) { updateFx(dt); return 0; }

    let events = 0;
    const player = state.player;

    // Waves
    if (state.waveState === 'gap') {
      state.gapTimer -= dt;
      if (state.gapTimer <= 0) { startWave(); events |= EVENT_WAVE; }
    } else if (state.waveState === 'spawning') {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
        spawnEnemy(state.spawnQueue.shift());
        const interval = Math.max(WAVE.spawnIntervalMin, WAVE.spawnInterval - state.wave * 0.03);
        state.spawnTimer = interval * (0.6 + random() * 0.7);
      }
      if (state.spawnQueue.length === 0) state.waveState = 'fighting';
    } else if (state.waveState === 'fighting' && state.enemies.length === 0) {
      state.waveState = 'gap';
      state.gapTimer = WAVE.gap;
      state.score += 100;
      floater(FIELD.width / 2, 300, 'WAVE CLEAR  +100', '#ffe74c');
    }

    // Player
    if (player.alive) {
      player.x = Math.min(FIELD.width - 30, Math.max(30, player.x + control.mx * PLAYER.speed * dt));
      player.y = Math.min(PLAYER.maxY, Math.max(PLAYER.minY, player.y + control.my * PLAYER.speed * dt));
      if (player.invuln > 0) player.invuln -= dt;
      if (player.rapid > 0) player.rapid -= dt;
      if (player.shield > 0) player.shield -= dt;
      player.fireTimer -= dt;
      if (control.fire && player.fireTimer <= 0) {
        shoot();
        player.fireTimer = PLAYER.fireInterval * (player.rapid > 0 ? PLAYER.rapidMultiplier : 1);
      }
      if (random() < 0.6) {
        state.particles.push({
          x: player.x + (random() - 0.5) * 6, y: player.y + 20,
          vx: (random() - 0.5) * 20, vy: 130 + random() * 60,
          life: 0.28, maxLife: 0.28, color: '#ff9f2e', size: 2.4,
        });
      }
    } else if (!state.over) {
      player.respawn -= dt;
      if (player.respawn <= 0) {
        player.x = PLAYER.startX;
        player.y = PLAYER.startY;
        player.alive = true;
        player.invuln = PLAYER.invulnerable;
        state.enemyBullets.length = 0;
      }
    }

    // Bullets
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -20 || b.x < -20 || b.x > FIELD.width + 20) state.bullets.splice(i, 1);
    }
    for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
      const b = state.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y > FIELD.height + 20 || b.y < -30 || b.x < -20 || b.x > FIELD.width + 20) state.enemyBullets.splice(i, 1);
    }

    // Enemies
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      const stats = ENEMY_STATS[e.kind];
      e.t += dt;
      if (e.kind === 'drone') {
        e.y += (DRONE.speed + state.wave * DRONE.speedPerWave) * dt;
        e.x = e.baseX + Math.sin(e.t * DRONE.swaySpeed + e.phase) * DRONE.sway;
      } else if (e.kind === 'weaver') {
        e.y += WEAVER.speed * dt;
        e.x = e.baseX + Math.sin(e.t * WEAVER.swaySpeed + e.phase) * WEAVER.sway;
      } else {
        e.y += CARRIER.speed * dt;
        e.x = e.baseX + Math.sin(e.t * 0.7 + e.phase) * 26;
      }
      e.x = Math.min(FIELD.width - 40, Math.max(40, e.x));
      if (e.y > FIELD.height + 60) { state.enemies.splice(i, 1); continue; }
      if (e.kind !== 'drone' && player.alive && e.y > 10 && e.y < FIELD.height * 0.75) {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          enemyShoot(e);
          e.fireTimer = stats.fireInterval * (0.85 + random() * 0.4);
        }
      }
    }

    // Power-ups drift down
    for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
      const p = state.powerups[i];
      p.t += dt;
      p.y += POWERUP.speed * dt;
      p.x += Math.sin(p.t * 2.4) * 22 * dt;
      if (p.y > FIELD.height + 30) state.powerups.splice(i, 1);
    }

    // Bullet vs enemy
    for (let bi = state.bullets.length - 1; bi >= 0; bi -= 1) {
      const b = state.bullets[bi];
      let consumed = false;
      for (let ei = state.enemies.length - 1; ei >= 0; ei -= 1) {
        const e = state.enemies[ei];
        const r = ENEMY_STATS[e.kind].radius + BULLET.radius;
        if (Math.abs(b.x - e.x) < r && Math.abs(b.y - e.y) < r && Math.hypot(b.x - e.x, b.y - e.y) < r) {
          e.hp -= 1;
          consumed = true;
          if (e.hp <= 0) killEnemy(e, ei, true);
          else burst(b.x, b.y, '#ffffff', 3, 140);
          break;
        }
      }
      if (consumed) state.bullets.splice(bi, 1);
    }

    // Enemy fire / bodies vs player
    if (player.alive && player.invuln <= 0) {
      for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
        const b = state.enemyBullets[i];
        if (Math.hypot(b.x - player.x, b.y - player.y) < PLAYER.radius + BULLET.enemyRadius) {
          state.enemyBullets.splice(i, 1);
          events = hitPlayer(events);
          break;
        }
      }
    }
    if (player.alive && player.invuln <= 0 && !state.over) {
      for (let ei = state.enemies.length - 1; ei >= 0; ei -= 1) {
        const e = state.enemies[ei];
        if (Math.hypot(e.x - player.x, e.y - player.y) < PLAYER.radius + ENEMY_STATS[e.kind].radius - 2) {
          killEnemy(e, ei, false);
          events = hitPlayer(events);
          break;
        }
      }
    }

    // Power-up pickup
    if (player.alive) {
      for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
        const p = state.powerups[i];
        if (Math.hypot(p.x - player.x, p.y - player.y) < PLAYER.radius + POWERUP.radius + 6) {
          state.powerups.splice(i, 1);
          events |= EVENT_POWER;
          if (p.kind === 'weapon') {
            player.weapon = Math.min(3, player.weapon + 1);
            floater(player.x, player.y - 30, player.weapon >= 3 ? 'TRIPLE CANNON!' : 'WEAPON UP!', '#ffe74c');
          } else if (p.kind === 'rapid') {
            player.rapid = PLAYER.rapidSeconds;
            floater(player.x, player.y - 30, 'RAPID FIRE!', '#3dffc8');
          } else if (p.kind === 'shield') {
            player.shield = PLAYER.shieldSeconds;
            floater(player.x, player.y - 30, 'SHIELD ON!', '#54a0ff');
          } else {
            state.lives = Math.min(5, state.lives + 1);
            floater(player.x, player.y - 30, 'EXTRA LIFE!', '#ff6b81');
          }
        }
      }
    }

    updateFx(dt);
    return events;
  }

  reset();
  return { state, reset, step };
}
