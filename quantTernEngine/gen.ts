#!/usr/bin/env node
// gen.ts — quantTernEngine CLI: any brief becomes a seed, any seed becomes
// a reproducible generation manifest for [game, video, image].
//
//   node gen.ts image "the pink tent at dawn"            → palette manifest
//   node gen.ts video "komorebi through the fold" --frames 12
//   node gen.ts game "the keeper of the 108 gates" --entities 8
//
// Each manifest carries the seed line + the ternary wire, so the same
// artifact can be replayed by any renderer (entheai fan-out, Blender
// suite, the ledger) from the line alone.

import { readFileSync, writeFileSync } from 'node:fs'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  b158Weights,
  balancedTrits,
  composeGame,
  composeImage,
  composeVideo,
  seedFromText,
  seedLine,
  wire,
} from './tern.ts'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dir, '..', 'out')

const MODALITIES = ['game', 'video', 'image', 'tensor', 'scene', 'marioq', 'son-go-ku'] as const
type Modality = (typeof MODALITIES)[number]

function usage(): never {
  console.error('usage: node gen.ts <game|video|image|tensor|scene> "<brief>" [--frames N] [--entities N] [--rows R --cols C]')
  process.exit(1)
}

function main(): void {
  const [modArg, brief, ...rest] = process.argv.slice(2)
  let frames = 12
  let entities = 6
  let rows = 4
  let cols = 8
  let width = 16
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--frames') frames = Number(rest[++i])
    if (rest[i] === '--entities') entities = Number(rest[++i])
    if (rest[i] === '--rows') rows = Number(rest[++i])
    if (rest[i] === '--cols') cols = Number(rest[++i])
    if (rest[i] === '--width') width = Number(rest[++i])
  }
  if (!modArg || !brief || !(MODALITIES as readonly string[]).includes(modArg)) usage()

  const modality = modArg as Modality
  const seed = seedFromText(brief)
  const line = seedLine(brief, 108)

  let payload: unknown
  if (modality === 'image') {
    payload = { palette: composeImage(seed) }
  } else if (modality === 'video') {
    payload = { frames: composeVideo(seed, frames) }
  } else if (modality === 'game') {
    payload = composeGame(seed, entities)
  } else if (modality === 'marioq') {
    // the ternary-world floor: the engine composes the board + the roster,
    // and this CLI renders the playable floor — engine e2e, one command
    payload = composeGame(seed, entities)
  } else if (modality === 'son-go-ku') {
    // the training yard: the engine's cast, wearing the DBZ names — the
    // heart lane keeps the roster's seeded love/harm, Goku included
    const base = composeGame(seed, 4)
    const CAST = ['GOKU', 'CHI-CHI', 'KRILLIN', 'PICCOLO']
    payload = {
      ...base,
      roster: base.roster.map((e, i) => ({ ...e, name: CAST[i % CAST.length] })),
    }
  } else if (modality === 'scene') {
    // the export lane: a game board + width → scene_builder.ts → Blender EEVEE.
    payload = { board: composeGame(seed, entities).board, width }
  } else {
    const t = b158Weights(seed, rows, cols)
    payload = {
      rows: t.rows,
      cols: t.cols,
      density: t.density,
      gamma: t.density,
      int8_hex: Buffer.from(t.W).toString('hex'),
      pipeline: 'hw-ultra command queue · MLX-QUANT ternary matmul kernel',
    }
  }

  const manifest = {
    schema_version: 1,
    modality,
    brief,
    generated_at: new Date().toISOString(),
    seed: '0x' + seed.toString(16),
    seed_line: line,
    wire: wire(balancedTrits(seed, 108)),
    trits: 108,
    payload,
    fanout: `agy --dangerously-skip-permissions -p "entheai fan-out: render ${modality} for brief '${brief}' (seed_line ${line})"`,
  }

  mkdirSync(OUT, { recursive: true })
  const file = join(OUT, `${modality}-0x${seed.toString(16).slice(0, 12)}.json`)
  const replacer = (_k: string, v: unknown): unknown =>
    typeof v === 'bigint' ? '0x' + (v as bigint).toString(16) : v
  writeFileSync(file, JSON.stringify(manifest, replacer, 2))
  console.log(`⟦${line}⟧`)
  console.log(`manifest: ${file}`)

  if (modality === 'marioq') {
    // render the playable floor from the engine's own data — the template
    // substitutes __MANIFEST__ with the composed board/world/roster
    const template = readFileSync(
      new URL('../quantGame/marioq.html', import.meta.url).pathname,
      'utf8',
    )
    const g = payload as { board: number[]; world: number[]; roster: { id: number; name: string }[] }
    const engine = {
      seed: '0x' + seed.toString(16),
      seed_line: line,
      board: g.board,
      world: g.world,
      roster: g.roster,
    }
    const html = template.replace(
      'const M = __MANIFEST__;',
      `const M = ${JSON.stringify(engine)};`,
    )
    const outHtml = join(OUT, `marioq-0x${seed.toString(16).slice(0, 12)}.html`)
    writeFileSync(outHtml, html)
    console.log(`floor:   ${outHtml}`)
  }

  if (modality === 'son-go-ku') {
    const template = readFileSync(
      new URL('../quantGame/son-go-ku-floor.html', import.meta.url).pathname,
      'utf8',
    )
    const g = payload as { board: number[]; world: number[]; roster: { id: number; name: string }[] }
    const engine = {
      seed: '0x' + seed.toString(16),
      seed_line: line,
      board: g.board,
      world: g.world,
      roster: g.roster,
    }
    const html = template.replace(
      'const M = __MANIFEST__;',
      `const M = ${JSON.stringify(engine)};`,
    )
    const outHtml = join(OUT, `son-go-ku-0x${seed.toString(16).slice(0, 12)}.html`)
    writeFileSync(outHtml, html)
    console.log(`floor:   ${outHtml}`)
  }
}

main()