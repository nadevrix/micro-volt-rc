import * as THREE from 'three'

/**
 * GoldSrcBrush.js
 * Geometría arquitectónica estilo Half-Life 1 / GoldSrc con texturizado métrico real
 * (UVs proyectadas según el tamaño en metros de cada cara para evitar distorsiones o estiramientos)
 * y sombreado estático tipo Lightmap en los vértices inferiores.
 */

const textureLoader = new THREE.TextureLoader()
const brushTextureCache = new Map()

export function getBrushTexture(url) {
  if (brushTextureCache.has(url)) {
    return brushTextureCache.get(url)
  }
  const tex = textureLoader.load(url)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  brushTextureCache.set(url, tex)
  return tex
}

/**
 * Crea un brush arquitectónico estilo Half-Life 1.
 * @param {Object} options
 * @param {Array<number>} options.size - [w, h, d] en metros
 * @param {Array<number>} [options.position] - [x, y, z]
 * @param {Array<number>} [options.rotation] - [rx, ry, rz]
 * @param {string} options.textureUrl - Ruta a la textura en disco
 * @param {number} [options.texScale=4] - Escala en metros por repetición de textura
 * @param {number|string} [options.color=0xffffff] - Tinte del material
 * @param {number} [options.roughness=0.85]
 * @param {number} [options.metalness=0.1]
 * @param {boolean} [options.darkenBottom=true] - Sombra de lightmap en la base
 * @param {boolean} [options.transparent=false]
 * @param {number} [options.opacity=1.0]
 * @returns {THREE.Mesh}
 */
export function createBrush({
  size = [1, 1, 1],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  textureUrl,
  texScale = 4,
  color = 0xffffff,
  roughness = 0.85,
  metalness = 0.1,
  darkenBottom = true,
  transparent = false,
  opacity = 1.0,
}) {
  const [w, h, d] = size
  const geo = new THREE.BoxGeometry(w, h, d)

  const posAttr = geo.attributes.position
  const normAttr = geo.attributes.normal
  const uvAttr = geo.attributes.uv
  const vertexCount = posAttr.count

  // 1. Recalcular UVs métricas cara por cara según la normal
  const newUvs = new Float32Array(vertexCount * 2)
  for (let i = 0; i < vertexCount; i++) {
    const u = uvAttr.getX(i)
    const v = uvAttr.getY(i)
    const nx = normAttr.getX(i)
    const ny = normAttr.getY(i)
    const nz = normAttr.getZ(i)

    if (Math.abs(nx) > 0.5) {
      // Caras +X y -X (laterales)
      newUvs[i * 2] = u * (d / texScale)
      newUvs[i * 2 + 1] = v * (h / texScale)
    } else if (Math.abs(ny) > 0.5) {
      // Caras +Y y -Y (suelo y techo)
      newUvs[i * 2] = u * (w / texScale)
      newUvs[i * 2 + 1] = v * (d / texScale)
    } else {
      // Caras +Z y -Z (frontales)
      newUvs[i * 2] = u * (w / texScale)
      newUvs[i * 2 + 1] = v * (h / texScale)
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(newUvs, 2))

  // 2. Lightmap / Ambient Occlusion en vértices (Half-Life 1)
  let matOptions = {
    color,
    roughness,
    metalness,
    transparent,
    opacity,
  }

  if (textureUrl) {
    matOptions.map = getBrushTexture(textureUrl)
  }

  if (darkenBottom) {
    const colors = new Float32Array(vertexCount * 3)
    for (let i = 0; i < vertexCount; i++) {
      const y = posAttr.getY(i)
      // Vértices inferiores oscurecidos al 55% para simular contacto con el suelo y oclusión
      const brightness = y < 0 ? 0.55 : 1.0
      colors[i * 3] = brightness
      colors[i * 3 + 1] = brightness
      colors[i * 3 + 2] = brightness
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    matOptions.vertexColors = true
  }

  const mat = new THREE.MeshStandardMaterial(matOptions)
  const mesh = new THREE.Mesh(geo, mat)

  mesh.position.set(position[0], position[1], position[2])
  mesh.rotation.set(rotation[0], rotation[1], rotation[2])
  mesh.castShadow = true
  mesh.receiveShadow = true

  return mesh
}
