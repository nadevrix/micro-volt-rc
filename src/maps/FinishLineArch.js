import * as THREE from 'three'

/**
 * FinishLineArch - Arco de Meta Oficial 3D para Micro-Volt RC.
 * Proporciona una estructura física imponente de pórtico metálico (truss) sobre la pista:
 * - Cartel luminoso de meta ("★ START / FINISH ★") con banderas a cuadros.
 * - Semáforo de salida interactivo con 4 luces (3 Rojas + 1 Verde de salida) sincronizadas con el countdown.
 * - Textura de meta ajedrezada (blanco y negro) proyectada sobre el asfalto.
 * - Señalización de cajones de parrilla de salida numerados (#1 a #6).
 * - Efecto de fuegos artificiales y confeti al cruzar la meta al ganar la carrera.
 */
export class FinishLineArch {
  constructor({ scene, position = [0, 0, 0], rotationY = 0, trackWidth = 22 }) {
    this.scene = scene
    this.position = new THREE.Vector3(...position)
    this.rotationY = rotationY
    this.trackWidth = trackWidth

    this.group = new THREE.Group()
    this.group.position.copy(this.position)
    this.group.rotation.y = this.rotationY
    this.scene.add(this.group)

    this.bulbs = []
    this.confettiParticles = null

    this._buildStructure()
    this._buildTrafficLights()
    this._buildCheckeredRoadMarking()
    this._buildGridSlots()
  }

  _buildStructure() {
    const halfW = this.trackWidth / 2 + 1.2
    const archHeight = 8.5
    const trussRadius = 0.22

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.85,
      roughness: 0.25,
    })

    const pillarGeo = new THREE.CylinderGeometry(trussRadius, trussRadius * 1.3, archHeight, 8)

    // Pilar Izquierdo
    const leftPillar = new THREE.Mesh(pillarGeo, metalMat)
    leftPillar.position.set(-halfW, archHeight / 2, 0)
    leftPillar.castShadow = true
    this.group.add(leftPillar)

    // Pilar Derecho
    const rightPillar = new THREE.Mesh(pillarGeo, metalMat)
    rightPillar.position.set(halfW, archHeight / 2, 0)
    rightPillar.castShadow = true
    this.group.add(rightPillar)

    // Bases de hormigón
    const baseGeo = new THREE.BoxGeometry(1.4, 0.8, 1.4)
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 })
    const baseL = new THREE.Mesh(baseGeo, baseMat)
    baseL.position.set(-halfW, 0.4, 0)
    baseL.castShadow = true
    this.group.add(baseL)

    const baseR = new THREE.Mesh(baseGeo, baseMat)
    baseR.position.set(halfW, 0.4, 0)
    baseR.castShadow = true
    this.group.add(baseR)

    // Viga superior transversal
    const beamLen = this.trackWidth + 3.2
    const beamGeo = new THREE.BoxGeometry(beamLen, 0.45, 0.6)
    const beam = new THREE.Mesh(beamGeo, metalMat)
    beam.position.set(0, archHeight, 0)
    beam.castShadow = true
    this.group.add(beam)

    // Cartel Principal de META (Start / Finish Banner)
    const bannerW = Math.min(this.trackWidth * 0.75, 16)
    const bannerH = 1.8
    const bannerCanvas = document.createElement('canvas')
    bannerCanvas.width = 1024
    bannerCanvas.height = 256
    const ctx = bannerCanvas.getContext('2d')

    // Fondo azul racing con bordes amarillos
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, 1024, 256)

    // Franjas ajedrezadas superior e inferior
    const sqSize = 32
    for (let x = 0; x < 1024; x += sqSize) {
      // Top strip
      ctx.fillStyle = (x / sqSize) % 2 === 0 ? '#ffffff' : '#000000'
      ctx.fillRect(x, 0, sqSize, 24)
      ctx.fillRect(x, 232, sqSize, 24)
    }

    // Marco dorado
    ctx.strokeStyle = '#facc15'
    ctx.lineWidth = 6
    ctx.strokeRect(6, 26, 1012, 204)

    // Texto de Meta
    ctx.fillStyle = '#fde047'
    ctx.font = 'bold 90px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = '#eab308'
    ctx.shadowBlur = 18
    ctx.fillText('★ START / FINISH ★', 512, 110)

    ctx.shadowBlur = 0
    ctx.fillStyle = '#38bdf8'
    ctx.font = 'bold 32px sans-serif'
    ctx.fillText('MICRO-VOLT RC CHAMPIONSHIP', 512, 185)

    const bannerTex = new THREE.CanvasTexture(bannerCanvas)
    const bannerMat = new THREE.MeshStandardMaterial({
      map: bannerTex,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.25,
    })

    const bannerGeo = new THREE.BoxGeometry(bannerW, bannerH, 0.2)
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat)
    bannerMesh.position.set(0, archHeight - bannerH / 2, 0)
    bannerMesh.castShadow = true
    this.group.add(bannerMesh)

    // Banderas a cuadros inclinadas en los extremos
    this._buildFlag(-halfW - 0.2, archHeight + 0.5, true)
    this._buildFlag(halfW + 0.2, archHeight + 0.5, false)
  }

  _buildFlag(x, y, isLeft) {
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9 })
    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.position.set(x, y, 0)
    pole.rotation.z = isLeft ? 0.35 : -0.35
    this.group.add(pole)

    // Bandera ajedrezada
    const flagCanvas = document.createElement('canvas')
    flagCanvas.width = 128
    flagCanvas.height = 80
    const ctx = flagCanvas.getContext('2d')
    const size = 16
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 8; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#18181b'
        ctx.fillRect(c * size, r * size, size, size)
      }
    }
    const flagTex = new THREE.CanvasTexture(flagCanvas)
    const flagGeo = new THREE.PlaneGeometry(1.2, 0.75)
    const flagMat = new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide })
    const flag = new THREE.Mesh(flagGeo, flagMat)
    flag.position.set(x + (isLeft ? -0.65 : 0.65), y + 0.6, 0)
    flag.rotation.z = isLeft ? 0.2 : -0.2
    this.group.add(flag)
  }

  _buildTrafficLights() {
    const housingW = 3.6
    const housingH = 0.9
    const housingGeo = new THREE.BoxGeometry(housingW, housingH, 0.35)
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.5 })
    const housing = new THREE.Mesh(housingGeo, housingMat)
    housing.position.set(0, 5.8, 0)
    this.group.add(housing)

    const bulbGeo = new THREE.SphereGeometry(0.24, 16, 16)
    const bulbSpacing = 0.8
    const colors = [0xef4444, 0xef4444, 0xef4444, 0x22c55e] // 3 Rojas + 1 Verde

    this.bulbs = []
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * bulbSpacing
      const mat = new THREE.MeshStandardMaterial({
        color: 0x27272a, // Apagado
        emissive: 0x000000,
        emissiveIntensity: 0,
        roughness: 0.2,
      })
      const mesh = new THREE.Mesh(bulbGeo, mat)
      mesh.position.set(x, 5.8, 0.14)
      this.group.add(mesh)

      this.bulbs.push({
        mesh,
        material: mat,
        activeColor: colors[i],
      })
    }
  }

  setCountdownState(step) {
    // step: 3, 2, 1, 'GO', or null/off
    if (step === 3) {
      this._setBulbLit(0, true)
      this._setBulbLit(1, false)
      this._setBulbLit(2, false)
      this._setBulbLit(3, false)
    } else if (step === 2) {
      this._setBulbLit(0, true)
      this._setBulbLit(1, true)
      this._setBulbLit(2, false)
      this._setBulbLit(3, false)
    } else if (step === 1) {
      this._setBulbLit(0, true)
      this._setBulbLit(1, true)
      this._setBulbLit(2, true)
      this._setBulbLit(3, false)
    } else if (step === 'GO') {
      this._setBulbLit(0, false)
      this._setBulbLit(1, false)
      this._setBulbLit(2, false)
      this._setBulbLit(3, true)
    } else {
      for (let i = 0; i < 4; i++) this._setBulbLit(i, false)
    }
  }

  _setBulbLit(index, lit) {
    const bulb = this.bulbs[index]
    if (!bulb) return
    if (lit) {
      bulb.material.color.setHex(bulb.activeColor)
      bulb.material.emissive.setHex(bulb.activeColor)
      bulb.material.emissiveIntensity = 2.5
    } else {
      bulb.material.color.setHex(0x27272a)
      bulb.material.emissive.setHex(0x000000)
      bulb.material.emissiveIntensity = 0
    }
  }

  _buildCheckeredRoadMarking() {
    // Línea de meta ajedrezada pintada en el asfalto (Z = 0 en coordenadas locales del arco)
    const checkCanvas = document.createElement('canvas')
    checkCanvas.width = 512
    checkCanvas.height = 128
    const ctx = checkCanvas.getContext('2d')
    const cols = 16
    const rows = 4
    const cw = 512 / cols
    const ch = 128 / rows

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#18181b'
        ctx.fillRect(c * cw, r * ch, cw, ch)
      }
    }

    const checkTex = new THREE.CanvasTexture(checkCanvas)
    checkTex.wrapS = THREE.RepeatWrapping
    checkTex.wrapT = THREE.RepeatWrapping
    checkTex.repeat.set(this.trackWidth / 8, 1)

    const roadLineGeo = new THREE.PlaneGeometry(this.trackWidth, 3.2)
    const roadLineMat = new THREE.MeshStandardMaterial({
      map: checkTex,
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
    const roadLine = new THREE.Mesh(roadLineGeo, roadLineMat)
    roadLine.rotation.x = -Math.PI / 2
    roadLine.position.set(0, 0.03, 0)
    roadLine.receiveShadow = true
    this.group.add(roadLine)
  }

  _buildGridSlots() {
    // 6 cajones de salida escalonados detrás de la línea de meta (-Z local)
    // Fila 0: z = -4.5 (Pole izq col = -1, Pole der col = 1)
    // Fila 1: z = -11.0
    // Fila 2: z = -17.5
    const slots = [
      { num: '1', col: -1, z: -4.5 },
      { num: '2', col: 1, z: -4.5 },
      { num: '3', col: -1, z: -11.0 },
      { num: '4', col: 1, z: -11.0 },
      { num: '5', col: -1, z: -17.5 },
      { num: '6', col: 1, z: -17.5 },
    ]

    const lateralSpacing = 2.6
    for (const s of slots) {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 14
      ctx.strokeRect(10, 10, 236, 236)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 120px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(s.num, 128, 128)

      const tex = new THREE.CanvasTexture(canvas)
      const geo = new THREE.PlaneGeometry(2.2, 3.2)
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
      const boxMesh = new THREE.Mesh(geo, mat)
      boxMesh.rotation.x = -Math.PI / 2
      boxMesh.position.set(s.col * lateralSpacing, 0.035, s.z)
      this.group.add(boxMesh)
    }
  }

  triggerCelebration() {
    // Generar partículas de confeti festivo cayendo sobre la meta
    if (this.confettiParticles) {
      this.confettiParticles.removeFromParent()
      this.confettiParticles.geometry.dispose()
      this.confettiParticles = null
    }

    const count = 300
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const velocities = []

    const palette = [
      [1, 0.8, 0],   // Oro
      [0.9, 0.2, 0.2],// Rojo
      [0.2, 0.6, 1], // Azul
      [0.2, 1, 0.4], // Verde
      [1, 0.2, 0.8], // Magenta
    ]

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * (this.trackWidth * 0.9)
      pos[i * 3 + 1] = 7.5 + Math.random() * 4.0
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8.0

      const col = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = col[0]
      colors[i * 3 + 1] = col[1]
      colors[i * 3 + 2] = col[2]

      velocities.push({
        x: (Math.random() - 0.5) * 2.5,
        y: -1.5 - Math.random() * 2.5,
        z: (Math.random() - 0.5) * 2.5,
      })
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    })

    const points = new THREE.Points(geo, mat)
    this.group.add(points)
    this.confettiParticles = points
    this.confettiVelocities = velocities
    this.confettiTimer = 4.5
  }

  update(delta) {
    if (this.confettiParticles && this.confettiTimer > 0) {
      this.confettiTimer -= delta
      const posAttr = this.confettiParticles.geometry.attributes.position
      for (let i = 0; i < posAttr.count; i++) {
        const vel = this.confettiVelocities[i]
        posAttr.setY(i, Math.max(0.05, posAttr.getY(i) + vel.y * delta))
        posAttr.setX(i, posAttr.getX(i) + vel.x * delta)
        posAttr.setZ(i, posAttr.getZ(i) + vel.z * delta)
      }
      posAttr.needsUpdate = true
      if (this.confettiTimer <= 0) {
        this.confettiParticles.visible = false
      }
    }
  }

  dispose() {
    if (this.group.parent) {
      this.group.removeFromParent()
    }
    this.group.traverse((c) => {
      if (c.isMesh || c.isPoints) {
        c.geometry?.dispose()
        if (c.material) {
          c.material.map?.dispose()
          c.material.dispose()
        }
      }
    })
  }
}
