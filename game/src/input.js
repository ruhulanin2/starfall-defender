// Keyboard and pointer input. The game reads a control object each step —
// { mx, my } in -1..1 and a fire flag — plus one-shot actions (confirm,
// pause) that screens consume. Pointer control steers the ship toward the
// pointer while it is held down, which doubles as the touch control.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const MOVE_KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
};

export function createInput(canvas) {
  const held = { left: false, right: false, up: false, down: false };
  let firing = false;
  let actions = 0;
  let pointer = null; // { x, y } in logical coordinates while held

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const ox = (rect.width - FIELD.width * scale) / 2;
    const oy = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    const move = MOVE_KEYS[event.code];
    if (move) {
      held[move] = true;
      event.preventDefault();
    } else if (event.code === 'Space') {
      firing = true;
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'Enter') {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      if (!event.repeat) actions |= ACTION_PAUSE;
    }
  });
  window.addEventListener('keyup', (event) => {
    const move = MOVE_KEYS[event.code];
    if (move) held[move] = false;
    else if (event.code === 'Space') firing = false;
  });
  window.addEventListener('blur', () => {
    held.left = held.right = held.up = held.down = false;
    firing = false;
    pointer = null;
  });

  canvas.addEventListener('pointerdown', (event) => {
    pointer = toLogical(event);
    actions |= ACTION_CONFIRM;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (pointer) pointer = toLogical(event);
  });
  const release = () => { pointer = null; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  return {
    /** The movement/fire control for a ship at (x, y). */
    control(x, y) {
      let mx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      let my = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      let fire = firing;
      if (pointer) {
        const dx = pointer.x - x;
        const dy = pointer.y - y;
        mx = Math.max(-1, Math.min(1, dx / 26));
        my = Math.max(-1, Math.min(1, dy / 26));
        fire = true;
      }
      return { mx, my, fire };
    },
    /** One-shot actions since the last call; reading clears them. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
