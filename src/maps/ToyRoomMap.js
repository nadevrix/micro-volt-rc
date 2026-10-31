import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BaseMap } from './BaseMap.js'
import { createBrush } from '../utils/GoldSrcBrush.js'
import { createToyBoxTexture } from '../utils/ProceduralTextures.js'
import { FinishLineArch } from './FinishLineArch.js'

/**
 * ToyRoomMap - Mapa 2: "Bodega Retro & Taller de Juguetes"
 * Estilo retro industrial 1999 (Re-Volt / Half-Life 1).
 * - Cero papel tapiz plano: Texturas fotográficas de madera real, ladrillo y paneles industriales con GoldSrcBrush.
 * - Desnivel de 2 pisos:
 *   - Piso bajo (Y = 0.5): Carrera bajo mesas gigantes, entre cajas de tablones de madera y pilas alcalinas.
 *   - Rampa de madera larga que sube a los autos RC a la Gran Mesa de Trabajo / Estantería (Y = 4.5).
 *   - Segundo piso elevado (Y = 4.8): Carrera sobre la mesa entre cajas de juguetes retro, cruzando un puente elevado hacia la rampa de bajada.
 * - Waypoints 3D y checkpoints sincronizados con las alturas reales.
 */
export class ToyRoomMap extends BaseMap {
  constructor(options) {
    super(options)
    this.name = 'Bodega & Taller de Juguetes'
    this.spawnPosition = new CANNON.Vec3(25, 0.55, -50)
    this.spawnQuaternion = new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0)

    this._loader = new GLTFLoader()
    this.finishArch = null
    this.ready = this._init()
  }

  async _init() {
    // 1. Cúpula de Cielo Estilo Re-Volt
    this.buildReVoltSkyDome(600)

    // 2. Construcción de la Bodega / Taller (Suelo de madera real y paredes de ladrillo/paneles)
    this._buildWarehouseArchitecture()

    // 3. Pista de 2 Pisos (Rampa ascendente, Mesa de trabajo elevada Y = 4.5 y rampa descendente)
    this._buildTwoStoryTrack()

    // 4. Juguetes y Muebles Gigantes (Cajas retro comerciales, pilas VOLT-MAX, escritorios colosales)
    this._buildToyWorkshopProps()

    // 5. Waypoints 3D y Checkpoints
    this._setupWaypointsAndCheckpoints()

    // 6. Carga de muebles de furniture-kit
    await this._loadWorkshopFurniture()

    // 7. Arco de Meta Oficial 3D
    this.finishArch = new FinishLineArch({
      scene: this.group,
      position: [25, 0, -50],
      rotationY: 0,
      trackWidth: 18,
    })

    this.isReady = true
  }

  _buildWarehouseArchitecture() {
    const roomSize = 220
    const wallHeight = 44

    // 1. Piso principal: Madera real fotográfica wood_diff_1k.jpg con barniz retro
    const floor = createBrush({
      size: [roomSize, 1, roomSize],
      position: [0, -0.5, 0],
      textureUrl: '/assets/textures/wood_diff_1k.jpg',
      texScale: 10,
      roughness: 0.35,
      metalness: 0.1,
    })
    this.group.add(floor)
    this.addStaticBox({ position: [0, -0.5, 0], size: [roomSize, 1, roomSize] })

    // 2. Paredes perimetrales: Mitad inferior de ladrillo real (h = 18) y mitad superior de concreto wall_lines.png (h = 26)
    const wallConfigs = [
      { posLower: [0, 9, -roomSize / 2], posUpper: [0, 31, -roomSize / 2], size: [roomSize, 2] },
      { posLower: [0, 9, roomSize / 2], posUpper: [0, 31, roomSize / 2], size: [roomSize, 2] },
      { posLower: [-roomSize / 2, 9, 0], posUpper: [-roomSize / 2, 31, 0], size: [2, roomSize] },
      { posLower: [roomSize / 2, 9, 0], posUpper: [roomSize / 2, 31, 0], size: [2, roomSize] },
    ]

    for (const w of wallConfigs) {
      // Mitad inferior: Ladrillo
      const lower = createBrush({
        size: [w.size[0], 18, w.size[1]],
        position: w.posLower,
        textureUrl: '/assets/textures/brick_diff_1k.jpg',
        texScale: 8,
      })
      this.group.add(lower)
      this.addStaticBox({ position: w.posLower, size: [w.size[0], 18, w.size[1]] })

      // Mitad superior: Paneles industriales
      const upper = createBrush({
        size: [w.size[0], 26, w.size[1]],
        position: w.posUpper,
        textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/wall_lines.png',
        texScale: 8,
      })
      this.group.add(upper)
      this.addStaticBox({ position: w.posUpper, size: [w.size[0], 26, w.size[1]] })
    }

    // 3. Techo industrial con vigas y tragaluces
    const ceiling = createBrush({
      size: [roomSize, 1.5, roomSize],
      position: [0, wallHeight, 0],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/roof_plates.png',
      color: 0x334155,
      texScale: 10,
    })
    this.group.add(ceiling)

    // Lámparas colgantes cálidas de taller
    const lampPositions = [
      [30, 22, -30], [-30, 22, -30],
      [30, 22, 30], [-30, 22, 30],
      [0, 22, 0],
    ]
    for (const [lx, ly, lz] of lampPositions) {
      const lampLight = new THREE.PointLight(0xfef08a, 2.8, 65, 1.1)
      lampLight.position.set(lx, ly, lz)
      this.group.add(lampLight)
    }
  }

  _buildTwoStoryTrack() {
    // =========================================================================
    // SEGUNDO PISO: MESA DE TRABAJO Y ESTANTERÍA GIGANTE A Y = 4.5
    // =========================================================================
    // 1. Rampa ascendente de tablones de madera planks.png
    // Sube de y = 0 a y = 4.5 a lo largo de 35m (de z = 60 a z = 25 en x = -35)
    const rampLen = 35
    const rampHeight = 4.5
    const rampAngle = Math.atan2(rampHeight, rampLen)
    const rampHypot = Math.hypot(rampLen, rampHeight)
    const rampWidth = 14

    const upRamp = createBrush({
      size: [rampWidth, 0.6, rampHypot],
      position: [-35, rampHeight / 2, 42.5],
      rotation: [rampAngle, 0, 0],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/planks.png',
      texScale: 5,
    })
    this.group.add(upRamp)
    this.addStaticBox({
      position: [-35, rampHeight / 2, 42.5],
      size: [rampWidth, 0.6, rampHypot],
      rotation: [rampAngle, 0, 0],
    })

    // 2. Mesa de Trabajo / Plataforma Elevada a Y = 4.5 (de z = 25 a z = -45 en x = -35)
    const tableTop = createBrush({
      size: [24, 0.8, 70],
      position: [-35, 4.1, -10],
      textureUrl: '/assets/textures/wood_diff_1k.jpg',
      texScale: 8,
      roughness: 0.4,
    })
    this.group.add(tableTop)
    this.addStaticBox({
      position: [-35, 4.1, -10],
      size: [24, 0.8, 70],
    })

    // Barandillas metálicas sobre la mesa (bars.png)
    const railWest = createBrush({
      size: [0.3, 2.0, 70],
      position: [-46.8, 5.4, -10],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/bars.png',
      texScale: 2.0,
      transparent: true,
    })
    this.group.add(railWest)
    this.addStaticBox({ position: [-46.8, 5.4, -10], size: [0.3, 2.0, 70] })

    const railEast = createBrush({
      size: [0.3, 2.0, 50],
      position: [-23.2, 5.4, 0],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/bars.png',
      texScale: 2.0,
      transparent: true,
    })
    this.group.add(railEast)
    this.addStaticBox({ position: [-23.2, 5.4, 0], size: [0.3, 2.0, 50] })

    // Patas colosales de la mesa de trabajo (4 patas gruesas hasta el suelo)
    const legSize = [3, 4.5, 3]
    const legPositions = [
      [-44, 2.25, 20], [-26, 2.25, 20],
      [-44, 2.25, -40], [-26, 2.25, -40],
    ]
    for (const lp of legPositions) {
      const leg = createBrush({
        size: legSize,
        position: lp,
        textureUrl: '/assets/textures/wood_diff_1k.jpg',
        texScale: 4,
      })
      this.group.add(leg)
      this.addStaticBox({ position: lp, size: legSize })
    }

    // 3. Puente de madera elevado hacia la rampa de bajada (de x = -35 a x = 0, z = -45)
    const crossover = createBrush({
      size: [28, 0.8, 12],
      position: [-16, 4.1, -45],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/planks.png',
      texScale: 5,
    })
    this.group.add(crossover)
    this.addStaticBox({ position: [-16, 4.1, -45], size: [28, 0.8, 12] })

    // 4. Rampa de bajada (de x = -2 a x = 25, z de -45 a -65, baja de y = 4.5 a y = 0.5)
    const downHypot = Math.hypot(25, rampHeight)
    const downAngle = Math.atan2(rampHeight, 25)
    const downRamp = createBrush({
      size: [14, 0.6, downHypot],
      position: [12, rampHeight / 2, -55],
      rotation: [0, Math.PI / 4, -downAngle],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/planks.png',
      texScale: 5,
    })
    this.group.add(downRamp)
    this.addStaticBox({
      position: [12, rampHeight / 2, -55],
      size: [14, 0.6, downHypot],
      rotation: [0, Math.PI / 4, -downAngle],
    })

    // Barreras protectoras en el piso bajo
    const floorBarrier = createBrush({
      size: [2, 1.4, 85],
      position: [38, 0.7, 0],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/wall.png',
      texScale: 4,
    })
    this.group.add(floorBarrier)
    this.addStaticBox({ position: [38, 0.7, 0], size: [2, 1.4, 85] })
  }

  _buildToyWorkshopProps() {
    // 1. Cajas comerciales estilo 1999 ("MEGA-BOT 51" y "SUPER RC") sobre la mesa y en el suelo
    const megaBotTex = createToyBoxTexture({
      title: 'MEGA-BOT 51',
      subtitle: 'ELECTRONIC RC TITAN',
      color: '#dc2626',
    })
    const megaBotMat = new THREE.MeshStandardMaterial({ map: megaBotTex, roughness: 0.35, metalness: 0.15 })

    const superRcTex = createToyBoxTexture({
      title: 'SUPER RC',
      subtitle: 'TURBO RACING 4WD',
      color: '#2563eb',
    })
    const superRcMat = new THREE.MeshStandardMaterial({ map: superRcTex, roughness: 0.35, metalness: 0.15 })

    const toyBoxes = [
      // En el suelo
      { mat: megaBotMat, pos: [45, 10, 20], size: [10, 20, 8], rotY: -0.2 },
      { mat: superRcMat, pos: [10, 8, 70], size: [18, 16, 8], rotY: 0.4 },
      // Encima de la mesa de trabajo (y = 4.5 + altura/2)
      { mat: megaBotMat, pos: [-42, 8.5, 5], size: [5, 8, 12], rotY: 0 },
      { mat: superRcMat, pos: [-42, 8.5, -25], size: [5, 8, 12], rotY: 0 },
    ]

    for (const b of toyBoxes) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.size[0], b.size[1], b.size[2]), b.mat)
      mesh.position.set(b.pos[0], b.pos[1], b.pos[2])
      mesh.rotation.y = b.rotY
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.group.add(mesh)
      this.addStaticBox({
        position: b.pos,
        size: b.size,
        rotation: [0, b.rotY, 0],
      })
    }

    // 2. Pilas cilíndricas gigantes VOLT-MAX
    this._buildGiantBattery([42, 2.2, -15], [0, 0, 0])
    this._buildGiantBattery([-15, 2.2, 58], [Math.PI / 2, 0, 0.4])
  }

  _buildGiantBattery(pos, rot) {
    const radius = 2.2
    const height = 11
    const batGroup = new THREE.Group()

    const batMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.4,
    })
    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.8,
      roughness: 0.2,
    })

    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), batMat)
    body.castShadow = true
    batGroup.add(body)

    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 20), copperMat)
    tip.position.y = height / 2 + 0.6
    tip.castShadow = true
    batGroup.add(tip)

    batGroup.position.set(pos[0], pos[1], pos[2])
    batGroup.rotation.set(rot[0], rot[1], rot[2])
    this.group.add(batGroup)

    this.addStaticBox({
      position: pos,
      size: [radius * 2, height, radius * 2],
      rotation: rot,
    })
  }

  async _loadWorkshopFurniture() {
    const basePath = '/assets/packs/furniture-kit/Models/GLTF format/'
    const furnitureItems = [
      // Escritorio gigante por debajo del cual cruza la pista en el piso bajo
      { url: `${basePath}desk.glb`, pos: [25, 0, 20], scale: 14, rotY: Math.PI },
      // Estantería de herramientas cerrada
      { url: `${basePath}bookcaseClosedWide.glb`, pos: [55, 0, -25], scale: 15, rotY: -Math.PI / 2 },
      // Silla de taller
      { url: `${basePath}chairDesk.glb`, pos: [12, 0, 22], scale: 13, rotY: 0.5 },
    ]

    for (const item of furnitureItems) {
      try {
        const gltf = await this._loader.loadAsync(item.url)
        const scene = gltf.scene.clone(true)
        scene.position.set(item.pos[0], item.pos[1], item.pos[2])
        scene.rotation.y = item.rotY
        scene.scale.set(item.scale, item.scale, item.scale)
        scene.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true
            c.receiveShadow = true
          }
        })
        this.group.add(scene)

        const box = new THREE.Box3().setFromObject(scene)
        const size = box.getSize(new THREE.Vector3())
        if (item.url.includes('desk')) {
          // Dejar paso por debajo del escritorio para autos RC
          this.addStaticBox({ position: [item.pos[0] - 12, size.y / 2, item.pos[2]], size: [3.5, size.y, size.z * 0.8] })
          this.addStaticBox({ position: [item.pos[0] + 12, size.y / 2, item.pos[2]], size: [3.5, size.y, size.z * 0.8] })
          this.addStaticBox({ position: [item.pos[0], size.y + 1, item.pos[2]], size: [size.x, 1.8, size.z] })
        } else {
          this.addStaticBox({
            position: [item.pos[0], size.y / 2, item.pos[2]],
            size: [size.x * 0.9, size.y, size.z * 0.9],
          })
        }
      } catch (e) {
        console.warn(`Error al cargar mueble ${item.url}:`, e)
      }
    }
  }

  _setupWaypointsAndCheckpoints() {
    this.waypoints = [
      // Piso Bajo (y = 0.5): Recta este
      [25, 0.5, -50], // 0: Salida / Meta
      [25, 0.5, -25], // 1
      [25, 0.5, 0],   // 2
      [25, 0.5, 20],  // 3: Pasando por debajo del escritorio gigante
      [25, 0.5, 45],  // 4: Curva sur
      [10, 0.5, 60],  // 5
      [-10, 0.5, 62], // 6
      [-25, 0.5, 55], // 7: Alineación con la rampa de subida

      // Rampa Ascendente a la Mesa de Trabajo (sube a y = 4.8)
      [-35, 1.0, 50], // 8: Inicio rampa
      [-35, 2.5, 38], // 9: Mitad rampa (y = 2.5)
      [-35, 4.6, 25], // 10: Cima de la rampa en la mesa

      // Segundo Piso: Mesa de Trabajo Elevada (y = 4.8)
      [-35, 4.8, 10], // 11: Carrera sobre la mesa de trabajo
      [-35, 4.8, -5], // 12: Entre cajas de juguetes
      [-35, 4.8, -20],// 13
      [-35, 4.8, -35],// 14: Acercándose al puente
      [-28, 4.8, -45],// 15: Entrada al puente elevado
      [-15, 4.8, -45],// 16: Cruzando el puente sobre el piso bajo
      [-2, 4.8, -45], // 17: Inicio de la rampa de bajada

      // Rampa Descendente y Curva de Regreso a Meta
      [8, 3.2, -52],  // 18: Bajando en diagonal
      [18, 1.5, -58], // 19: Aterrizaje suave en piso bajo
      [24, 0.5, -55], // 20: Alineación final con la meta
    ]

    this.setCheckpoints([
      { pos: [25, 1.2, -50], radius: 15 }, // CP 0: Meta
      { pos: [25, 1.2, 0], radius: 15 },   // CP 1: Recta bajo escritorio
      { pos: [10, 1.2, 60], radius: 16 },  // CP 2: Curva sur piso bajo
      { pos: [-35, 2.5, 38], radius: 16 }, // CP 3: Rampa de subida
      { pos: [-35, 5.2, 5], radius: 15 },  // CP 4: Segundo piso sobre mesa
      { pos: [-35, 5.2, -30], radius: 15 },// CP 5: Mesa alta norte
      { pos: [-15, 5.2, -45], radius: 15 },// CP 6: Puente de madera elevado
      { pos: [12, 2.5, -55], radius: 16 }, // CP 7: Rampa de bajada hacia meta
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
