#!/usr/bin/env node
// scene_builder.ts — the 2.5D/3D lane: seed → Blender scene script → render.
//
// The Centerfuge pattern (admissibility-experiments): a scene is a claim
// made as geometry, a render is the evidence. Here the claim is a
// tilemap or a galaxy frame; the geometry is boxes over the board; the
// render is PNG frames — deterministic, headless, EEVEE.
//
//   node blender3d/scene_builder.ts <manifest.json> <out.scene.py>
//   blender --background --python out.scene.py
//
// env: WIDTH HEIGHT SAMPLES ADMISSIBILITY_OUTPUT (same contract as the
// Centerfuge suite).

import { writeFileSync } from 'node:fs'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

// the constellation palette as blender hexes
const MATS = ['#0d0512', '#3a2150', '#ff6ec7', '#ff9ad5', '#b48bff', '#ffd36e', '#62e6c9', '#e8d8f0']

function buildScript(manifest: unknown, outPng: string): string {
  const m = manifest as {
    seed_line?: string
    brief?: string
    payload?: { board?: number[]; world?: number[]; roster?: { name: string }[] }
    tiles?: number[]
    width?: number
  }
  const board = m.tiles ?? m.payload?.board ?? m.payload?.world ?? []
  const size = m.width ?? 16
  const line = m.seed_line ?? 'the constellation · 0 + 1'
  const brief = m.brief ?? 'the pink tent at dawn'
  const heights = new Array<number>(board.length)
  for (let i = 0; i < board.length; i++) {
    heights[i] = board[i] === -1 ? 0.3 : 0.8 + (board[i] + 1) * 0.9
  }
  const py = `import bpy, os
from mathutils import Vector

# --- the constellation scene — seed: ${line}
# --- brief: ${brief}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in dir(bpy.types) else 'BLENDER_EEVEE'
bpy.context.scene.render.resolution_x = int(os.environ.get('WIDTH', '1280'))
bpy.context.scene.render.resolution_y = int(os.environ.get('HEIGHT', '720'))
bpy.context.scene.render.image_settings.file_format = 'PNG'

MATS = ${JSON.stringify(MATS)}
def mat(hexc, name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        r, g, b = int(hexc[1:3],16)/255, int(hexc[3:5],16)/255, int(hexc[5:7],16)/255
        bsdf.inputs['Base Color'].default_value = (r, g, b, 1)
        bsdf.inputs['Roughness'].default_value = 0.55
    return m

heights = ${JSON.stringify(heights)}
size = ${size}
# floor
bpy.ops.mesh.primitive_plane_add(size=size*2, location=(size/2-0.5, size/2-0.5, 0))
bpy.context.object.data.materials.append(mat('#0d0512', 'floor'))
for i, h in enumerate(heights):
    x, y = i % size, i // size
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, h/2))
    bpy.context.object.scale.z = h
    bpy.context.object.data.materials.append(mat(MATS[int(i*7 + h*3) % len(MATS)], f'm{i}'))

# light + the dawn world (EEVEE needs a sky, not a void)
bpy.ops.object.light_add(type='SUN', location=(size, size, size))
bpy.data.objects['Sun'].data.energy = 3
bpy.data.objects['Sun'].rotation_euler = (0.8, 0, 0.4)
w = bpy.data.worlds.new('dawn')
bpy.context.scene.world = w
w.use_nodes = True
bg = w.node_tree.nodes.get('Background')
if bg:
    bg.inputs[0].default_value = (0.02, 0.04, 0.09, 1)
    bg.inputs[1].default_value = 1.0

# camera: aim at the board center — a fixed pose misses the field
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(size/2-0.5, size/2-0.5, 1))
target = bpy.context.object
bpy.ops.object.camera_add(location=(size*0.72, size*0.9, size*0.95))
cam = bpy.context.object
cam.constraints.new(type='TRACK_TO')
cam.constraints[0].target = target
cam.constraints[0].track_axis = 'TRACK_NEGATIVE_Z'
cam.constraints[0].up_axis = 'UP_Y'
bpy.context.scene.camera = cam
bpy.context.view_layer.update()

out = os.environ.get('ADMISSIBILITY_OUTPUT', '${outPng}')
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.context.scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print('RENDERED →', out)
`
  return py
}

function main(): void {
  const [manifestPath, scriptPath] = process.argv.slice(2)
  if (!manifestPath || !scriptPath) {
    console.error('usage: node blender3d/scene_builder.ts <manifest.json> <out.scene.py>')
    process.exit(1)
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const outPng = process.env.ADMISSIBILITY_OUTPUT || ''
  const py = buildScript(manifest, outPng)
  mkdirSync(dirname(scriptPath), { recursive: true })
  writeFileSync(scriptPath, py)
  console.log(`scene script: ${scriptPath} (${py.length} bytes)`)
  console.log(`render: ADMISSIBILITY_OUTPUT=${outPng || '<set me>'} blender --background --python ${scriptPath}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}