import fs from 'node:fs'
import path from 'node:path'

// Inspección detallada de vértices de la pista en los 3 GLBs
function parseGLB(file) {
  const buf = fs.readFileSync(file)
  const jsonLen = buf.readUInt32LE(12)
  const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen))
  return gltf
}

console.log('--- MAPA 1: rc-level.glb ---')
const rcGltf = parseGLB('public/assets/prebuilt/rc-original/rc-level.glb')
console.log('Mallas en rc-level:', rcGltf.meshes.length)
// Ver nodos principales
const gates = []
rcGltf.nodes.forEach((n, idx) => {
  if (n.name && (n.name.startsWith('gate') || n.name.startsWith('ramp') || n.name.startsWith('beam'))) {
    if (n.matrix) {
      gates.push({ name: n.name, x: n.matrix[12] * 3, y: n.matrix[13] * 3, z: n.matrix[14] * 3 })
    }
  }
})
console.log('Gates & Ramps en rc-level (escala 3x):', gates)

console.log('\n--- MAPA 2: Sketchbook world.glb ---')
const sbGltf = parseGLB('public/assets/prebuilt/sketchbook/world.glb')
const sbMeshes = []
sbGltf.nodes.forEach((n, idx) => {
  if (n.name && (n.name.toLowerCase().includes('track') || n.name.toLowerCase().includes('road') || n.name.toLowerCase().includes('race') || n.name.toLowerCase().includes('spawn'))) {
    sbMeshes.push({ name: n.name, t: n.translation })
  }
})
console.log('Nodos relevantes de Sketchbook:', sbMeshes)

console.log('\n--- MAPA 3: PMNDRS track-draco.glb ---')
const pmGltf = parseGLB('public/assets/prebuilt/pmndrs/track-draco.glb')
pmGltf.nodes.forEach((n, idx) => {
  if (n.name === 'strip' || n.name === 'track') {
    console.log(`Node #${idx} "${n.name}":`, n)
  }
})
