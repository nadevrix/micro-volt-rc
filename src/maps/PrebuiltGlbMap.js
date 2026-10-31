import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { BaseMap } from './BaseMap.js'
import { enhanceMapMaterials } from '../utils/GoldSrcTextureHelper.js'

const sharedDracoLoader = new DRACOLoader()
if (typeof window !== 'undefined') {
  sharedDracoLoader.setDecoderPath('/draco/')
}

/**
 * PrebuiltGlbMap - Cargador universal de circuitos .GLB completos modelados en Blender.
 * Carga geometría visual preservando 100% materiales originales de fábrica,
 * genera colisiones automáticas CANNON.Trimesh con chunking seguro contra desbordamiento de vértices,
 * y configura la grilla de salida, waypoints de IA y checkpoints anti-trampas.
 */
export class PrebuiltGlbMap extends BaseMap {
  constructor({ scene, physicsWorld, onLapCompleted, config }) {
    super({ scene, physicsWorld, onLapCompleted })

    this.name = config.name
    this.tag = config.tag || 'CIRCUITO OFICIAL'
    this.desc = config.desc || ''
    this.config = config

    this.glbUrl = config.glbUrl
    this.scale = config.scale || 1.0
    this.offsetY = config.offsetY || 0.0
    this.useDraco = !!config.useDraco
    this.hasOwnSky = !!config.hasOwnSky

    this.waypoints = config.waypoints || []
    if (config.checkpoints) {
      this.setCheckpoints(config.checkpoints)
    }

    if (config.spawnPosition) {
      this.spawnPosition.set(config.spawnPosition[0], config.spawnPosition[1], config.spawnPosition[2])
    }
    if (config.spawnRotationY !== undefined) {
      this.spawnQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), config.spawnRotationY)
    }

    this.circuitModel = null
    this.colliderBody = null

    this.ready = this._load()
  }

  async _load() {
    if (!this.hasOwnSky) {
      this.buildReVoltSkyDome(800)
    }

    const loader = new GLTFLoader()
    if (this.useDraco) {
      loader.setDRACOLoader(sharedDracoLoader)
    }

    try {
      const gltf = await loader.loadAsync(this.glbUrl)
      const root = gltf.scene

      root.scale.setScalar(this.scale)
      root.position.y = this.offsetY
      root.updateMatrixWorld(true)

      // 1. Aplicar texturas fotográficas GoldSrc y sombras
      enhanceMapMaterials(this.config.id, root)

      root.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })

      this.group.add(root)
      this.circuitModel = root

      // 2. Generar colisiones automáticas CANNON.Trimesh desde la geometría del GLB
      this._generateTrimeshColliders(root)

      this.isReady = true
      console.log(`[PrebuiltGlbMap] "${this.name}" cargado exitosamente con ${this.physicsBodies.length} cuerpos de colisión.`)
    } catch (err) {
      console.error(`[PrebuiltGlbMap] Error cargando circuito GLB "${this.glbUrl}":`, err)
    }
  }

  /**
   * Recorre las mallas visuales del circuito y construye formas CANNON.Trimesh.
   * Divide mallas grandes en trozos de 4,000 triángulos para garantizar que
   * ningún Trimesh exceda los 32,767 vértices de Int16Array de cannon-es.
   */
  _generateTrimeshColliders(root) {
    const body = new CANNON.Body({
      mass: 0,
      material: this.physicsWorld.defaultMaterial,
    })

    let shapeCount = 0
    const nonCollidingNames = ['cloud', 'bird', 'blade', 'water', 'sky', 'light', 'camera']

    root.traverse((child) => {
      if (!child.isMesh || !child.geometry) return

      const meshName = (child.name || '').toLowerCase()
      if (nonCollidingNames.some((nc) => meshName.includes(nc))) {
        return // Ignorar nubes, pájaros decorativos o hélices
      }

      shapeCount += this._addMeshTrimeshShapes(body, child)
    })

    if (shapeCount > 0) {
      body.updateAABB()
      this.physicsWorld.addBody(body)
      this.physicsBodies.push(body)
      this.colliderBody = body
    } else {
      console.warn(`[PrebuiltGlbMap] No se generaron formas Trimesh para "${this.name}". Creando plano de suelo de emergencia.`)
      this.addStaticBox({
        position: [0, this.offsetY - 0.5, 0],
        size: [1000, 1, 1000],
      })
    }
  }

  _addMeshTrimeshShapes(body, mesh) {
    const geom = mesh.geometry
    const posAttr = geom.attributes.position
    if (!posAttr || posAttr.count < 3) return 0

    const indexAttr = geom.index
    const totalTriangles = indexAttr ? indexAttr.count / 3 : posAttr.count / 3
    const CHUNK_SIZE = 4000 // 4,000 triángulos = 12,000 vértices (siempre < 32,767)

    let shapesAdded = 0
    const v = new THREE.Vector3()

    for (let triOffset = 0; triOffset < totalTriangles; triOffset += CHUNK_SIZE) {
      const triEnd = Math.min(triOffset + CHUNK_SIZE, totalTriangles)
      const triCount = triEnd - triOffset
      const vertices = new Array(triCount * 9)
      const indices = new Array(triCount * 3)

      for (let t = 0; t < triCount; t++) {
        const triIdx = triOffset + t
        for (let c = 0; c < 3; c++) {
          const vertIdx = indexAttr ? indexAttr.getX(triIdx * 3 + c) : (triIdx * 3 + c)
          v.fromBufferAttribute(posAttr, vertIdx).applyMatrix4(mesh.matrixWorld)
          const baseV = (t * 3 + c) * 3
          vertices[baseV] = v.x
          vertices[baseV + 1] = v.y
          vertices[baseV + 2] = v.z
          indices[t * 3 + c] = t * 3 + c
        }
      }

      body.addShape(new CANNON.Trimesh(vertices, indices))
      shapesAdded++
    }

    return shapesAdded
  }
}
