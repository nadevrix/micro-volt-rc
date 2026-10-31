import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { createReVoltSkyTexture } from '../utils/ProceduralTextures.js'

/**
 * BaseMap - Clase base común para mapas de Micro-Volt RC.
 * Gestiona colisiones estáticas, carga de modelos, waypoints y sistema de checkpoints anti-trampas.
 */
export class BaseMap {
  constructor({ scene, physicsWorld, onLapCompleted }) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.onLapCompleted = onLapCompleted

    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.physicsBodies = []
    this.waypoints = []
    this.checkpoints = []
    this.currentCheckpointIndex = 0

    this.spawnPosition = new CANNON.Vec3(0, 1.5, 0)
    this.spawnQuaternion = new CANNON.Quaternion()

    this.isReady = false
  }

  /**
   * Cúpula de Cielo Estilo Re-Volt 1999 (SphereGeometry 600, 32, 24 invertida).
   * Proporciona un cielo azul vibrante con nubes esponjosas en alto contraste para evitar cualquier horizonte vacío.
   */
  buildReVoltSkyDome(radius = 600) {
    const skyTexture = createReVoltSkyTexture(2048, 1024)
    const skyGeo = new THREE.SphereGeometry(radius, 32, 24)
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      depthWrite: false,
    })
    const skyMesh = new THREE.Mesh(skyGeo, skyMat)
    skyMesh.name = 'ReVoltSkyDome'
    this.group.add(skyMesh)
    return skyMesh
  }

  /**
   * Crea un cuerpo estático cúbico y actualiza obligatoriamente su AABB.
   */
  addStaticBox({
    position = [0, 0, 0],
    size = [1, 1, 1],
    rotation = [0, 0, 0],
    material = null,
    visibleMesh = null,
  }) {
    const halfExtents = new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2)
    const shape = new CANNON.Box(halfExtents)

    const body = new CANNON.Body({
      mass: 0,
      material: material || this.physicsWorld.defaultMaterial,
    })
    body.addShape(shape)
    body.position.set(position[0], position[1], position[2])

    if (rotation[0] || rotation[1] || rotation[2]) {
      const euler = new CANNON.Vec3(rotation[0], rotation[1], rotation[2])
      body.quaternion.setFromEuler(euler.x, euler.y, euler.z)
    }

    // Regla obligatoria: cannon-es requiere updateAABB tras posicionar cuerpos estáticos
    body.updateAABB()
    this.physicsWorld.addBody(body)
    this.physicsBodies.push(body)

    if (visibleMesh) {
      visibleMesh.position.set(position[0], position[1], position[2])
      visibleMesh.rotation.set(rotation[0], rotation[1], rotation[2])
      this.group.add(visibleMesh)
    }

    return body
  }

  /**
   * Configura la lista de checkpoints secuenciales del circuito.
   */
  setCheckpoints(pointsWithRadius) {
    this.checkpoints = pointsWithRadius.map((cp, idx) => ({
      index: idx,
      position: new THREE.Vector3(cp.pos[0], cp.pos[1], cp.pos[2]),
      radius: cp.radius || 12,
    }))
    this.currentCheckpointIndex = 0
  }

  /**
   * Actualiza el progreso de checkpoints y detecta vueltas válidas.
   */
  update(delta, vehiclePosition) {
    if (!this.checkpoints.length || !vehiclePosition) return

    const nextCp = this.checkpoints[this.currentCheckpointIndex]
    const distSq = vehiclePosition.distanceToSquared(nextCp.position)

    if (distSq <= nextCp.radius * nextCp.radius) {
      // Avanzar al siguiente checkpoint
      this.currentCheckpointIndex++

      // Si completó todos los checkpoints del circuito y vuelve a la meta:
      if (this.currentCheckpointIndex >= this.checkpoints.length) {
        this.currentCheckpointIndex = 0
        if (this.onLapCompleted) {
          this.onLapCompleted()
        }
      }
    }
  }

  /**
   * Limpieza exhaustiva de geometrías, materiales y cuerpos físicos al cambiar de mapa.
   */
  dispose() {
    for (const body of this.physicsBodies) {
      this.physicsWorld.removeBody(body)
    }
    this.physicsBodies.length = 0

    this.group.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose()
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((m) => {
            m.map?.dispose()
            m.dispose()
          })
        }
      }
    })

    this.group.removeFromParent()
  }
}
