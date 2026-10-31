import * as THREE from 'three'

/**
 * ProceduralTextures.js
 * Generador de texturas procedurales HD (1024x1024) con ruido, grano, vetas y mortero.
 * Prohibido el uso de colores planos. Sirve como textura directa o fallback de alta fidelidad.
 */

function pseudoNoise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return n - Math.floor(n)
}

function smoothNoise(x, y) {
  const i = Math.floor(x)
  const j = Math.floor(y)
  const fx = x - i
  const fy = y - j
  const s = fx * fx * (3 - 2 * fx)
  const t = fy * fy * (3 - 2 * fy)

  const n00 = pseudoNoise(i, j)
  const n10 = pseudoNoise(i + 1, j)
  const n01 = pseudoNoise(i, j + 1)
  const n11 = pseudoNoise(i + 1, j + 1)

  const nx0 = n00 * (1 - s) + n10 * s
  const nx1 = n01 * (1 - s) + n11 * s
  return nx0 * (1 - t) + nx1 * t
}

function fbm(x, y, octaves = 4) {
  let val = 0
  let amp = 0.5
  let freq = 1
  for (let o = 0; o < octaves; o++) {
    val += amp * smoothNoise(x * freq, y * freq)
    freq *= 2.05
    amp *= 0.5
  }
  return val
}

/**
 * Textura procedural de Asfalto con grava fina, grano y manchas de alquitrán.
 */
export function createProceduralAsphalt(size = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const imgData = ctx.createImageData(size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const n = fbm(x * 0.05, y * 0.05, 5)
      const speck = pseudoNoise(x * 3.7, y * 3.7)
      const base = 50 + Math.floor(n * 45) + Math.floor(speck * 35)

      // Variación sutil de tono gris cálido / asfalto
      data[idx] = Math.min(255, base + 4)     // R
      data[idx + 1] = Math.min(255, base + 2) // G
      data[idx + 2] = Math.min(255, base)     // B
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/**
 * Textura procedural de Ladrillos con juntas de mortero rugoso y desgaste.
 */
export function createProceduralBrick(size = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // Fondo de mortero de cemento rugoso
  ctx.fillStyle = '#9ca3af'
  ctx.fillRect(0, 0, size, size)

  const rows = 16
  const cols = 8
  const brickH = size / rows
  const brickW = size / cols
  const mortar = 6

  for (let r = 0; r < rows; r++) {
    const isOffset = r % 2 === 1
    const xShift = isOffset ? -brickW / 2 : 0

    for (let c = -1; c <= cols + 1; c++) {
      const bx = c * brickW + xShift + mortar / 2
      const by = r * brickH + mortar / 2
      const bw = brickW - mortar
      const bh = brickH - mortar

      // Tonalidad de ladrillo con variación orgánica
      const variation = pseudoNoise(r * 13, c * 17)
      const red = Math.floor(150 + variation * 50)
      const green = Math.floor(45 + variation * 30)
      const blue = Math.floor(35 + variation * 20)

      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`
      ctx.fillRect(bx, by, bw, bh)

      // Bisel de sombra y luz en bordes del ladrillo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.fillRect(bx, by, bw, 3)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(bx, by + bh - 3, bw, 3)
    }
  }

  // Capa de grano de polvo y mortero superpuesto
  const grainImg = ctx.getImageData(0, 0, size, size)
  const d = grainImg.data
  for (let i = 0; i < d.length; i += 4) {
    const grain = (pseudoNoise(i, i * 0.5) - 0.5) * 30
    d[i] = Math.min(255, Math.max(0, d[i] + grain))
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain))
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain))
  }
  ctx.putImageData(grainImg, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/**
 * Textura procedural de Parquet Barnizado con tablones y vetas de madera.
 */
export function createProceduralWood(size = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const planks = 12
  const plankH = size / planks

  for (let p = 0; p < planks; p++) {
    const py = p * plankH
    const plankTone = pseudoNoise(p * 7.1, 4.3)
    const baseR = Math.floor(165 + plankTone * 40)
    const baseG = Math.floor(100 + plankTone * 30)
    const baseB = Math.floor(55 + plankTone * 25)

    ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`
    ctx.fillRect(0, py, size, plankH)

    // Vetas longitudinales de madera
    for (let y = py; y < py + plankH - 2; y += 2) {
      const grain = fbm(y * 0.1, p * 10, 3)
      const alpha = 0.08 + grain * 0.12
      ctx.strokeStyle = grain > 0.5 ? `rgba(255, 230, 180, ${alpha})` : `rgba(70, 35, 10, ${alpha})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y)
      ctx.stroke()
    }

    // Ranura oscura entre tablones
    ctx.fillStyle = 'rgba(30, 15, 5, 0.7)'
    ctx.fillRect(0, py + plankH - 2, size, 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/**
 * Textura procedural de Nubes suaves y cielo azul.
 */
export function createProceduralClouds(size = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 0, size)
  grad.addColorStop(0, '#1e3a8a')
  grad.addColorStop(0.6, '#38bdf8')
  grad.addColorStop(1, '#bae6fd')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const d = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const n = fbm(x * 0.004, y * 0.004, 5)
      if (n > 0.45) {
        const cloudFactor = THREE.MathUtils.clamp((n - 0.45) * 2.8, 0, 1)
        d[idx] = Math.min(255, d[idx] * (1 - cloudFactor) + 255 * cloudFactor)
        d[idx + 1] = Math.min(255, d[idx + 1] * (1 - cloudFactor) + 255 * cloudFactor)
        d[idx + 2] = Math.min(255, d[idx + 2] * (1 - cloudFactor) + 255 * cloudFactor)
      }
    }
  }
  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

/**
 * Textura de calcomanía deportiva de carreras (franjas deportivas + círculo con dorsal).
 */
export function createRacingDecalTexture({ number = '42', accentColor = '#ffffff' } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, 512, 512)

  // Doble franja deportiva blanca central
  ctx.fillStyle = accentColor
  ctx.fillRect(190, 0, 50, 512)
  ctx.fillRect(272, 0, 50, 512)

  // Círculo blanco para el dorsal
  ctx.beginPath()
  ctx.arc(256, 256, 120, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = 10
  ctx.strokeStyle = '#0f172a'
  ctx.stroke()

  // Número del corredor
  ctx.fillStyle = '#0f172a'
  ctx.font = '900 115px "Orbitron", monospace, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(number), 256, 260)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Cúpula de Cielo Estilo Re-Volt 1999 (2048x1024)
 * Degradado de azul cielo vibrante (#1d4ed8 a #60a5fa) lleno de nubes blancas esponjosas con alto contraste.
 */
export function createReVoltSkyTexture(width = 2048, height = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Degradado vertical de azul cielo vibrante
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height)
  skyGrad.addColorStop(0.0, '#1d4ed8')  // Azul cobalto intenso en cenit
  skyGrad.addColorStop(0.35, '#2563eb') // Azul clásico de arcade
  skyGrad.addColorStop(0.65, '#60a5fa') // Azul cielo brillante
  skyGrad.addColorStop(0.85, '#93c5fd') // Transición al horizonte
  skyGrad.addColorStop(1.0, '#dbeafe')  // Calina cálida baja
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, width, height)

  // Nubes blancas esponjosas con alto contraste estilo 1999
  const cloudCount = 42
  for (let c = 0; c < cloudCount; c++) {
    const cx = (c * 173) % width
    const cy = 120 + ((c * 97) % (height * 0.55))
    const scale = 50 + ((c * 43) % 90)

    // Base de sombra suave azulada en la parte inferior de la nube
    const puffCount = 7
    for (let p = 0; p < puffCount; p++) {
      const px = cx + (p - puffCount / 2) * (scale * 0.42)
      const py = cy + Math.sin(p * 1.3) * (scale * 0.22)
      const pr = scale * (0.45 + pseudoNoise(p, c) * 0.35)

      const grad = ctx.createRadialGradient(px, py - pr * 0.2, pr * 0.1, px, py, pr)
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)')
      grad.addColorStop(0.55, 'rgba(240, 246, 255, 0.92)')
      grad.addColorStop(0.85, 'rgba(186, 215, 250, 0.65)')
      grad.addColorStop(1.0, 'rgba(147, 197, 253, 0.0)')

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(px, py, pr, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

/**
 * Asfalto detallado estilo Re-Volt con grano gris-marrón, manchas de aceite y grietas sutiles.
 */
export function createReVoltAsphaltTexture(size = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const imgData = ctx.createImageData(size, size)
  const d = imgData.data

  // Capa base de grano de asfalto gris-marrón
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const n = fbm(x * 0.06, y * 0.06, 4)
      const speck = pseudoNoise(x * 5.1, y * 5.1)
      const base = 75 + Math.floor(n * 35) + Math.floor(speck * 25)

      // Matiz gris-marrón cálido de calle residencial
      d[idx] = Math.min(255, base + 8)     // R
      d[idx + 1] = Math.min(255, base + 4) // G
      d[idx + 2] = Math.min(255, base)     // B
      d[idx + 3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)

  // Manchas oscuras de aceite de autos reales en el centro del carril
  ctx.fillStyle = 'rgba(25, 20, 15, 0.45)'
  for (let i = 0; i < 18; i++) {
    const ox = 180 + ((i * 123) % 660)
    const oy = (i * 97) % size
    const rad = 25 + (i % 7) * 8
    ctx.beginPath()
    ctx.ellipse(ox, oy, rad * 1.5, rad, (i % 3) * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Grietas sutiles de asfalto viejo
  ctx.strokeStyle = 'rgba(20, 15, 10, 0.75)'
  ctx.lineWidth = 2
  for (let c = 0; c < 6; c++) {
    let gx = (c * 180) % size
    let gy = (c * 230) % size
    ctx.beginPath()
    ctx.moveTo(gx, gy)
    for (let step = 0; step < 7; step++) {
      gx += (pseudoNoise(step, c) - 0.45) * 40
      gy += (pseudoNoise(c, step) - 0.2) * 35
      ctx.lineTo(gx, gy)
    }
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/**
 * Textura de bordillo de concreto segmentado en bloques grises claros con bisel.
 */
export function createConcreteCurbTexture(width = 1024, height = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Fondo concreto gris claro
  ctx.fillStyle = '#cbd5e1'
  ctx.fillRect(0, 0, width, height)

  const blockW = 128
  const blockCount = width / blockW

  for (let i = 0; i < blockCount; i++) {
    const bx = i * blockW
    // Sombra en junta
    ctx.fillStyle = '#64748b'
    ctx.fillRect(bx, 0, 5, height)

    // Resalte superior en borde
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.fillRect(bx + 5, 0, blockW - 10, 12)

    // Sombra inferior
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.fillRect(bx + 5, height - 12, blockW - 10, 12)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/**
 * Textura de cerca blanca con tablones verticales de madera.
 */
export function createWhiteFenceTexture(size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, size, size)

  const slatW = 32
  const count = size / slatW

  for (let i = 0; i < count; i++) {
    const sx = i * slatW
    // Ranura entre tablones
    ctx.fillStyle = '#cbd5e1'
    ctx.fillRect(sx, 0, 3, size)

    // Bisel de luz
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(sx + 3, 0, 4, size)

    // Travesaño horizontal
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(0, 120, size, 24)
    ctx.fillRect(0, 380, size, 24)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/**
 * Textura de pasto verde vibrante estilo arcade.
 */
export function createGrassTexture(size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const imgData = ctx.createImageData(size, size)
  const d = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const n = fbm(x * 0.08, y * 0.08, 3)
      const green = 110 + Math.floor(n * 60)
      d[idx] = Math.floor(green * 0.35)
      d[idx + 1] = green
      d[idx + 2] = Math.floor(green * 0.25)
      d[idx + 3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/**
 * Vallas tricolor (Rojo, Blanco, Azul) con logo ovalado MICRO-VOLT.
 */
export function createTricolorBarrierTexture(width = 1024, height = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // 3 Franjas verticales amplias
  const stripeW = width / 3
  ctx.fillStyle = '#dc2626' // Rojo
  ctx.fillRect(0, 0, stripeW, height)
  ctx.fillStyle = '#f8fafc' // Blanco
  ctx.fillRect(stripeW, 0, stripeW, height)
  ctx.fillStyle = '#2563eb' // Azul
  ctx.fillRect(stripeW * 2, 0, stripeW, height)

  // Bordes biselados superior e inferior metálicos
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.fillRect(0, 0, width, 14)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.fillRect(0, height - 16, width, 16)

  // Emblema ovalado central MICRO-VOLT
  ctx.beginPath()
  ctx.ellipse(width / 2, height / 2, 130, 65, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#0f172a'
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = '#facc15'
  ctx.stroke()

  ctx.font = '900 italic 34px "Orbitron", sans-serif'
  ctx.fillStyle = '#fde047'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('⚡ MICRO-VOLT ⚡', width / 2, height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

/**
 * Flechas direccionales grandes rojas con borde blanco para curvas.
 */
export function createTurnChevronTexture(width = 512, height = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, width, height)

  // Dibujar 3 chevrons rojos apuntando a la derecha
  for (let c = 0; c < 3; c++) {
    const cx = 90 + c * 150
    ctx.beginPath()
    ctx.moveTo(cx, 30)
    ctx.lineTo(cx + 90, 128)
    ctx.lineTo(cx, 226)
    ctx.lineTo(cx + 45, 226)
    ctx.lineTo(cx + 135, 128)
    ctx.lineTo(cx + 45, 30)
    ctx.closePath()

    ctx.fillStyle = '#ef4444'
    ctx.fill()
    ctx.lineWidth = 8
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

/**
 * Textura de caja gigante de juguete comercial (packaging estilo 1999).
 */
export function createToyBoxTexture({ title = 'MEGA-BOT 51', subtitle = 'ELECTRONIC RC TITAN', color = '#dc2626' } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')

  // Fondo colorido vibrante de caja de juguete
  const grad = ctx.createLinearGradient(0, 0, 1024, 1024)
  grad.addColorStop(0, color)
  grad.addColorStop(1, '#090d16')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1024, 1024)

  // Borde amarillo brillante de blíster
  ctx.strokeStyle = '#facc15'
  ctx.lineWidth = 24
  ctx.strokeRect(20, 20, 984, 984)

  // Ventana de plástico transparente del juguete
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(100, 280, 824, 460)
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 8
  ctx.strokeRect(100, 280, 824, 460)

  // Destellos de reflejo plástico
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.moveTo(130, 310)
  ctx.lineTo(350, 310)
  ctx.stroke()

  // Título
  ctx.font = '900 italic 82px "Orbitron", sans-serif'
  ctx.fillStyle = '#fde047'
  ctx.textAlign = 'center'
  ctx.shadowColor = '#000000'
  ctx.shadowBlur = 15
  ctx.fillText(title, 512, 160)

  ctx.font = '800 36px monospace'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(subtitle, 512, 230)

  // Insignia "1:10 SCALE HIGH SPEED"
  ctx.fillStyle = '#22c55e'
  ctx.fillRect(100, 780, 420, 60)
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 30px sans-serif'
  ctx.fillText('★ HIGH SPEED SERIES ★', 310, 822)

  // Código de barras
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(660, 780, 260, 160)
  ctx.fillStyle = '#000000'
  for (let i = 0; i < 22; i++) {
    const x = 680 + i * 10
    ctx.fillRect(x, 790, (i % 3 === 0 ? 5 : 2), 120)
  }

  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

/**
 * Carga una textura fotográfica o usa el generador procedural en caso de fallo.
 */
export function loadTextureWithFallback(url, fallbackGenerator, repeatX = 1, repeatY = 1) {
  const loader = new THREE.TextureLoader()
  let tex = null

  try {
    tex = loader.load(
      url,
      (loaded) => {
        loaded.wrapS = THREE.RepeatWrapping
        loaded.wrapT = THREE.RepeatWrapping
        loaded.repeat.set(repeatX, repeatY)
        loaded.colorSpace = THREE.SRGBColorSpace
      },
      undefined,
      (err) => {
        console.warn(`No se pudo cargar textura en ${url}, aplicando generador procedural:`, err)
        const fallback = fallbackGenerator()
        fallback.repeat.set(repeatX, repeatY)
        tex.image = fallback.image
        tex.needsUpdate = true
      }
    )
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeatX, repeatY)
    tex.colorSpace = THREE.SRGBColorSpace
  } catch (e) {
    tex = fallbackGenerator()
    tex.repeat.set(repeatX, repeatY)
  }

  return tex
}

