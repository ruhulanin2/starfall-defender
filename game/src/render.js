// Starfall Defender — the renderer. Reads world state and paints it: a deep
// space backdrop with parallax stars and nebulae, a glowing starfighter,
// neon enemies, particles and a clean HUD. All art is drawn from code — no
// image files — and everything time-based runs off state.time, so a staged
// screenshot scene always paints the same frame.
import { CARRIER, FIELD, FONT, PALETTE, PLAYER, POWERUP } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const STAR_LAYERS = [
  { count: 70, speed: 14, size: 1.1, alpha: 0.5 },
  { count: 46, speed: 34, size: 1.8, alpha: 0.75 },
  { count: 26, speed: 64, size: 2.6, alpha: 1 },
];

const NEBULAE = [
  { x: 240, y: 150, r: 330, color: PALETTE.nebulaA },
  { x: 1010, y: 300, r: 380, color: PALETTE.nebulaB },
  { x: 620, y: 640, r: 300, color: PALETTE.nebulaC },
];

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const starRandom = createRandom(20261116);
  const stars = [];
  for (const layer of STAR_LAYERS) {
    for (let i = 0; i < layer.count; i += 1) {
      stars.push({ x: starRandom() * FIELD.width, y: starRandom() * FIELD.height, layer });
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  function text(str, x, y, size, color, align = 'center', weight = 700, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function drawBackground(state) {
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.spaceTop);
    grad.addColorStop(1, PALETTE.spaceBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const neb of NEBULAE) {
      const pulse = 1 + Math.sin(state.time * 0.24 + neb.x) * 0.05;
      const rg = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.r * pulse);
      rg.addColorStop(0, neb.color);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(neb.x - neb.r * 1.2, neb.y - neb.r * 1.2, neb.r * 2.4, neb.r * 2.4);
    }
    ctx.fillStyle = '#ffffff';
    for (const star of stars) {
      const y = (star.y + state.time * star.layer.speed) % FIELD.height;
      ctx.globalAlpha = star.layer.alpha * (0.7 + 0.3 * Math.sin(state.time * 2 + star.x));
      ctx.fillRect(star.x, y, star.layer.size, star.layer.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawShip(state) {
    const p = state.player;
    if (!p || !p.alive) return;
    if (p.invuln > 0 && Math.floor(state.time * 14) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.save();
    ctx.translate(p.x, p.y);
    // Engine flame
    const flame = 15 + Math.sin(state.time * 42) * 5 + Math.sin(state.time * 71) * 3;
    ctx.beginPath();
    ctx.moveTo(-6, 16);
    ctx.lineTo(0, 16 + flame);
    ctx.lineTo(6, 16);
    ctx.closePath();
    ctx.fillStyle = PALETTE.flame;
    ctx.shadowColor = PALETTE.flame;
    ctx.shadowBlur = 12;
    ctx.fill();
    // Hull
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(7, -6);
    ctx.lineTo(21, 13);
    ctx.lineTo(9, 10);
    ctx.lineTo(5, 17);
    ctx.lineTo(-5, 17);
    ctx.lineTo(-9, 10);
    ctx.lineTo(-21, 13);
    ctx.lineTo(-7, -6);
    ctx.closePath();
    const hull = ctx.createLinearGradient(0, -24, 0, 18);
    hull.addColorStop(0, PALETTE.shipCore);
    hull.addColorStop(0.45, PALETTE.ship);
    hull.addColorStop(1, '#1b7fd4');
    ctx.fillStyle = hull;
    ctx.shadowColor = PALETTE.ship;
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Cockpit
    ctx.beginPath();
    ctx.ellipse(0, -6, 3.6, 7.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#06324a';
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    if (p.shield > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 30 + Math.sin(state.time * 5) * 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = PALETTE.powerShield;
      ctx.globalAlpha = 0.55 + Math.sin(state.time * 5) * 0.2;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = PALETTE.powerShield;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawDrone(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.sin(e.t * 1.7 + e.phase) * 0.22);
    ctx.beginPath();
    ctx.moveTo(0, 17);
    ctx.lineTo(13, -4);
    ctx.lineTo(5, -15);
    ctx.lineTo(-5, -15);
    ctx.lineTo(-13, -4);
    ctx.closePath();
    ctx.fillStyle = PALETTE.drone;
    ctx.shadowColor = PALETTE.drone;
    ctx.shadowBlur = 13;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, 4.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff0fb';
    ctx.fill();
    ctx.restore();
  }

  function drawWeaver(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.sin(e.t * 2.6 + e.phase) * 0.3);
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.quadraticCurveTo(20, 2, 23, -13);
    ctx.quadraticCurveTo(10, -6, 5, -12);
    ctx.lineTo(-5, -12);
    ctx.quadraticCurveTo(-10, -6, -23, -13);
    ctx.quadraticCurveTo(-20, 2, 0, 18);
    ctx.fillStyle = PALETTE.weaver;
    ctx.shadowColor = PALETTE.weaver;
    ctx.shadowBlur = 13;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 1, 4.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff6e8';
    ctx.fill();
    ctx.restore();
  }

  function drawCarrier(e, state) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.beginPath();
    ctx.moveTo(-36, -12);
    ctx.lineTo(-18, -26);
    ctx.lineTo(18, -26);
    ctx.lineTo(36, -12);
    ctx.lineTo(28, 20);
    ctx.lineTo(0, 28);
    ctx.lineTo(-28, 20);
    ctx.closePath();
    ctx.fillStyle = PALETTE.carrier;
    ctx.shadowColor = PALETTE.carrier;
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, 10 + Math.sin(state.time * 4 + e.phase) * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.carrierCore;
    ctx.fill();
    ctx.restore();
    if (e.hp < CARRIER.hp) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - 30, e.y - 44, 60, 6);
      ctx.fillStyle = PALETTE.carrierCore;
      ctx.fillRect(e.x - 30, e.y - 44, 60 * (e.hp / CARRIER.hp), 6);
      ctx.restore();
    }
  }

  function drawPowerup(p, state) {
    const colors = {
      weapon: PALETTE.powerWeapon, rapid: PALETTE.powerRapid,
      shield: PALETTE.powerShield, life: PALETTE.powerLife,
    };
    const color = colors[p.kind];
    const bob = Math.sin(state.time * 3.4 + p.x) * 3;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(Math.sin(state.time * 2 + p.x) * 0.16);
    ctx.beginPath();
    ctx.roundRect(-POWERUP.radius, -POWERUP.radius, POWERUP.radius * 2, POWERUP.radius * 2, 8);
    ctx.fillStyle = 'rgba(6, 12, 30, 0.9)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = `800 17px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.kind === 'weapon' ? 'W' : p.kind === 'rapid' ? 'R' : p.kind === 'shield' ? 'S' : '+', 0, 1);
    ctx.restore();
  }

  function drawWorld(state, screen) {
    drawBackground(state);
    for (const p of state.powerups) drawPowerup(p, state);
    for (const e of state.enemies) {
      if (e.kind === 'drone') drawDrone(e);
      else if (e.kind === 'weaver') drawWeaver(e);
      else drawCarrier(e, state);
    }
    // Enemy bullets
    ctx.save();
    ctx.fillStyle = PALETTE.enemyBullet;
    ctx.shadowColor = PALETTE.enemyBullet;
    ctx.shadowBlur = 9;
    for (const b of state.enemyBullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Player bullets
    ctx.save();
    ctx.fillStyle = PALETTE.bullet;
    ctx.shadowColor = PALETTE.bullet;
    ctx.shadowBlur = 9;
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.roundRect(b.x - 2.6, b.y - 9, 5.2, 18, 3);
      ctx.fill();
    }
    ctx.restore();
    if (screen !== SCREEN_TITLE) drawShip(state);
    // Particles
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    // Score floaters
    for (const f of state.floaters) {
      text(f.text, f.x, f.y, 17, f.color, 'center', 800, Math.max(0, 1 - f.t / 0.9));
    }
  }

  function drawHud(state, best) {
    text(`SCORE ${String(state.score).padStart(6, '0')}`, 26, 30, 24, PALETTE.text, 'left', 800);
    text(`WAVE ${Math.max(1, state.wave)}`, FIELD.width / 2, 30, 24, PALETTE.accent, 'center', 800);
    text(`BEST ${String(Math.max(best, state.score)).padStart(6, '0')}`, FIELD.width - 26, 30, 24, PALETTE.muted, 'right', 800);
    // Lives as little ships
    for (let i = 0; i < state.lives; i += 1) {
      ctx.save();
      ctx.translate(40 + i * 30, 64);
      ctx.scale(0.55, 0.55);
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(13, 12);
      ctx.lineTo(0, 6);
      ctx.lineTo(-13, 12);
      ctx.closePath();
      ctx.fillStyle = PALETTE.ship;
      ctx.fill();
      ctx.restore();
    }
    const swarmLeft = state.enemies.length + state.spawnQueue.length;
    text(`SWARM LEFT ${swarmLeft}`, 26, 94, 16, PALETTE.muted, 'left', 700);
    const p = state.player;
    if (p) {
      const chips = [];
      if (p.weapon > 1) chips.push(`CANNON x${p.weapon}`);
      if (p.rapid > 0) chips.push(`RAPID ${Math.ceil(p.rapid)}s`);
      if (p.shield > 0) chips.push(`SHIELD ${Math.ceil(p.shield)}s`);
      chips.forEach((chip, i) => text(chip, 26, FIELD.height - 24 - i * 24, 16, PALETTE.accent, 'left', 700));
    }
    if (state.banner.t > 0) {
      const a = Math.min(1, state.banner.t / 0.5);
      text(state.banner.text, FIELD.width / 2, 210, 54, PALETTE.text, 'center', 800, a);
    }
  }

  function drawTitle(state, best) {
    ctx.save();
    ctx.fillStyle = 'rgba(3, 6, 18, 0.35)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.restore();
    const grad = ctx.createLinearGradient(0, 190, 0, 300);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, PALETTE.ship);
    grad.addColorStop(1, '#1b7fd4');
    ctx.save();
    ctx.fillStyle = grad;
    ctx.font = `800 104px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = PALETTE.ship;
    ctx.shadowBlur = 30;
    ctx.fillText('STARFALL', FIELD.width / 2, 238);
    ctx.shadowBlur = 0;
    ctx.restore();
    text('D E F E N D E R', FIELD.width / 2, 316, 40, PALETTE.accent, 'center', 800);
    text('Hold the line against the swarm. Catch falling cores to power up your cannon.', FIELD.width / 2, 386, 21, PALETTE.text);
    text('Move: WASD / Arrow keys / Drag      Fire: Space / Hold pointer', FIELD.width / 2, 428, 19, PALETTE.muted);
    if (Math.floor(state.time * 1.6) % 2 === 0) {
      text('PRESS ENTER OR CLICK TO START', FIELD.width / 2, 502, 26, '#ffffff', 'center', 800);
    }
    if (best > 0) text(`BEST ${best}`, FIELD.width / 2, 566, 20, PALETTE.muted);
  }

  function drawOver(state, best) {
    ctx.save();
    ctx.fillStyle = 'rgba(3, 6, 18, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.restore();
    text('GAME OVER', FIELD.width / 2, 252, 68, PALETTE.danger, 'center', 800);
    text(`SCORE ${state.score}`, FIELD.width / 2, 336, 34, PALETTE.text, 'center', 800);
    const rank = state.score >= 6000 ? 'S' : state.score >= 3500 ? 'A' : state.score >= 1800 ? 'B' : state.score >= 800 ? 'C' : 'D';
    text(`RANK ${rank} — WAVE ${Math.max(1, state.wave)} REACHED`, FIELD.width / 2, 380, 21, PALETTE.accent);
    if (state.score >= best && state.score > 0) text('NEW BEST!', FIELD.width / 2, 424, 24, PALETTE.accent, 'center', 800);
    else text(`BEST ${best}`, FIELD.width / 2, 424, 21, PALETTE.muted);
    if (Math.floor(state.time * 1.6) % 2 === 0) {
      text('PRESS ENTER OR CLICK TO FLY AGAIN', FIELD.width / 2, 492, 23, '#ffffff', 'center', 800);
    }
  }

  function draw(state, screen, best) {
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.min(cw / FIELD.width, ch / FIELD.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#02040c';
    ctx.fillRect(0, 0, cw, ch);
    const ox = (cw - FIELD.width * scale) / 2;
    const oy = (ch - FIELD.height * scale) / 2;
    let sx = 0;
    let sy = 0;
    if (state.shake > 0) {
      sx = Math.sin(state.time * 91) * state.shake * 0.6;
      sy = Math.cos(state.time * 83) * state.shake * 0.6;
    }
    ctx.setTransform(scale, 0, 0, scale, ox + sx * scale, oy + sy * scale);
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.width, FIELD.height);
    ctx.clip();
    drawWorld(state, screen);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_OVER) { drawHud(state, best); drawOver(state, best); }
    if (screen === SCREEN_PAUSED) {
      ctx.save();
      ctx.fillStyle = 'rgba(3, 6, 18, 0.5)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.restore();
      text('PAUSED', FIELD.width / 2, FIELD.height / 2, 52, PALETTE.text, 'center', 800);
    }
    if (state.flash > 0) {
      const vg = ctx.createRadialGradient(640, 360, 240, 640, 360, 720);
      vg.addColorStop(0, 'rgba(255,40,60,0)');
      vg.addColorStop(1, `rgba(255,40,60,${Math.min(0.5, state.flash)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { draw };
}
