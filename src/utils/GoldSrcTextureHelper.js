import * as THREE from 'three'

/**
 * GoldSrcTextureHelper.js - Reemplazo de materiales retro estilo GoldSrc (Half-Life 1998 / Re-Volt 1999)
 * Aplica texturas fotográficas con World UVs continuos (sin estiramiento) a los mapas .GLB.
 */

const textureLoader = new THREE.TextureLoader()
const textureCache = new Map()

function getTexture(path, repeatS = 1, repeatT = 1) {
  const key = `${path}_${repeatS}_${repeatT}`
  if (textureCache.has(key)) return textureCache.get(key)

  const tex = textureLoader.load(path)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeatS, repeatT)
  tex.colorSpace = THREE.SRGBColorSpace
  textureCache.set(key, tex)
  return tex
}

/**
 * Aplica proyección UV planar / triplanar basada en coordenadas locales o de mundo
 * para garantizar escala uniforme fija (estilo cepillos Hammer / Worldcraft de Half-Life 1).
 * @param {THREE.BufferGeometry} geometry
 * @param {number} texScale - Escala de textura (ej. 0.25 = 1 repetición cada 4 metros)
 */
export function applyGoldSrcWorldUVs(geometry, texScale = 0.25) {
  if (!geometry || !geometry.attributes.position) return

  const pos = geometry.attributes.position
  const count = pos.count
  const uvs = new Float32Array(count * 2)

  // Asegurar normales para triplanar
  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals()
  }
  const norm = geometry.attributes.normal

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)

    let nx = 0, ny = 1, nz = 0
    if (norm) {
      nx = Math.abs(norm.getX(i))
      ny = Math.abs(norm.getY(i))
      nz = Math.abs(norm.getZ(i))
    }

    // Proyección triplanar según la normal dominante
    if (ny >= nx && ny >= nz) {
      // Superficie horizontal (suelos, techos, carreteras)
      uvs[i * 2] = x * texScale
      uvs[i * 2 + 1] = z * texScale
    } else if (nx >= nz) {
      // Muro perpendicular al eje X
      uvs[i * 2] = z * texScale
      uvs[i * 2 + 1] = y * texScale
    } else {
      // Muro perpendicular al eje Z
      uvs[i * 2] = x * texScale
      uvs[i * 2 + 1] = y * texScale
    }
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.attributes.uv.needsUpdate = true
}

/**
 * Reemplaza materiales planos de prototipo en los 3 mapas .GLB por texturas fotográficas de alta calidad.
 * @param {string} mapId - 'rc-stunt', 'sketchbook-oval', o 'desert-gp'
 * @param {THREE.Object3D} root - Nodo raíz del circuito GLB
 */
export function enhanceMapMaterials(mapId, root) {
  if (!root) return

  // Texturas base cargadas
  const asphaltTex = getTexture('/assets/textures/asphalt_diff_1k.jpg', 6, 6)
  const brickTex = getTexture('/assets/textures/brick_diff_1k.jpg', 4, 4)
  const concreteTex = getTexture('/assets/packs/retro-urban-kit/Models/GLB format/Textures/concrete.png', 4, 4)
  const retroWallTex = getTexture('/assets/packs/retro-urban-kit/Models/GLB format/Textures/wall.png', 3, 3)
  const retroWallLinesTex = getTexture('/assets/packs/retro-urban-kit/Models/GLB format/Textures/wall_lines.png', 3, 3)
  const rockTex = getTexture('/assets/packs/retro-urban-kit/Models/GLB format/Textures/rock.png', 6, 6)
  const dirtTex = getTexture('/assets/packs/retro-urban-kit/Models/GLB format/Textures/dirt.png', 4, 4)
  const metalTex = getTexture('/assets/packs/retro-urban-kit/Models/GLB format/Textures/metal.png', 2, 2)

  // Materiales GoldSrc listos
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.85,
    metalness: 0.1,
  })

  const brickMat = new THREE.MeshStandardMaterial({
    map: brickTex,
    roughness: 0.9,
    metalness: 0.05,
  })

  const concreteMat = new THREE.MeshStandardMaterial({
    map: concreteTex,
    roughness: 0.8,
    metalness: 0.1,
  })

  const wallMat = new THREE.MeshStandardMaterial({
    map: retroWallTex,
    roughness: 0.85,
    metalness: 0.1,
  })

  const wallLinesMat = new THREE.MeshStandardMaterial({
    map: retroWallLinesTex,
    roughness: 0.85,
    metalness: 0.1,
  })

  const rockMat = new THREE.MeshStandardMaterial({
    map: rockTex,
    roughness: 0.95,
    metalness: 0.05,
  })

  const dirtMat = new THREE.MeshStandardMaterial({
    map: dirtTex,
    roughness: 0.95,
    metalness: 0.02,
  })

  const metalMat = new THREE.MeshStandardMaterial({
    map: metalTex,
    roughness: 0.4,
    metalness: 0.7,
  })

  if (mapId === 'rc-stunt') {
    // MAPA 1: rc-level.glb
    root.traverse((child) => {
      if (!child.isMesh) return

      const meshName = (child.name || '').toLowerCase()
      const matName = child.material ? (child.material.name || '').toLowerCase() : ''

      applyGoldSrcWorldUVs(child.geometry, 0.2)

      if (meshName.includes('ground') || matName.includes('ground')) {
        child.material = asphaltMat
      } else if (meshName.includes('wall') || matName.includes('8a8f98') || matName.includes('e0524d')) {
        child.material = brickMat
      } else if (matName.includes('e87d1e') || matName.includes('3d8bfd') || matName.includes('f2c144')) {
        // Rampas y estructuras de acrobacia
        child.material = concreteMat
      } else {
        child.material = asphaltMat
      }
    })
  } else if (mapId === 'sketchbook-oval') {
    // MAPA 2: world.glb
    root.traverse((child) => {
      if (!child.isMesh) return

      const meshName = (child.name || '').toLowerCase()
      const matName = child.material ? (child.material.name || '').toLowerCase() : ''

      applyGoldSrcWorldUVs(child.geometry, 0.15)

      if (meshName.includes('plane') || matName.includes('race_track') || matName.includes('runway')) {
        // Pista de carreras principal
        child.material = asphaltMat
      } else if (matName.includes('concrete') || meshName.includes('barrier') || matName.includes('barrier')) {
        child.material = concreteMat
      } else if (matName.includes('dirt')) {
        child.material = dirtMat
      } else if (matName.includes('wall') || matName.includes('plaster') || meshName.includes('cube')) {
        child.material = (meshName.charCodeAt(meshName.length - 1) % 2 === 0) ? wallMat : brickMat
      } else {
        child.material = concreteMat
      }
    })
  } else if (mapId === 'desert-gp') {
    // MAPA 3: track-draco.glb
    root.traverse((child) => {
      const name = (child.name || '').toLowerCase()

      // Ocultar nubes y pájaros planos estilo Roblox para despejar el cielo realista
      if (name.includes('cloud') || name.includes('bird')) {
        child.visible = false
        return
      }

      if (!child.isMesh) return

      const matName = child.material ? (child.material.name || '').toLowerCase() : ''

      if (name.includes('terrain') || name.includes('mountain') || name.includes('rock')) {
        applyGoldSrcWorldUVs(child.geometry, 0.08)
        child.material = rockMat
      } else if (name.includes('track') || name.includes('strip')) {
        applyGoldSrcWorldUVs(child.geometry, 0.25)
        child.material = asphaltMat
      } else if (name.includes('water')) {
        // Dejar agua intacta
      } else if (name.includes('train') || name.includes('blade')) {
        child.material = metalMat
      }
    })
  }
}
