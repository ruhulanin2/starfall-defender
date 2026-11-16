# Starfall Defender

A neon space shooter that runs in a desktop browser from static files — no
build step, no network, no libraries. Everything on screen is drawn from
code: the starfighter, the swarm, the nebulae, even the sounds.

## The game

Waves of swarm ships are falling toward your line:

- **Drones** — fast magenta darts that sway as they dive. 50 points.
- **Stingers** — small cyan hunters that dive fast and drift toward your
  ship. 80 points.
- **Weavers** — orange gunners that snake across the sky and fire aimed
  bolts. 100 points.
- **Carriers** — heavy red hulls with a glowing core, triple-shot spreads
  and a big health pool. 300 points, and they always drop a power core.
- **The Dreadnought** — every 5th wave a capital ship with a pulsing core
  takes the field: aimed spreads, rotating bullet rings and twin pod
  volleys, launching drone escorts while it fights. 2,000 points and a
  shower of power cores when it falls.

Kills chain into **combos**: every 5 kills inside a short window raise your
score multiplier, up to x5 — get hit and the chain breaks.

Shot-down ships drop **power cores**. Fly into one to collect it:

- **W** — Weapon up: twin cannon, then a triple cannon.
- **R** — Rapid fire for 10 seconds.
- **S** — A shield that absorbs one hit.
- **+** — A rare extra life.

You have 3 lives. A hit costs a life and a weapon level; a clear wave pays
a 100-point bonus. Waves grow faster and denser the longer you hold.

## Controls

- **Move:** WASD / arrow keys, or hold and drag the pointer (touch works too)
- **Fire:** Space, or hold the pointer down
- **Pause:** P or Esc — **Start / restart:** Enter or click

## Run it

```
node serve.ts          # serves game/ on http://localhost:8080
```

Then open http://localhost:8080 in a desktop browser. Opening
`game/index.html` directly also works in most browsers.

Deterministic screenshot scenes are staged at
`game/index.html?shot=start|play|battle|end&seed=N` — an autopilot plays
the real rules forward, so the frames in `screenshots/` are honest renders
of the game itself.

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the vendored library.
- `vendor/makefun-game.ts` — make.fun's dossier library, copied unchanged.
- `game/` — the playable game (`index.html` + ES modules under `src/`:
  `config` tuning, `world` simulation, `input`, `render`, `shots`
  autopilot scenes, `main` boot/loop).
- `screenshots/` — renders of the game, first by name is the cover.

MIT licensed — see `LICENSE`.
