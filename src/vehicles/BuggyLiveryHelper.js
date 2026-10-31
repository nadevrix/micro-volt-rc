import * as THREE from 'three'

/**
 * BuggyLiveryHelper.js - Generador de Liveries estilo Re-Volt 1999 para el Buggy RC (base.glb)
 * Aplica filtros de color CSS y sobreimprime dorsales nítidos (#18, #01, #54, #42, #07, #99)
 * sobre el material car_phong y spoiler_c_phong, preservando intactos resortes (metal) y chasis (plastic_black_phong).
 */

const textureCache = new Map()
let baseBodyImage = null
let baseSpoilerImage = null

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function ensureBaseImages() {
  if (!baseBodyImage) {
    baseBodyImage = await loadImage('/assets/prebuilt/rc-original/body_color_rd_extracted.jpg')
  }
  if (!baseSpoilerImage) {
    baseSpoilerImage = await loadImage('/assets/prebuilt/rc-original/spoiler_color_extracted.jpg')
  }
}

/**
 * Genera texturas únicas para la carrocería y el alerón según el preset del auto.
 * @param {Object} preset - Configuración del auto desde carPresets.js
 * @returns {Promise<{ bodyTexture: THREE.CanvasTexture, spoilerTexture: THREE.CanvasTexture }>}
 */
export async function getBuggyLiveryTextures(preset) {
  const cacheKey = preset.id || preset.dorsal || 'default'
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)
  }

  await ensureBaseImages()

  // 1. Carrocería (1024 x 1024)
  const bodyCanvas = document.createElement('canvas')
  bodyCanvas.width = 1024
  bodyCanvas.height = 1024
  const bCtx = bodyCanvas.getContext('2d')

  if (preset.filter && preset.filter !== 'none') {
    bCtx.filter = preset.filter
  }
  bCtx.drawImage(baseBodyImage, 0, 0, 1024, 1024)
  bCtx.filter = 'none'

  // Sobreimprimir círculo y dorsal en el capó/techo (centro: x=485, y=480, radio: 45)
  const dorsalStr = preset.dorsal ? `#${preset.dorsal}` : '#18'
  const cx = 485
  const cy = 480
  const r = 44

  // Fondo circular blanco con bisel
  bCtx.beginPath()
  bCtx.arc(cx, cy, r, 0, Math.PI * 2)
  bCtx.fillStyle = '#ffffff'
  bCtx.fill()
  bCtx.lineWidth = 4
  bCtx.strokeStyle = '#18181b'
  bCtx.stroke()

  // Número dorsal con tipografía gruesa de carreras
  bCtx.textAlign = 'center'
  bCtx.textBaseline = 'middle'
  bCtx.font = '900 40px "Arial Black", "Impact", "Orbitron", sans-serif'
  bCtx.lineWidth = 6
  bCtx.strokeStyle = '#000000'
  bCtx.strokeText(dorsalStr, cx, cy + 2)
  bCtx.fillStyle = '#18181b'
  bCtx.fillText(dorsalStr, cx, cy + 2)

  const bodyTex = new THREE.CanvasTexture(bodyCanvas)
  bodyTex.colorSpace = THREE.SRGBColorSpace
  bodyTex.needsUpdate = true

  // 2. Alerón (1024 x 1024)
  const spoilerCanvas = document.createElement('canvas')
  spoilerCanvas.width = 1024
  spoilerCanvas.height = 1024
  const sCtx = spoilerCanvas.getContext('2d')

  if (preset.filter && preset.filter !== 'none') {
    sCtx.filter = preset.filter
  }
  sCtx.drawImage(baseSpoilerImage, 0, 0, 1024, 1024)
  sCtx.filter = 'none'

  const spoilerTex = new THREE.CanvasTexture(spoilerCanvas)
  spoilerTex.colorSpace = THREE.SRGBColorSpace
  spoilerTex.needsUpdate = true

  const result = { bodyTexture: bodyTex, spoilerTexture: spoilerTex }
  textureCache.set(cacheKey, result)
  return result
}

/**
 * Aplica los materiales de livery al modelo base.glb
 * @param {THREE.Object3D} scene - Escena de base.glb
 * @param {Object} preset - Preset del auto
 */
export async function applyBuggyLivery(scene, preset) {
  const { bodyTexture, spoilerTexture } = await getBuggyLiveryTextures(preset)

  scene.traverse((child) => {
    if (!child.isMesh || !child.material) return

    // Ocultar mallas de ruedas estáticas internas en base.glb para que no colisionen con las ruedas animadas
    const name = (child.name || '').toLowerCase()
    if (name.includes('wheel') || name.includes('tread') || name.includes('tire')) {
      child.visible = false
      return
    }

    const mat = child.material
    const matName = (mat.name || '').toLowerCase()

    // Mantener intactos metal (resortes) y plastic_black_phong
    if (matName.includes('metal') || matName.includes('plastic_black')) {
      return
    }

    if (matName.includes('car_phong') || matName.includes('body')) {
      child.material = new THREE.MeshStandardMaterial({
        map: bodyTexture,
        roughness: 0.35,
        metalness: 0.25,
      })
    } else if (matName.includes('spoiler')) {
      child.material = new THREE.MeshStandardMaterial({
        map: spoilerTexture,
        roughness: 0.4,
        metalness: 0.2,
      })
    }
  })
}
