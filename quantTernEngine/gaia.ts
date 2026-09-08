#!/usr/bin/env node
// gaia.ts — the world-memory: one seed, eight layers, deterministic forever.
//
// GAIA is the central world-memory ACT of the 8b-is engine — the universe
// history/memory module. Every physical constant of a zone folds out of ONE
// pseudorandom seed: weather, universe entropy, time, gravity, wind,
// temperature, light, and memory. Same seed + same tick ⇒ same universe.
//
//   seed → GAIA(seed, t) → {time, weather, entropy, gravity, wind, temp, light, memory}
//
// This is the engine's answer to "the world runs without you": GAIA never
// sleeps — it is the field the actors walk on, the clock the mesh folds to.

import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Trit } from './tern.ts'

export type GaiaLayer = 'time' | 'weather' | 'entropy' | 'gravity' | 'wind' | 'temp' | 'light' | 'memory'
export const LAYERS: GaiaLayer[] = ['time', 'weather', 'entropy', 'gravity', 'wind', 'temp', 'light', 'memory']

export interface GaiaState {
  t: number                     // time — the zone's tick / epoch
  weather: string               // weather — a word from the zone's own vocabulary
  entropy: number               // entropy — monotone, never rewinds
  gravity: number               // gravity — the zone's constant field
  wind: [number, number, number] // wind — direction, speed, gust
  temp: number                  // temperature — the season's breath
  light: number                 // light — the sun's arc, 0..1
  memory: string                // memory — the history pointer (hash chain)
}

const WEATHER_WORDS = ['calm', 'mist', 'wind', 'rain', 'storm', 'clear', 'overcast', 'frost']

// whash — deterministic window hash: one value per (base, epoch) pair
function whash(base: number, epoch: number): number {
  let h = (base ^ Math.imul(epoch, 2654435761)) >>> 0
  h = Math.imul(h ^ (h >>> 16), 2246822519) >>> 0
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}

const round2 = (x: number) => Math.round(x * 100) / 100

export function gaiaState(brief: string, tick: number): GaiaState {
  const base = Number('0x' + createHash('sha256').update(`gaia·${brief}`).digest('hex').slice(0, 8)) >>> 0
  const t = Math.max(0, Math.floor(tick))

  // time — the zone clock; day = t % 86400
  // weather — one word per 5-minute window (the sky's memory)
  const weather = WEATHER_WORDS[whash(base, Math.floor(t / 300)) % WEATHER_WORDS.length]

  // entropy — monotone: the universe only forgets forward
  const entropy = round2(t / 86400 + (whash(base, 0) % 1000) / 1000)

  // gravity — the zone's constant field (9.7 .. 10.7)
  const gravity = round2(9.7 + (whash(base, 1) % 100) / 100)

  // wind — windowed direction, steady speed, gusting breath
  const w0 = whash(base, Math.floor(t / 60)) % 360
  const w1 = whash(base, Math.floor(t / 60) + 1) % 360
  const f = (t % 60) / 60
  const dir = Math.round(w0 + ((w1 - w0 + 360) % 360) * f) % 360
  const speed = 1 + (whash(base, Math.floor(t / 60) + 7) % 12)
  const gust = round2(speed + ((whash(base, t) % 100) / 100) * 4)
  const wind: [number, number, number] = [dir, speed, gust]

  // temperature — the season's sine (10-day year) + the day's wobble + noise
  const temp = round2(
    15
    + 8 * Math.sin((t / 864000) * Math.PI * 2)
    + 4 * Math.sin((t / 86400) * Math.PI * 2)
    + ((whash(base, t % 3600) % 100) / 100 - 0.5) * 2,
  )

  // light — the sun's arc: 0 at midnight, 1 at noon
  const light = round2(Math.max(0, Math.sin((t / 86400) * Math.PI * 2)))

  // memory — the history pointer: a hash chain over the folded hours,
  // capped so the world's memory stays cheap no matter how old it gets
  const folds = Math.floor(t / 3600)
  let mem = whash(base, 0)
  const keep = Math.min(folds, 4096)
  for (let i = 1; i <= keep; i++) mem = whash(mem, i)
  const memory = mem.toString(16).padStart(8, '0')

  return { t, weather, entropy, gravity, wind, temp, light, memory }
}

// gaiaWire — the compact mesh frame: single-char keys, the ternary wire
// e = entropy, g = gravity, v = wind, p = temp, l = light, m = memory
export function gaiaWire(s: GaiaState): string {
  return JSON.stringify({ t: s.t, w: s.weather, e: s.entropy, g: s.gravity, v: s.wind, p: s.temp, l: s.light, m: s.memory })
}

// gaiaTrits — the eight layers as balanced trits (the door to the rest of
// the quantTernEngine: any layer can seed a palette, a scene, a sound)
export function gaiaTrits(brief: string, tick: number): Trit[] {
  const s = gaiaState(brief, tick)
  const h = Number('0x' + createHash('sha256')
    .update(gaiaWire(s) + brief).digest('hex').slice(0, 8)) >>> 0
  const out: Trit[] = []
  let x = h
  for (let i = 0; i < 8; i++) {
    const r = x % 3
    out.push(r === 2 ? -1 : (r as Trit))
    x = Math.floor(x / 3)
  }
  return out
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [brief = 'sanctuary·overworld', tickArg = '0'] = process.argv.slice(2)
  const s = gaiaState(brief, Number(tickArg))
  console.log(`⟦ GAIA · ${brief} · t=${s.t} ⟧`)
  for (const k of LAYERS) {
    const v = k === 'time' ? s.t : k === 'wind' ? `${s.wind[0]}° @ ${s.wind[1]} m/s (gust ${s.wind[2]})` : s[k]
    console.log(`  ${k.padEnd(9)} ${v}`)
  }
  console.log(`wire: ${gaiaWire(s)}`)
  console.log(`trits: ${gaiaTrits(brief, s.t).join(' ')}`)
}
