#!/usr/bin/env node
// check-floors.mjs — smoke-test every playable floor.
//
// Each floor is a self-contained HTML + inline script. This harness shims
// the browser just enough (DOM elements, a noop 2D context, rAF/interval,
// localStorage, WebSocket) to run the game's script in a sandbox, step the
// render + physics loops a few frames, and report PASS/FAIL.
//
//   node scripts/check-floors.mjs quantGame/*.html game/*.html
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

let failures = 0

function smoke(file) {
  if (file.endsWith('game_template.html')) {
    console.log(`SKIP  ${file} — template (gen.ts substitutes __MANIFEST__ at generation)`)
    return
  }
  const html = readFileSync(file, 'utf8')
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .map((m) => ({ attrs: m[1], code: m[2] }))
  if (scripts.length === 0) {
    console.log(`SKIP  ${file} — no inline script`)
    return
  }
  let context = null
  let stepped = false
  for (const s of scripts) {
    const isModule = /\btype\s*=\s*["']module["']/.test(s.attrs)
    try {
      if (isModule) {
        runModule(s.code)
      } else {
        context = runClassic(s.code, context)
      }
    } catch (e) {
      failures++
      console.log(`FAIL  ${file} — ${e.message}`)
      for (const line of (e.stack || '').split('\n').slice(1, 4)) console.log(`      ${line.trim()}`)
      return
    }
  }
  if (context && !stepped) {
    try {
      step(context)
    } catch (e) {
      failures++
      console.log(`FAIL  ${file} — ${e.message}`)
      for (const line of (e.stack || '').split('\n').slice(1, 4)) console.log(`      ${line.trim()}`)
      return
    }
  }
  console.log(`PASS  ${file}`)
}

// ── module scripts: syntax-check only (imports would need a real loader) ──
import { spawnSync } from 'node:child_process'
function runModule(code) {
  const r = spawnSync('node', ['--check', '--input-type=module', '--eval', code], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(r.stderr.split('\n')[0] || 'module syntax')
}

// ── classic scripts: full shim, one shared context per file (the browser
//    model — globals and top-level let/const are visible across <script>
//    blocks), then a few stepped frames ──
function makeContext() {
  const elements = new Map()
  const rafQ = []
  const intQ = [] // {cb, period, next}
  let now = 0
  const time = () => now
  const performance = { now: time }

  const ctx2d = new Proxy(function () {}, {
    get: (t, k) => {
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient') {
        return () => ({ addColorStop() {} })
      }
      if (k === 'createPattern') return () => ({})
      if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(16), width: 1, height: 1 })
      if (k === 'createImageData') {
        return (w, h) => {
          const W = typeof w === 'number' ? (w || 1) : (w?.width || 1)
          const H = typeof w === 'number' ? (h || w || 1) : (w?.height || 1)
          return { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) }
        }
      }
      if (k === 'measureText') return () => ({ width: 0 })
      if (k === 'canvas') return new El('canvas')
      return () => {}
    },
    set: () => true,
    apply: () => {},
  })

  class El {
    constructor(id = '') {
      this.id = id
      this.style = new Proxy({}, { set: () => true, get: (t, k) => (k === 'display' ? 'none' : '') })
      this.dataset = {}
      this.children = []
      this._text = ''
      this._html = ''
    }
    set textContent(v) { this._text = String(v) }
    get textContent() { return this._text }
    set innerHTML(v) { this._html = String(v) }
    get innerHTML() { return this._html }
    getContext() { return ctx2d }
    addEventListener() {}
    removeEventListener() {}
    querySelector() { return null }
    querySelectorAll() { return [] }
    appendChild() {}
    remove() {}
    classList = { add() {}, remove() {}, toggle() {}, contains: () => false }
    getBoundingClientRect() { return { width: 100, height: 50, left: 0, top: 0 } }
  }

  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, new El(String(id)))
    return elements.get(id)
  }
  const document = {
    getElementById: getEl,
    createElement: (t) => new El(t),
    body: new El('body'),
    addEventListener() {},
  }
  const windowShim = { addEventListener() {}, devicePixelRatio: 2, location: { href: '' } }
  const context = {
    console,
    Math,
    JSON,
    Date,
    Promise,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    parseFloat,
    parseInt,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    TextEncoder,
    TextDecoder,
    document,
    window: windowShim,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 2,
    screen: { width: 1280, height: 720 },
    navigator: {},
    location: { href: '' },
    performance,
    requestAnimationFrame: (cb) => { rafQ.push(cb); return rafQ.length },
    cancelAnimationFrame() {},
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: (cb, period) => { const h = { cb, period: Number(period) || 100, next: time() + (Number(period) || 100) }; intQ.push(h); return intQ.length },
    clearInterval() {},
    addEventListener() {},
    Image: class {},
    Audio: class {},
    WebSocket: class { constructor() { throw new Error('no ws in smoke') } },
    XMLHttpRequest: class {},
    fetch: () => Promise.reject(new Error('no fetch in smoke')),
  }
  context.globalThis = context
  vm.createContext(context)
  return { context, rafQ, intQ, tick: (ms) => { now += ms } }
}

function runClassic(code, env) {
  const e = env ?? makeContext()
  vm.runInContext(code, e.context, { timeout: 5000 })
  return e
}

function step(env) {
  const { context, rafQ, intQ, tick } = env
  // a few render frames + interval ticks, like the first seconds of play
  for (let frame = 0; frame < 20; frame++) {
    tick(33)
    for (const h of intQ) h.cb()
    const queue = rafQ.splice(0)
    for (const cb of queue) cb(0)
  }
  // the loop usually starts on the boot click — start it directly when present
  if (typeof context.loop === 'function') {
    for (let i = 0; i < 3; i++) context.loop()
  }
  if (typeof context.phys === 'function') {
    for (let i = 0; i < 3; i++) context.phys(0.033)
  }
}

for (const file of process.argv.slice(2)) smoke(file)
console.log(failures === 0 ? '\nall floors smoke-clean' : `\n${failures} floor(s) failed`)
process.exit(failures === 0 ? 0 : 1)
