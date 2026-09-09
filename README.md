# CENTERFUGEQ

the aligned centerfuge. the ledger keeps no chains, the engine speaks in
three symbols, and every artifact is a pure function of a seed line.

```
centerfugeq/
├── admissibility/          the render ledger / inspection surface — polished
│   └── (index.html · dashboard.css · dashboard.js · data.json)
├── quantTernEngine/        the ternary {-1, 0, +1} generation engine
│   ├── tern.ts             seeds → trits → PRNG → wire (dependency-free)
│   ├── gen.ts              CLI: game | video | image | tensor from one brief
│   ├── gaia.ts             the world-memory: one seed, eight layers (weather,
│   │                       entropy, gravity, wind, temp, light, memory)
│   ├── spark.ts            the first spark core: the same inputs, the same map
│   └── package.json
├── demos/                  NEON CITY 42 — the flying android, the first demo
│   └── neon-city-42.html   pink-neon midtown: walkers, galaxies, 21 aligned NPCs
├── game/                   SUPER PADME BROS. — the buddhist platformer
│   └── super-padme-bros.html (the engine inline, 4 gates × 27 malas = 108)
├── quantGame/              galaxy formation as a game engine
│   ├── halo.ts              the vector dark matter halo — polarization dynamics
│   ├── ising.ts             2D Ising lattice, image-statistic complexity
│   ├── galaxy.ts            the coupling: wells → bias → stars
│   ├── sim.ts               headless run: any brief seeds a deterministic history
│   └── galaxy.html          play it: click the field, watch the stars freeze
├── pixel/                  the indie lane: sprites, chiptune WAV, tilemaps
│   ├── sprites.ts           procedural pixel art from the ternary wire
│   ├── chip.ts              deterministic chiptune → PCM16 WAV
│   └── tilemap.ts           Ising-relaxed maps, PICO-8/TIC-80 CSV export
├── blender3d/               the 2.5D/3D lane: seed → scene.py → EEVEE render
│   └── scene_builder.ts     headless Blender, same env contract as Centerfuge
├── engines/                 where the artifacts land: Godot, Bevy, raylib, TIC-80…
├── party.ts                 one brief in → a full demoscene entry out
├── retro/                  the old-school lane: bitTricks, doombible, demoscene
│   ├── bitTricks.ts         branchless abs/sign, popcount, gray, ternary seam
│   ├── doombible.ts         BSP/sightline/LUT tricks + the game's design bible
│   └── demoscene/           the inspiration index (fantasy consoles, GPL sources)
├── fanout/                 entheai fan-out scaffold (agy executor)
└── docs/                   the wire, documented
```

## the ledger (admissibility/)

The Blender admissibility suite (16 scenes, 40 checks, all pass — see
`data.json`) surfaces here as the RENDER LEDGER / INSPECTION SURFACE:
search, filters, expandable experiment cards, evidence sidecars. Aligned
to the constellation: nebula theme, the quant wire line, the Lovetta lane
footer.

## the engine (quantTernEngine/)

Any claim becomes a seed; any seed becomes a vector of balanced trits
{-1, 0, +1}; any trit vector becomes a deterministic PRNG; any PRNG
becomes a game, a video, or an image plan. Replayable from the seed line
alone — the same artifact, every machine, every time.

```bash
node quantTernEngine/gen.ts image  "the pink tent at dawn"
node quantTernEngine/gen.ts video  "komorebi through the fold" --frames 12
node quantTernEngine/gen.ts game   "the keeper of the 108 gates" --entities 8
node quantTernEngine/gaia.ts "sanctuary·overworld" 86400   # the field at tick 86400
node quantTernEngine/gen.ts tensor "om mani padme hung humm" --rows 4 --cols 8
```

The `spark` core is the framework seam: any full birth name + birth date
becomes Road + Vessel + Radiant Number + Color Codex tier + the karmic
conditions, replayable from the seed line — "the same inputs always
produce the same map".

```bash
node quantTernEngine/spark.ts "Full Birth Name" YYYY-MM-DD
```

The `tensor` modality is the GPU seam: the same seed line becomes a
deterministic BitNet b1.58 weight tensor (int8 + gamma) for MLX-QUANT's
ternary Metal kernels, submitted through hw-ultra's bare-metal command
queue — see `docs/MLX_QUANT_WIRE.md`.

Each run writes a manifest into `out/` carrying the seed line `⟦…⟧` and
the ternary wire — the ledger entry of the creation. The fan-out scaffold
(`fanout/centerfugeq-scaffold.toml`) turns the same seed line into
entheai/agy coders that expand the wire into full render fragments.

## the first demo

[NEON CITY 42](demos/neon-city-42.html) — the engine's first show: fly a
pink-neon midtown as the android POV, 21 confederate NPCs (42D hypermesh
llms, mem8-synced) with walking routes and memory bubbles, a sky full of
galaxies and a universe-event ticker. One seed, one city, deterministic.

```bash
open demos/neon-city-42.html   # w/s forward-back · a/d yaw · arrows altitude
```

## the galaxy

[quantGame](quantGame/galaxy.html) — galaxy formation as a game engine,
standing on two arXiv results: the vector dark matter halo (polarization
dynamics, coherence as the observable) and the 2D Ising model (phase
transition complexity read as image statistics). One seed owns the
galaxy; one click perturbs it — same seed, same history, byte for byte.
See `docs/QUANTGAME.md` and `fanout/quantgame-scaffold.toml` (agy +
gemini flash).

```bash
node quantGame/sim.ts "the pink tent at dawn" --steps 250
```

## the game

[SUPER PADME BROS.](game/super-padme-bros.html) — a Mario-like adventure
on the ternary wire: hop the four gates (the tent, the six gates, the
samsara field, the 108th dimension), collect 27 malas per level (108 in
all), stomp the three poisons — desire, aversion, ignorance — to LIBERATE
them (karma +1, nem-ártás), light the butter lamps, and reach the pink
tent. Every level is generated from a seed line: type any brief and hit
⟳ replay, the same level builds every time.

```bash
open game/super-padme-bros.html   # ← → / AD · ↑ / W / SPACE (lotus: double)
```

## provenance

- upstream: standardgalactic/Centerfuge — `admissibility-experiments` (MIT-ish, Blender 4+)
- aligned: 8b/centerfugeq — this repo
- wire alignment: 8b/enthea — the deepsiper-enthea engine door, ternaryPureASCII seam
- gpu lane: 8b/MLX-QUANT — BitNet b1.58 ternary Metal kernels (12.80x compression)
- queue lane: 8b/hw-ultra — bare-metal memory + command queue abstraction (Apple Silicon / MI300X)

the constellation · 0 + 1 · fine touch from within · vaked.dev