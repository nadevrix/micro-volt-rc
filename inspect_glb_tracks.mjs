import fs from 'node:fs'
import path from 'node:path'

function inspectGLB(filePath) {
  console.log(`\n======================================================`)
  console.log(`INSPECCIONANDO GLB: ${filePath}`)
  console.log(`======================================================`)
  const buf = fs.readFileSync(filePath)
  const magic = buf.readUInt32LE(0)
  if (magic !== 0x46546c67) {
    console.error('No es un archivo GLB válido')
    return
  }
  const version = buf.readUInt32LE(4)
  const length = buf.readUInt32LE(8)
  const jsonChunkLen = buf.readUInt32LE(12)
  const jsonChunkType = buf.readUInt32LE(16)

  const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen)
  const gltf = JSON.parse(jsonStr)

  console.log(`Versión: ${version}, Tamaño total: ${(length / (1024 * 1024)).toFixed(2)} MB`)
  console.log(`Nodos: ${gltf.nodes?.length || 0}, Mallas: ${gltf.meshes?.length || 0}, Materiales: ${gltf.materials?.length || 0}`)

  // Mapear accessors con min/max
  const accessors = gltf.accessors || []

  if (gltf.meshes) {
    console.log(`\n--- LISTA DE MALLAS Y BOUNDING BOXES ---`)
    gltf.meshes.forEach((m, idx) => {
      let bounds = null
      if (m.primitives && m.primitives[0] && m.primitives[0].attributes) {
        const posAccIdx = m.primitives[0].attributes.POSITION
        if (posAccIdx !== undefined && accessors[posAccIdx]) {
          const acc = accessors[posAccIdx]
          bounds = { min: acc.min, max: acc.max }
        }
      }
      console.log(`[Mesh #${idx}] "${m.name || 'sin_nombre'}" - Bounds: ${bounds ? `X:[${bounds.min[0].toFixed(2)}, ${bounds.max[0].toFixed(2)}] Y:[${bounds.min[1].toFixed(2)}, ${bounds.max[1].toFixed(2)}] Z:[${bounds.min[2].toFixed(2)}, ${bounds.max[2].toFixed(2)}]` : 'N/A'}`)
    })
  }

  if (gltf.nodes) {
    console.log(`\n--- NODOS RELEVANTES (Pistas, carreteras, vehículos, puntos de interés) ---`)
    gltf.nodes.forEach((n, idx) => {
      const name = n.name || ''
      const lower = name.toLowerCase()
      if (
        lower.includes('track') ||
        lower.includes('road') ||
        lower.includes('pista') ||
        lower.includes('street') ||
        lower.includes('ground') ||
        lower.includes('suelo') ||
        lower.includes('start') ||
        lower.includes('finish') ||
        lower.includes('asphalt') ||
        lower.includes('circuit') ||
        lower.includes('spawn') ||
        lower.includes('waypoint') ||
        lower.includes('car') ||
        lower.includes('chassis') ||
        lower.includes('wheel') ||
        idx < 15
      ) {
        console.log(`[Node #${idx}] "${name}" translation: ${JSON.stringify(n.translation || [0,0,0])} scale: ${JSON.stringify(n.scale || [1,1,1])} meshIdx: ${n.mesh}`)
      }
    })
  }
}

inspectGLB('public/assets/prebuilt/rc-original/rc-level.glb')
inspectGLB('public/assets/prebuilt/sketchbook/world.glb')
inspectGLB('public/assets/prebuilt/pmndrs/track-draco.glb')
inspectGLB('public/assets/prebuilt/sketchbook/car.glb')
inspectGLB('public/assets/prebuilt/pmndrs/chassis-draco.glb')
