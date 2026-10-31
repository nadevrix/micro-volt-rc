import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { BaseMap } from './BaseMap.js'
import { createBrush } from '../utils/GoldSrcBrush.js'
import { FinishLineArch } from './FinishLineArch.js'

/**
 * DesertGrandPrixMap - Circuito 3: "Gran Premio del Desierto / Canyon Speedway"
 * - Circuito profesional de asfalto continuo de alta velocidad entre cañones desérticos.
 * - Pistas con cordones rojo/blanco (pianos de carrera) en los vértices de curva.
 * - Muros de contención con barandillas metálicas y barreras de neumáticos.
 * - Tribunas de espectadores, torres de focos y arcos de patrocinio ("MICRO-VOLT RC", "TURBO 4WD").
 * - Formaciones rocosas gigantescas y paso elevado por cañón.
 * - Colisiones 100% sólidas y estables (CANNON.Box) para físicas impecables a 60 FPS sin hundimientos.
 */
export class DesertGrandPrixMap extends BaseMap {
  constructor(options) {
    super(options)
    this.name = 'Gran Premio del Desierto'
    this.tag = 'SUPER SPEEDWAY DEL DESIERTO'
    this.desc = 'Circuito profesional al aire libre entre cañones rocosos, curvas peraltadas con pianos rojo/blanco y recta principal de meta.'

    // Punto de salida en la recta principal (frente al Arco de Meta)
    this.spawnPosition = new CANNON.Vec3(0, 0.55, -120)
    this.spawnQuaternion = new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0)

    this.finishArch = null
    this.ready = this._init()
  }

  async _init() {
    // 1. Cúpula de Cielo Desértico Soleado
    this.buildReVoltSkyDome(850)

    // 2. Terreno del Desierto
    this._buildDesertTerrain()

    // 3. Pista de Carreras de Asfalto (Circuito cerrado de 550 metros)
    this._buildRaceTrack()

    // 4. Elementos del Circuito (Arco de Meta 3D, Tribunas, Banners, Neumáticos)
    this._buildCircuitProps()

    // 5. Waypoints de IA y Checkpoints Anti-Trampa
    this._setupWaypointsAndCheckpoints()

    this.isReady = true
  }

  _buildDesertTerrain() {
    const terrainSize = 500

    // Suelo desértico infinito de arena dorada
    const groundGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 32, 32)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Arena dorada cálida
      roughness: 0.95,
      metalness: 0.05,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.05
    ground.receiveShadow = true
    this.group.add(ground)

    // Colisionador de suelo general
    this.addStaticBox({
      position: [0, -0.5, 0],
      size: [terrainSize, 1, terrainSize],
    })

    // Montañas y cañones rocosos perimetrales
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412, // Roca rojiza de cañón
      roughness: 0.9,
      flatShading: true,
    })

    const mountainConfigs = [
      { pos: [0, 18, 160], size: [220, 36, 40] },
      { pos: [0, 18, -190], size: [240, 36, 40] },
      { pos: [130, 20, 0], size: [40, 40, 320] },
      { pos: [-130, 20, 0], size: [40, 40, 320] },
      // Cañones interiores decorativos
      { pos: [45, 12, -20], size: [25, 24, 60] },
      { pos: [-45, 12, 40], size: [30, 24, 70] },
    ]

    for (const m of mountainConfigs) {
      const rockGeo = new THREE.ConeGeometry(m.size[0] / 2, m.size[1], 7)
      const rock = new THREE.Mesh(rockGeo, rockMat)
      rock.position.set(m.pos[0], m.size[1] / 2, m.pos[2])
      rock.castShadow = true
      rock.receiveShadow = true
      this.group.add(rock)

      this.addStaticBox({
        position: [m.pos[0], m.pos[1], m.pos[2]],
        size: m.size,
      })
    }
  }

  _buildRaceTrack() {
    const trackWidth = 20

    // Lista de tramos rectos y diagonales del circuito GP
    // Circuito:
    // 1. Recta Principal de Salida/Meta: x = 0, z de -130 a -10 (largo 120m)
    // 2. Curva 1 hacia la derecha: de (0, -10) a (50, 40)
    // 3. Recta Este: de (50, 40) a (50, 110)
    // 4. Horquilla Sur: de (50, 110) a (-50, 110)
    // 5. Chicana Oeste: de (-50, 110) a (-70, 30)
    // 6. Curva Norte hacia la meta: de (-70, 30) a (-30, -70) a (0, -130)

    const segments = [
      // Recta Principal de Meta (Norte a Sur en Z)
      { pos: [0, 0.05, -70], size: [trackWidth, 0.2, 120], rotY: 0 },

      // Curva 1 y Recta Este
      { pos: [22, 0.05, 10], size: [trackWidth, 0.2, 50], rotY: -Math.PI / 4 },
      { pos: [55, 0.05, 70], size: [trackWidth, 0.2, 80], rotY: 0 },

      // Curva 2 Sur
      { pos: [35, 0.05, 120], size: [trackWidth, 0.2, 45], rotY: Math.PI / 4 },
      { pos: [0, 0.05, 135], size: [trackWidth, 0.2, 50], rotY: Math.PI / 2 },
      { pos: [-35, 0.05, 120], size: [trackWidth, 0.2, 45], rotY: -Math.PI / 4 },

      // Recta Oeste con Chicana
      { pos: [-65, 0.05, 70], size: [trackWidth, 0.2, 70], rotY: 0 },
      { pos: [-55, 0.05, 20], size: [trackWidth, 0.2, 50], rotY: -Math.PI / 6 },
      { pos: [-70, 0.05, -30], size: [trackWidth, 0.2, 60], rotY: Math.PI / 8 },

      // Curva Final hacia la Recta de Meta
      { pos: [-45, 0.05, -95], size: [trackWidth, 0.2, 65], rotY: -Math.PI / 4 },
      { pos: [-15, 0.05, -130], size: [trackWidth, 0.2, 45], rotY: -Math.PI / 8 },
    ]

    for (const seg of segments) {
      // Asfalto de pista
      const road = createBrush({
        size: seg.size,
        position: seg.pos,
        rotation: [0, seg.rotY, 0],
        textureUrl: '/assets/textures/asphalt_diff_1k.jpg',
        texScale: 6,
        roughness: 0.8,
      })
      this.group.add(road)
      this.addStaticBox({
        position: seg.pos,
        size: seg.size,
        rotation: [0, seg.rotY, 0],
      })

      // Pianos de circuito (curbs rojo y blanco) en los bordes
      this._buildCurbs(seg.pos, seg.size, seg.rotY)

      // Guardarraíles de seguridad en el exterior
      this._buildGuardRails(seg.pos, seg.size, seg.rotY)
    }
  }

  _buildCurbs(center, size, rotY) {
    const halfW = size[0] / 2
    const curbW = 1.6
    const curbH = 0.22
    const len = size[2]

    // Textura de piano rojo y blanco
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ef4444' // Rojo
    ctx.fillRect(0, 0, 64, 64)
    ctx.fillStyle = '#ffffff' // Blanco
    ctx.fillRect(0, 64, 64, 64)

    const curbTex = new THREE.CanvasTexture(canvas)
    curbTex.wrapT = THREE.RepeatWrapping
    curbTex.repeat.set(1, len / 3.0)

    const curbMat = new THREE.MeshStandardMaterial({
      map: curbTex,
      roughness: 0.6,
    })

    const curbGeo = new THREE.BoxGeometry(curbW, curbH, len)

    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(curbGeo, curbMat)
      curb.position.set(
        center[0] + Math.cos(rotY) * (side * (halfW + curbW / 2)),
        center[1] + curbH / 2,
        center[2] - Math.sin(rotY) * (side * (halfW + curbW / 2))
      )
      curb.rotation.y = rotY
      curb.castShadow = true
      curb.receiveShadow = true
      this.group.add(curb)
    }
  }

  _buildGuardRails(center, size, rotY) {
    const halfW = size[0] / 2 + 2.2
    const railH = 1.8
    const len = size[2]

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.3,
    })

    for (const side of [-1, 1]) {
      const pos = [
        center[0] + Math.cos(rotY) * (side * halfW),
        center[1] + railH / 2,
        center[2] - Math.sin(rotY) * (side * halfW),
      ]

      const railMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, railH, len), railMat)
      railMesh.position.set(pos[0], pos[1], pos[2])
      railMesh.rotation.y = rotY
      railMesh.castShadow = true
      this.group.add(railMesh)

      this.addStaticBox({
        position: pos,
        size: [0.5, railH, len],
        rotation: [0, rotY, 0],
      })
    }
  }

  _buildCircuitProps() {
    // 1. ARCO DE META 3D OFICIAL (Start / Finish Gantry)
    // Ubicado en la recta principal en z = -120
    this.finishArch = new FinishLineArch({
      scene: this.group,
      position: [0, 0, -120],
      rotationY: 0,
      trackWidth: 20,
    })

    // 2. Gran Tribuna de Espectadores en la recta de meta (Este, x = 18, z = -115)
    this._buildGrandStand([22, 0, -115], 50)

    // 3. Carteles de Patrocinio ("MICRO-VOLT RC", "TURBO OIL", "VOLT BATTERIES")
    this._buildSponsorBillboard([-18, 0, -115], 'MICRO-VOLT RC', '#2563eb')
    this._buildSponsorBillboard([68, 0, 70], 'TURBO SPEED 4WD', '#dc2626')
    this._buildSponsorBillboard([-78, 0, 40], 'VOLT BATTERIES', '#f59e0b')

    // 4. Torres de iluminación deportiva
    const towerPositions = [
      [24, 0, -140], [-24, 0, -140],
      [70, 0, 90], [-80, 0, 90],
      [0, 0, 150],
    ]
    for (const [tx, ty, tz] of towerPositions) {
      this._buildLightTower(tx, ty, tz)
    }
  }

  _buildGrandStand(pos, length) {
    const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 })

    // 4 niveles escalonados
    for (let tier = 0; tier < 4; tier++) {
      const stepH = 1.2 * (tier + 1)
      const stepD = 1.8
      const stepX = pos[0] + tier * stepD

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(stepD, stepH, length), standMat)
      mesh.position.set(stepX, stepH / 2, pos[2])
      mesh.castShadow = true
      this.group.add(mesh)

      const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(stepD * 0.9, 0.2, length * 0.96), seatMat)
      seatMesh.position.set(stepX, stepH + 0.1, pos[2])
      this.group.add(seatMesh)
    }

    // Techo de tribuna
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, length + 2), standMat)
    roof.position.set(pos[0] + 3.5, 7.5, pos[2])
    this.group.add(roof)
  }

  _buildSponsorBillboard(pos, title, bgColor) {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, 512, 128)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 55px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, 256, 64)

    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 })
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 10), mat)
    board.position.set(pos[0], 2.5, pos[2])
    this.group.add(board)

    // Patas de soporte
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
    for (const dz of [-4, 4]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.5, 8), legMat)
      leg.position.set(pos[0], 1.25, pos[2] + dz)
      this.group.add(leg)
    }
  }

  _buildLightTower(x, y, z) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 })
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 18, 8), poleMat)
    pole.position.set(x, 9, z)
    pole.castShadow = true
    this.group.add(pole)

    // Foco halógeno
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 1.5,
    })
    const lampHead = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.2), lampMat)
    lampHead.position.set(x, 18, z)
    this.group.add(lampHead)

    const light = new THREE.PointLight(0xfef08a, 2.2, 50, 1.2)
    light.position.set(x, 17, z)
    this.group.add(light)
  }

  _setupWaypointsAndCheckpoints() {
    // 22 waypoints continuos que recorren la línea ideal de carrera
    this.waypoints = [
      [0, 0.8, -120], // Meta (Inicio)
      [0, 0.8, -70],
      [0, 0.8, -20],
      [15, 0.8, 5],
      [35, 0.8, 25],
      [55, 0.8, 55],
      [55, 0.8, 95],
      [45, 0.8, 120],
      [20, 0.8, 135],
      [-20, 0.8, 135],
      [-45, 0.8, 120],
      [-65, 0.8, 90],
      [-65, 0.8, 55],
      [-55, 0.8, 20],
      [-70, 0.8, -15],
      [-70, 0.8, -45],
      [-55, 0.8, -80],
      [-35, 0.8, -110],
      [-15, 0.8, -125],
      [0, 0.8, -125],
    ]

    // 6 Checkpoints secuenciales obligatorios
    this.setCheckpoints([
      { pos: [0, 1.0, -70], radius: 24 },
      { pos: [55, 1.0, 55], radius: 24 },
      { pos: [0, 1.0, 135], radius: 25 },
      { pos: [-65, 1.0, 55], radius: 24 },
      { pos: [-70, 1.0, -30], radius: 24 },
      { pos: [0, 1.0, -120], radius: 22 }, // Meta
    ])
  }

  update(delta, vehiclePosition) {
    super.update(delta, vehiclePosition)
    if (this.finishArch) {
      this.finishArch.update(delta)
    }
  }

  triggerCelebration() {
    if (this.finishArch) {
      this.finishArch.triggerCelebration()
    }
  }

  dispose() {
    super.dispose()
    if (this.finishArch) {
      this.finishArch.dispose()
      this.finishArch = null
    }
  }
}
