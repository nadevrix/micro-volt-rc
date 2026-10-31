import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BaseMap } from './BaseMap.js'
import { createBrush } from '../utils/GoldSrcBrush.js'
import { FinishLineArch } from './FinishLineArch.js'

/**
 * SuburbanStreetMap - Mapa 1: "Distrito Industrial & Hangar Militar"
 * Estilo retro realista 1999 (Half-Life 1 / GoldSrc).
 * - Cero texturas planas o plastilina: mapeo métrico real UV con GoldSrcBrush.
 * - 4 ZONAS ARQUITECTÓNICAS con desniveles reales (Y = 0.5 a Y = 5.5):
 *   1. Avenida Industrial Retro (Camiones gigantes, edificios y cables aéreos).
 *   2. Hangar Militar Half-Life 1 (Techado, tragaluces luminosos, contenedores apilados y túnel).
 *   3. Pasarela Elevada y Puente Superior a Y = 5.0 con barandillas y andamios.
 *   4. Callejón de Obra, Chicana de Ladrillos y Salto hacia la recta principal.
 * - 34 waypoints 3D y 9 checkpoints.
 */
export class SuburbanStreetMap extends BaseMap {
  constructor(options) {
    super(options)
    this.name = 'Distrito Industrial & Hangar'
    this.spawnPosition = new CANNON.Vec3(38, 0.55, -80)
    this.spawnQuaternion = new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0)

    this._loader = new GLTFLoader()
    this.ready = this._init()
  }

  async _init() {
    // 1. Cúpula de Cielo Estilo Re-Volt
    this.buildReVoltSkyDome(600)

    // Base de Suelo Global sólida para todo el Distrito Industrial
    this.addStaticBox({
      position: [0, -0.5, 0],
      size: [240, 1, 240],
    })

    // 2. Construcción de las 4 Zonas mediante GoldSrcBrush
    this._buildZone1IndustrialAvenue()
    this._buildZone2MilitaryHangar()
    this._buildZone3ElevatedBridge()
    this._buildZone4ConstructionAlley()

    // 3. Waypoints 3D y Checkpoints
    this._setupWaypointsAndCheckpoints()

    // 4. Modelos 3D de retro-urban-kit (conservando sus materiales originales)
    await this._loadZone1Props()
    await this._loadZone2HangarProps()
    await this._loadZone3BridgeProps()
    await this._loadZone4AlleyProps()

    // 5. Arco de Meta Oficial 3D
    this.finishArch = new FinishLineArch({
      scene: this.group,
      position: [38, 0, -80],
      rotationY: 0,
      trackWidth: 20,
    })

    this.isReady = true
  }

  // =========================================================================
  // ZONA 1: AVENIDA INDUSTRIAL RETRO (x = 38, z de -90 a +10, y = 0.5)
  // =========================================================================
  _buildZone1IndustrialAvenue() {
    // Asfalto principal (ancho 22m, largo 130m, cubriendo toda la parrilla de z = -110 a +20)
    const road = createBrush({
      size: [22, 1, 130],
      position: [38, -0.5, -45],
      textureUrl: '/assets/textures/asphalt_diff_1k.jpg',
      texScale: 8,
      roughness: 0.85,
    })
    this.group.add(road)
    this.addStaticBox({ position: [38, -0.5, -45], size: [22, 1, 130] })

    // Aceras este y oeste con baldosas retro tiles.png
    const sidewalkEast = createBrush({
      size: [8, 0.5, 130],
      position: [53, 0.25, -45],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/tiles.png',
      texScale: 4,
      color: 0xd4d4d8,
      roughness: 0.75,
    })
    this.group.add(sidewalkEast)
    this.addStaticBox({ position: [53, 0.25, -45], size: [8, 0.5, 130] })

    const sidewalkWest = createBrush({
      size: [8, 0.5, 130],
      position: [23, 0.25, -45],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/tiles.png',
      texScale: 4,
      color: 0xd4d4d8,
      roughness: 0.75,
    })
    this.group.add(sidewalkWest)
    this.addStaticBox({ position: [23, 0.25, -45], size: [8, 0.5, 130] })

    // Muros perimetrales este con ladrillos reales
    const eastWall = createBrush({
      size: [2, 16, 130],
      position: [58, 8, -45],
      textureUrl: '/assets/textures/brick_diff_1k.jpg',
      texScale: 8,
    })
    this.group.add(eastWall)
    this.addStaticBox({ position: [58, 8, -45], size: [2, 16, 130] })

    // Línea de meta en el asfalto (z = -80)
    const finishLine = createBrush({
      size: [20, 0.04, 2.5],
      position: [38, 0.02, -80],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/tiles.png',
      texScale: 1.5,
      color: 0xffffff,
    })
    this.group.add(finishLine)
  }

  // =========================================================================
  // ZONA 2: EL HANGAR MILITAR HALF-LIFE 1 (z de +10 a +115, x de +52 a -20)
  // =========================================================================
  _buildZone2MilitaryHangar() {
    // 1. Piso interior de concreto manchado
    const floor = createBrush({
      size: [72, 1, 105],
      position: [16, -0.5, 65],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/concrete.png',
      texScale: 6,
      roughness: 0.88,
    })
    this.group.add(floor)
    this.addStaticBox({ position: [16, -0.5, 65], size: [72, 1, 105] })

    // 2. Paredes perimetrales del Hangar (altura 26m)
    // Pared Este (x = 52)
    const eastWall = createBrush({
      size: [2.5, 26, 105],
      position: [52, 13, 65],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/metal_wall.png',
      color: 0x64748b,
      texScale: 6,
    })
    this.group.add(eastWall)
    this.addStaticBox({ position: [52, 13, 65], size: [2.5, 26, 105] })

    // Pared Sur (z = 117.5)
    const southWall = createBrush({
      size: [72, 26, 2.5],
      position: [16, 13, 117.5],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/wall_lines.png',
      texScale: 8,
    })
    this.group.add(southWall)
    this.addStaticBox({ position: [16, 13, 117.5], size: [72, 26, 2.5] })

    // Pared Norte del Hangar (con portal de entrada en x = 38)
    const northWallLeft = createBrush({
      size: [48, 26, 2.5],
      position: [4, 13, 12.5],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/wall_lines.png',
      texScale: 8,
    })
    this.group.add(northWallLeft)
    this.addStaticBox({ position: [4, 13, 12.5], size: [48, 26, 2.5] })

    const northDintel = createBrush({
      size: [24, 14, 2.5],
      position: [40, 19, 12.5],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/metal_wall.png',
      color: 0x64748b,
      texScale: 6,
    })
    this.group.add(northDintel)
    this.addStaticBox({ position: [40, 19, 12.5], size: [24, 14, 2.5] })

    // Pared Oeste del Hangar (con portal de salida en z = 85 hacia la rampa)
    const westWallNorth = createBrush({
      size: [2.5, 26, 65],
      position: [-20, 13, 45],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/wall_lines.png',
      texScale: 8,
    })
    this.group.add(westWallNorth)
    this.addStaticBox({ position: [-20, 13, 45], size: [2.5, 26, 65] })

    const westWallSouth = createBrush({
      size: [2.5, 26, 20],
      position: [-20, 13, 107.5],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/wall_lines.png',
      texScale: 8,
    })
    this.group.add(westWallSouth)
    this.addStaticBox({ position: [-20, 13, 107.5], size: [2.5, 26, 20] })

    const westDintel = createBrush({
      size: [2.5, 14, 20],
      position: [-20, 19, 87.5],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/metal_wall.png',
      color: 0x64748b,
      texScale: 6,
    })
    this.group.add(westDintel)
    this.addStaticBox({ position: [-20, 19, 87.5], size: [2.5, 14, 20] })

    // 3. Techo del Hangar a y = 26 con chapas oscuras roof_plates.png
    const roof = createBrush({
      size: [72, 1.5, 105],
      position: [16, 26, 65],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/roof_plates.png',
      color: 0x334155,
      texScale: 8,
    })
    this.group.add(roof)

    // 4. Ocho Tragaluces Luminosos en el techo con luz puntual hacia abajo
    const skylightPositions = [
      [32, 25.8, 30], [0, 25.8, 30],
      [32, 25.8, 55], [0, 25.8, 55],
      [32, 25.8, 80], [0, 25.8, 80],
      [32, 25.8, 105], [0, 25.8, 105],
    ]

    const skylightMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    for (const [sx, sy, sz] of skylightPositions) {
      const skylight = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), skylightMat)
      skylight.rotation.x = Math.PI / 2
      skylight.position.set(sx, sy, sz)
      this.group.add(skylight)

      const light = new THREE.PointLight(0xfff7ed, 3.5, 38, 1.1)
      light.position.set(sx, sy - 2.5, sz)
      this.group.add(light)
    }

    // 5. Contenedores de Carga Gigantes de Half-Life 1 [9, 9, 22]
    // Apilados en 2 niveles (y = 4.5 e y = 13.5), rojo óxido (0xb91c1c) y verde militar (0x15803d)
    const containerConfigs = [
      // Fila Este interior
      { pos: [45, 4.5, 42], color: 0xb91c1c },
      { pos: [45, 13.5, 42], color: 0x15803d },
      { pos: [45, 4.5, 68], color: 0x15803d },
      // Fila Central (fuerza el zigzag de la pista)
      { pos: [22, 4.5, 55], color: 0xb91c1c },
      { pos: [22, 13.5, 55], color: 0xb91c1c },
      { pos: [30, 4.5, 82], color: 0x15803d },
      { pos: [12, 4.5, 82], color: 0xb91c1c },
      { pos: [12, 13.5, 82], color: 0x15803d },
    ]

    for (const c of containerConfigs) {
      this._buildGiantContainer(c.pos, [9, 9, 22], c.color)
    }

    // 6. Túnel de Contenedor Abierto (de x = 14 a x = -10, z = 106, y = 0 a 7)
    this._buildOpenContainerTunnel([2, 0, 106], 24, 8, 6.5)

    // Pilas de cajas de madera con planks.png
    this._buildCrateStacks()
  }

  _buildGiantContainer(pos, size, sideColor) {
    // Caras laterales con metal_wall.png teñido
    const body = createBrush({
      size,
      position: pos,
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/metal_wall.png',
      color: sideColor,
      texScale: 6,
      metalness: 0.35,
    })
    this.group.add(body)
    this.addStaticBox({ position: pos, size })

    // Puertas con doors.png en los extremos (+Z y -Z)
    for (const zOffset of [-size[2] / 2 - 0.05, size[2] / 2 + 0.05]) {
      const doorMesh = createBrush({
        size: [size[0] * 0.96, size[1] * 0.96, 0.1],
        position: [pos[0], pos[1], pos[2] + zOffset],
        textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/doors.png',
        texScale: 4.5,
        color: sideColor,
      })
      this.group.add(doorMesh)
    }
  }

  _buildOpenContainerTunnel(center, length, width, height) {
    // Túnel horizontal por donde pasan los autos RC
    // Techo
    const roof = createBrush({
      size: [length, 0.6, width],
      position: [center[0], center[1] + height, center[2]],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/metal_wall.png',
      color: 0xb91c1c,
      texScale: 6,
    })
    this.group.add(roof)
    this.addStaticBox({ position: [center[0], center[1] + height, center[2]], size: [length, 0.6, width] })

    // Pared norte del túnel
    const northWall = createBrush({
      size: [length, height, 0.6],
      position: [center[0], center[1] + height / 2, center[2] - width / 2],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/metal_wall.png',
      color: 0xb91c1c,
      texScale: 6,
    })
    this.group.add(northWall)
    this.addStaticBox({ position: [center[0], center[1] + height / 2, center[2] - width / 2], size: [length, height, 0.6] })

    // Pared sur del túnel
    const southWall = createBrush({
      size: [length, height, 0.6],
      position: [center[0], center[1] + height / 2, center[2] + width / 2],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/metal_wall.png',
      color: 0xb91c1c,
      texScale: 6,
    })
    this.group.add(southWall)
    this.addStaticBox({ position: [center[0], center[1] + height / 2, center[2] + width / 2], size: [length, height, 0.6] })

    // Luces cálidas de emergencia dentro del túnel
    for (const dx of [-6, 6]) {
      const tunnelLight = new THREE.PointLight(0xf59e0b, 2.5, 12, 1.2)
      tunnelLight.position.set(center[0] + dx, center[1] + height - 0.8, center[2])
      this.group.add(tunnelLight)
    }
  }

  _buildCrateStacks() {
    const crateSize = [3.5, 3.5, 3.5]
    const cratePositions = [
      [36, 1.75, 20], [36, 5.25, 20],
      [42, 1.75, 95], [42, 1.75, 99], [42, 5.25, 97],
      [-5, 1.75, 92], [-5, 1.75, 88],
    ]

    for (const pos of cratePositions) {
      const crate = createBrush({
        size: crateSize,
        position: pos,
        textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/planks.png',
        texScale: 3.5,
        roughness: 0.8,
      })
      this.group.add(crate)
      this.addStaticBox({ position: pos, size: crateSize })
    }
  }

  // =========================================================================
  // ZONA 3: PASARELA ELEVADA Y PUENTE SUPERIOR (x de -15 a -48, sube a y = 5.0)
  // =========================================================================
  _buildZone3ElevatedBridge() {
    // 1. Rampa ascendente de concreto (sube de y = 0 a y = 5.0 a lo largo de 35m)
    // De z = 80 a z = 45 en x = -32 (con curvatura de aproximación desde x = -18)
    const rampLen = 35
    const rampHeight = 5.0
    const rampAngle = Math.atan2(rampHeight, rampLen)
    const rampHypot = Math.hypot(rampLen, rampHeight)
    const rampWidth = 14

    const upRampMesh = createBrush({
      size: [rampWidth, 0.6, rampHypot],
      position: [-32, rampHeight / 2, 62.5],
      rotation: [rampAngle, 0, 0],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/concrete.png',
      texScale: 6,
    })
    this.group.add(upRampMesh)
    this.addStaticBox({
      position: [-32, rampHeight / 2, 62.5],
      size: [rampWidth, 0.6, rampHypot],
      rotation: [rampAngle, 0, 0],
    })

    // 2. Terraza / Puente Industrial Elevado a y = 5.0 (de z = 45 a z = -30 en x = -40)
    const bridgeMesh = createBrush({
      size: [14, 0.8, 75],
      position: [-40, 4.6, 7.5],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/concrete.png',
      texScale: 6,
    })
    this.group.add(bridgeMesh)
    this.addStaticBox({
      position: [-40, 4.6, 7.5],
      size: [14, 0.8, 75],
    })

    // Barandillas metálicas a ambos lados de la terraza (bars.png)
    // Lado oeste (x = -47.2)
    const railWest = createBrush({
      size: [0.4, 2.2, 75],
      position: [-47.2, 5.9, 7.5],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/bars.png',
      texScale: 2.2,
      transparent: true,
    })
    this.group.add(railWest)
    this.addStaticBox({ position: [-47.2, 5.9, 7.5], size: [0.4, 2.2, 75] })

    // Lado este (x = -32.8)
    const railEast = createBrush({
      size: [0.4, 2.2, 75],
      position: [-32.8, 5.9, 7.5],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/bars.png',
      texScale: 2.2,
      transparent: true,
    })
    this.group.add(railEast)
    this.addStaticBox({ position: [-32.8, 5.9, 7.5], size: [0.4, 2.2, 75] })

    // 3. Rampa descendente (de z = -30 a z = -65, baja de y = 5.0 a y = 0.5)
    const downRampMesh = createBrush({
      size: [rampWidth, 0.6, rampHypot],
      position: [-40, rampHeight / 2, -47.5],
      rotation: [-rampAngle, 0, 0],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/concrete.png',
      texScale: 6,
    })
    this.group.add(downRampMesh)
    this.addStaticBox({
      position: [-40, rampHeight / 2, -47.5],
      size: [rampWidth, 0.6, rampHypot],
      rotation: [-rampAngle, 0, 0],
    })
  }

  // =========================================================================
  // ZONA 4: CALLEJÓN DE OBRA Y CHICANA DE LADRILLOS (z de -65 a -105)
  // =========================================================================
  _buildZone4ConstructionAlley() {
    // Piso de asfalto y tierra para la zona norte
    const alleyFloor = createBrush({
      size: [100, 1, 45],
      position: [-5, -0.5, -87.5],
      textureUrl: '/assets/textures/asphalt_diff_1k.jpg',
      texScale: 8,
    })
    this.group.add(alleyFloor)
    this.addStaticBox({ position: [-5, -0.5, -87.5], size: [100, 1, 45] })

    // Muros perimetrales norte y oeste que encierran el mapa
    const northWall = createBrush({
      size: [120, 16, 2],
      position: [-5, 8, -110],
      textureUrl: '/assets/textures/brick_diff_1k.jpg',
      texScale: 8,
    })
    this.group.add(northWall)
    this.addStaticBox({ position: [-5, 8, -110], size: [120, 16, 2] })

    const westWall = createBrush({
      size: [2, 16, 60],
      position: [-55, 8, -80],
      textureUrl: '/assets/textures/brick_diff_1k.jpg',
      texScale: 8,
    })
    this.group.add(westWall)
    this.addStaticBox({ position: [-55, 8, -80], size: [2, 16, 60] })

    // Salto suave / Kicker en x = 12, z = -92
    const jumpMesh = createBrush({
      size: [10, 0.9, 6],
      position: [12, 0.45, -92],
      rotation: [0, 0, -0.15],
      textureUrl: '/assets/packs/retro-urban-kit/Models/GLB format/Textures/metal.png',
      texScale: 3,
      color: 0xf59e0b,
    })
    this.group.add(jumpMesh)
    this.addStaticBox({
      position: [12, 0.45, -92],
      size: [10, 0.9, 6],
      rotation: [0, 0, -0.15],
    })
  }

  // =========================================================================
  // CARGA DE MODELOS 3D RETRO (Conservando texturas originales de Kenney)
  // =========================================================================
  async _loadZone1Props() {
    const basePath = '/assets/packs/retro-urban-kit/Models/GLB format/'

    // Edificios urbanos pegados en acera este (x = 54) y oeste (x = 18)
    const buildingModels = [
      'wall-a-flat-window.glb',
      'wall-a-flat-garage.glb',
      'wall-a-roof-detailed.glb',
      'wall-b-flat-window.glb',
      'wall-b-garage.glb',
    ]

    for (let z = -85; z <= 0; z += 18) {
      // Edificio Este (x = 55)
      const modelName = buildingModels[Math.abs(z) % buildingModels.length]
      await this._spawnProp(`${basePath}${modelName}`, [55, 0.25, z], 14, -Math.PI / 2)

      // Edificio Oeste (x = 14)
      await this._spawnProp(`${basePath}${modelName}`, [14, 0.25, z], 14, Math.PI / 2)
    }

    // Postes de luz dobles y árboles retro en la avenida
    await this._spawnProp(`${basePath}detail-light-double.glb`, [48, 0.25, -60], 10, -Math.PI / 2)
    await this._spawnProp(`${basePath}detail-light-double.glb`, [48, 0.25, -20], 10, -Math.PI / 2)
    await this._spawnProp(`${basePath}detail-light-double.glb`, [28, 0.25, -40], 10, Math.PI / 2)
    await this._spawnProp(`${basePath}tree-park-large.glb`, [52, 0.25, -75], 11, 0)
    await this._spawnProp(`${basePath}detail-dumpster-open.glb`, [47, 0.25, -35], 9, 0.2)

    // Camiones gigantes texturizados estacionados a escala 10x
    await this._spawnGiantTruck(`${basePath}truck-green-cargo.glb`, [45, 0, -10], 0, 10)
    await this._spawnGiantTruck(`${basePath}truck-grey-cargo.glb`, [31, 0, -50], Math.PI, 10)
    await this._spawnGiantTruck(`${basePath}truck-flat.glb`, [46, 0, 5], 0, 10)
  }

  async _loadZone2HangarProps() {
    const basePath = '/assets/packs/retro-urban-kit/Models/GLB format/'

    // Vigas metálicas transversales en el techo del hangar
    for (const z of [25, 50, 75, 100]) {
      await this._spawnProp(`${basePath}detail-beam.glb`, [16, 24, z], 14, 0)
    }

    // Pallets de madera en las esquinas
    await this._spawnProp(`${basePath}pallet.glb`, [40, 0, 25], 8, 0.3)
    await this._spawnProp(`${basePath}pallet.glb`, [40, 1.5, 25], 8, -0.2)
  }

  async _loadZone3BridgeProps() {
    const basePath = '/assets/packs/retro-urban-kit/Models/GLB format/'

    // Andamios estructurales soportando la pasarela desde abajo (y = 0)
    for (const z of [30, 10, -10]) {
      await this._spawnProp(`${basePath}scaffolding-structure.glb`, [-40, 0, z], 12, 0)
    }

    // Barreras metálicas en los accesos
    await this._spawnProp(`${basePath}detail-barrier-strong-type-a.glb`, [-46, 5.0, 35], 8, 0)
    await this._spawnProp(`${basePath}detail-barrier-strong-type-a.glb`, [-46, 5.0, -20], 8, 0)
  }

  async _loadZone4AlleyProps() {
    const basePath = '/assets/packs/retro-urban-kit/Models/GLB format/'

    // Escombros, paredes rotas y ladrillos
    await this._spawnProp(`${basePath}wall-broken-type-a.glb`, [-25, 0, -82], 12, 0.3)
    await this._spawnProp(`${basePath}detail-bricks-type-a.glb`, [-15, 0, -80], 9, -0.4)
    await this._spawnProp(`${basePath}planks.glb`, [0, 0, -96], 8, 0.1)
    await this._spawnProp(`${basePath}detail-barrier-strong-damaged.glb`, [20, 0, -96], 9, 0)
  }

  async _spawnProp(url, pos, scale = 1, rotY = 0) {
    try {
      const gltf = await this._loader.loadAsync(url)
      const scene = gltf.scene.clone(true)
      scene.position.set(pos[0], pos[1], pos[2])
      scene.rotation.y = rotY
      scene.scale.set(scale, scale, scale)

      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      this.group.add(scene)
    } catch (e) {
      console.warn(`Error al cargar prop ${url}:`, e)
    }
  }

  async _spawnGiantTruck(url, pos, rotY, scale) {
    try {
      const gltf = await this._loader.loadAsync(url)
      const truck = gltf.scene.clone(true)
      truck.position.set(pos[0], pos[1], pos[2])
      truck.rotation.y = rotY
      truck.scale.set(scale, scale, scale)

      truck.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      this.group.add(truck)

      // Colisión sólida de camión gigante
      this.addStaticBox({
        position: [pos[0], 4.5, pos[2]],
        size: [5.5, 8.5, 14],
        rotation: [0, rotY, 0],
      })
    } catch (e) {
      console.warn(`Error cargando camión gigante ${url}:`, e)
    }
  }

  // =========================================================================
  // WAYPOINTS 3D (34 PUNTOS CON CAMBIOS REALES DE ELEVACIÓN Y) & CHECKPOINTS
  // =========================================================================
  _setupWaypointsAndCheckpoints() {
    this.waypoints = [
      // ZONA 1: Avenida Industrial (Recta Este, y = 0.5)
      [38, 0.5, -80], // 0: Salida / Meta
      [38, 0.5, -60], // 1
      [38, 0.5, -40], // 2
      [38, 0.5, -20], // 3
      [38, 0.5, 0],   // 4
      [38, 0.5, 15],  // 5: Entrada al Hangar

      // ZONA 2: Hangar Militar Half-Life 1 (Zigzag entre contenedores gigantes)
      [38, 0.5, 35],  // 6
      [33, 0.5, 55],  // 7: Zigzag hacia centro
      [24, 0.5, 75],  // 8
      [32, 0.5, 95],  // 9: Curva sur en el fondo del hangar
      [20, 0.5, 106], // 10: Alineación con el túnel
      [5, 0.5, 106],  // 11: Dentro del túnel de contenedor
      [-8, 0.5, 106], // 12: Saliendo del túnel
      [-16, 0.5, 95], // 13: Salida oeste del hangar

      // ZONA 3: Rampa ascendente y Pasarela / Puente Elevado
      [-24, 0.8, 80], // 14: Inicio de la rampa
      [-32, 2.5, 62], // 15: Mitad de la rampa (y = 2.5)
      [-40, 5.2, 45], // 16: Cima en la terraza (y = 5.2)
      [-40, 5.5, 30], // 17: Sobre el puente elevado
      [-40, 5.5, 15], // 18
      [-40, 5.5, 0],  // 19: Vista panorámica superior
      [-40, 5.5, -15],// 20
      [-40, 5.5, -30],// 21: Llegada a la rampa de bajada
      [-40, 3.8, -42],// 22: Descenso en rampa
      [-40, 2.0, -54],// 23: Descenso en rampa
      [-40, 0.8, -65],// 24: Llegada a ras de suelo

      // ZONA 4: Callejón de Obra, Chicana de Ladrillos y Salto
      [-36, 0.5, -78], // 25: Callejón de escombros
      [-26, 0.5, -88], // 26
      [-12, 0.5, -80], // 27: Chicana técnica de ladrillos
      [0, 0.5, -92],   // 28: Curva hacia el salto
      [12, 1.2, -92],  // 29: Salto suave / Kicker en el aire
      [22, 0.5, -92],  // 30: Aterrizaje
      [30, 0.5, -90],  // 31: Enlace a recta principal
      [36, 0.5, -88],  // 32
      [38, 0.5, -84],  // 33: Entrada a recta final
    ]

    this.setCheckpoints([
      { pos: [38, 1.2, -80], radius: 16 }, // CP 0: Meta
      { pos: [38, 1.2, -20], radius: 16 }, // CP 1: Recta Este
      { pos: [38, 1.2, 35], radius: 16 },  // CP 2: Entrada Hangar
      { pos: [24, 1.2, 75], radius: 16 },  // CP 3: Zigzag Contenedores
      { pos: [5, 1.2, 106], radius: 16 },  // CP 4: Túnel Contenedor
      { pos: [-32, 2.8, 62], radius: 18 }, // CP 5: Rampa de Subida
      { pos: [-40, 6.0, 0], radius: 16 },  // CP 6: Puente Elevado a Y = 5.0
      { pos: [-36, 1.2, -78], radius: 18 },// CP 7: Callejón de Obra
      { pos: [12, 1.5, -92], radius: 16 }, // CP 8: Salto y Entrada a Meta
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
