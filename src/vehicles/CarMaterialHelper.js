import * as THREE from 'three'
import { createRacingDecalTexture } from '../utils/ProceduralTextures.js'

/**
 * CarMaterialHelper.js
 * Sistema de materiales retro estilo 1999 (Half-Life 1 / Re-Volt).
 * - Carrocería unificada con proyección UV Box, textura metal.png y sombreado de vértices precalculado.
 * - Ventanas polarizadas en cabina superior.
 * - Faros delimitados a los extremos del chasis.
 * - Neumáticos con textura asphalt.png y rines con metal.png.
 */

let colormapData = null
let colormapPromise = null

const textureLoader = new THREE.TextureLoader()
const textureCache = new Map()

function getCachedTexture(url) {
  if (textureCache.has(url)) return textureCache.get(url)
  const tex = textureLoader.load(url)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  textureCache.set(url, tex)
  return tex
}

export function ensureColormapLoaded() {
  if (colormapData) return Promise.resolve(colormapData)
  if (colormapPromise) return colormapPromise

  colormapPromise = new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null)
      return
    }
    const img = new Image()
    const base = import.meta.env.BASE_URL || './'
    const basePath = base.endsWith('/') ? base : base + '/'
    img.src = `${basePath}assets/packs/car-kit/Models/GLB format/Textures/colormap.png`
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const imgData = ctx.getImageData(0, 0, img.width, img.height)
      colormapData = {
        width: img.width,
        height: img.height,
        data: imgData.data,
      }
      resolve(colormapData)
    }
    img.onerror = () => {
      console.warn('No se pudo cargar colormap.png para análisis de píxeles')
      resolve(null)
    }
  })
  return colormapPromise
}

function getPixelAtUV(u, v) {
  if (!colormapData) return [200, 200, 200]
  const x = Math.min(colormapData.width - 1, Math.max(0, Math.floor(u * colormapData.width)))
  const y = Math.min(colormapData.height - 1, Math.max(0, Math.floor((1 - v) * colormapData.height)))
  const idx = (y * colormapData.width + x) * 4
  return [colormapData.data[idx], colormapData.data[idx + 1], colormapData.data[idx + 2]]
}

/**
 * Clasificación precisa según reglas de CORRECCIÓN 1:
 * 1. 'window': solo si color oscuro (r < 80, g < 80, b < 90) Y avgY > 0.22 (cabina superior).
 * 2. 'headlight' / 'taillight': solo si avgY < 0.35 y en los extremos (Math.abs(avgZ) > 0.75).
 * 3. TODO EL RESTO va a 'paint' (carrocería limpia).
 */
function classifyBodyTriangle(u, v, avgY, avgZ) {
  const [r, g, b] = getPixelAtUV(u, v)

  // 1. Vidrio polarizado solo en la cabina superior
  if (r < 80 && g < 80 && b < 90 && avgY > 0.22) {
    return 'window'
  }

  // 2. Faros y luces traseras solo en los extremos delantero/trasero y a baja altura
  if (avgY < 0.35 && Math.abs(avgZ) > 0.75) {
    // Si r es predominante rojo/naranja -> taillight; si es claro/amarillo o frontal -> headlight
    if (r > 180 && g < 130 && b < 130) {
      return 'taillight'
    }
    if (avgZ > 0.75) {
      return 'headlight'
    } else {
      return 'taillight'
    }
  }

  // 3. Todo el resto del chasis es pintura continua
  return 'paint'
}

/**
 * Reconstruye el chasis dividiendo su geometría en sub-mallas limpias
 */
export async function enhanceCarBodyMaterials(bodyMesh, carColor) {
  await ensureColormapLoaded()

  const geo = bodyMesh.geometry
  const index = geo.index
  const posAttr = geo.attributes.position
  const normAttr = geo.attributes.normal
  const uvAttr = geo.attributes.uv
  const triCount = index ? index.count / 3 : posAttr.count / 3

  const buckets = {
    paint: [],
    window: [],
    headlight: [],
    taillight: [],
  }

  for (let t = 0; t < triCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2

    let u = 0.5
    let v = 0.5
    if (uvAttr) {
      u = (uvAttr.getX(i0) + uvAttr.getX(i1) + uvAttr.getX(i2)) / 3
      v = (uvAttr.getY(i0) + uvAttr.getY(i1) + uvAttr.getY(i2)) / 3
    }

    const avgY = (posAttr.getY(i0) + posAttr.getY(i1) + posAttr.getY(i2)) / 3
    const avgZ = (posAttr.getZ(i0) + posAttr.getZ(i1) + posAttr.getZ(i2)) / 3

    const cat = classifyBodyTriangle(u, v, avgY, avgZ)
    buckets[cat].push(i0, i1, i2)
  }

  // Textura real de metal de retro-urban-kit
  const metalTexture = getCachedTexture('/assets/packs/retro-urban-kit/Models/GLB format/Textures/metal.png')

  // Materiales dedicados
  const materials = {
    // Pintura retro con textura de metal y vertex colors
    paint: new THREE.MeshStandardMaterial({
      map: metalTexture,
      color: carColor,
      roughness: 0.35,
      metalness: 0.25,
      vertexColors: true,
    }),
    // Vidrio polarizado negro reflectante
    window: new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.1,
      metalness: 0.8,
    }),
    // Faros delanteros
    headlight: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffacd,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.1,
    }),
    // Luces traseras
    taillight: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
    }),
  }

  const subMeshes = []

  for (const [cat, indices] of Object.entries(buckets)) {
    if (indices.length === 0) continue

    const subGeo = new THREE.BufferGeometry()
    subGeo.setAttribute('position', posAttr)
    if (normAttr) subGeo.setAttribute('normal', normAttr)
    subGeo.setIndex(indices)

    if (cat === 'paint') {
      // 1. Box UV Projection sobre los vértices de paint
      const count = posAttr.count
      const newUvs = new Float32Array(count * 2)
      const colors = new Float32Array(count * 3)

      for (let i = 0; i < count; i++) {
        const x = posAttr.getX(i)
        const y = posAttr.getY(i)
        const z = posAttr.getZ(i)

        let nx = 0, ny = 1, nz = 0
        if (normAttr) {
          nx = normAttr.getX(i)
          ny = normAttr.getY(i)
          nz = normAttr.getZ(i)
        }

        const absX = Math.abs(nx)
        const absY = Math.abs(ny)
        const absZ = Math.abs(nz)

        // Escala de proyección UV
        const uvScale = 3.0
        if (absY >= absX && absY >= absZ) {
          newUvs[i * 2] = x * uvScale
          newUvs[i * 2 + 1] = z * uvScale
        } else if (absX >= absY && absX >= absZ) {
          newUvs[i * 2] = z * uvScale
          newUvs[i * 2 + 1] = y * uvScale
        } else {
          newUvs[i * 2] = x * uvScale
          newUvs[i * 2 + 1] = y * uvScale
        }

        // Sombreado precalculado estilo 1999: oscurecer vértices inferiores (y < 0.18 al 55% y superiores al 100%)
        const brightness = y < 0.18 ? 0.55 : 1.0
        colors[i * 3] = brightness
        colors[i * 3 + 1] = brightness
        colors[i * 3 + 2] = brightness
      }

      subGeo.setAttribute('uv', new THREE.BufferAttribute(newUvs, 2))
      subGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    } else {
      if (uvAttr) subGeo.setAttribute('uv', uvAttr)
    }

    const mesh = new THREE.Mesh(subGeo, materials[cat])
    mesh.name = `chassis_${cat}`
    mesh.castShadow = true
    mesh.receiveShadow = true
    subMeshes.push(mesh)
  }

  const holder = new THREE.Group()
  holder.name = 'enhanced_body_holder'
  subMeshes.forEach((m) => holder.add(m))

  return { holder, materials, subMeshes }
}

/**
 * Reconstruye las ruedas separando caucho (asphalt.png) y rin (metal.png)
 */
export function enhanceWheelMaterials(wheelMesh) {
  const geo = wheelMesh.geometry
  const index = geo.index
  const posAttr = geo.attributes.position
  const normAttr = geo.attributes.normal
  const uvAttr = geo.attributes.uv
  const triCount = index ? index.count / 3 : posAttr.count / 3

  const tireIndices = []
  const rimIndices = []

  const RIM_RADIUS_THRESHOLD = 0.21

  for (let t = 0; t < triCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2

    const y = (posAttr.getY(i0) + posAttr.getY(i1) + posAttr.getY(i2)) / 3
    const z = (posAttr.getZ(i0) + posAttr.getZ(i1) + posAttr.getZ(i2)) / 3
    const r = Math.hypot(y, z)

    if (r >= RIM_RADIUS_THRESHOLD) {
      tireIndices.push(i0, i1, i2)
    } else {
      rimIndices.push(i0, i1, i2)
    }
  }

  const holder = new THREE.Group()
  holder.name = 'enhanced_wheel_holder'

  const asphaltTex = getCachedTexture('/assets/packs/retro-urban-kit/Models/GLB format/Textures/asphalt.png')
  const metalTex = getCachedTexture('/assets/packs/retro-urban-kit/Models/GLB format/Textures/metal.png')

  // Neumático: textura asphalt.png teñida de gris caucho oscuro (0x262626)
  if (tireIndices.length > 0) {
    const tireGeo = new THREE.BufferGeometry()
    tireGeo.setAttribute('position', posAttr)
    if (normAttr) tireGeo.setAttribute('normal', normAttr)
    if (uvAttr) tireGeo.setAttribute('uv', uvAttr)
    tireGeo.setIndex(tireIndices)

    const tireMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      color: 0x262626,
      roughness: 0.88,
      metalness: 0.08,
    })
    const tireMesh = new THREE.Mesh(tireGeo, tireMat)
    tireMesh.castShadow = true
    tireMesh.receiveShadow = true
    holder.add(tireMesh)
  }

  // Rin: metal.png en gris claro (0xd4d4d8)
  if (rimIndices.length > 0) {
    const rimGeo = new THREE.BufferGeometry()
    rimGeo.setAttribute('position', posAttr)
    if (normAttr) rimGeo.setAttribute('normal', normAttr)
    if (uvAttr) rimGeo.setAttribute('uv', uvAttr)
    rimGeo.setIndex(rimIndices)

    const rimMat = new THREE.MeshStandardMaterial({
      map: metalTex,
      color: 0xd4d4d8,
      metalness: 0.75,
      roughness: 0.28,
    })
    const rimMesh = new THREE.Mesh(rimGeo, rimMat)
    rimMesh.castShadow = true
    rimMesh.receiveShadow = true
    holder.add(rimMesh)
  }

  return holder
}

/**
 * Calcomanías deportivas de competición
 */
export function createRacingDecalsGroup(racerNumber = '42') {
  const decalGroup = new THREE.Group()
  decalGroup.name = 'racing_decals'

  const decalTexture = createRacingDecalTexture({ number: racerNumber, accentColor: '#ffffff' })
  const decalMaterial = new THREE.MeshBasicMaterial({
    map: decalTexture,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })

  // 1. Calcomanía en el capó
  const hoodMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), decalMaterial)
  hoodMesh.rotation.x = -Math.PI / 2
  hoodMesh.position.set(0, 0.44, 0.28)
  decalGroup.add(hoodMesh)

  // 2. Puerta izquierda
  const leftDoor = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), decalMaterial)
  leftDoor.rotation.y = -Math.PI / 2
  leftDoor.position.set(-0.54, 0.32, -0.05)
  decalGroup.add(leftDoor)

  // 3. Puerta derecha
  const rightDoor = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), decalMaterial)
  rightDoor.rotation.y = Math.PI / 2
  rightDoor.position.set(0.54, 0.32, -0.05)
  decalGroup.add(rightDoor)

  return decalGroup
}
