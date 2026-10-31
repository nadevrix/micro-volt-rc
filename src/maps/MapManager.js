import * as THREE from 'three'
import { TRACK_CONFIGS } from './tracksConfig.js'
import { PrebuiltGlbMap } from './PrebuiltGlbMap.js'

/**
 * MapManager - Administrador de circuitos oficiales para Micro-Volt RC.
 * Gestiona luces, sombras, intercambio dinámico entre los 3 circuitos oficiales,
 * reposicionamiento del auto, sincronización con el HUD y Arco de Meta 3D.
 */
export class MapManager {
  constructor({ scene, physicsWorld, vehicle, hud, raceManager, powerUpManager, onMapLoaded }) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.vehicle = vehicle
    this.hud = hud
    this.raceManager = raceManager
    this.powerUpManager = powerUpManager
    this.onMapLoaded = onMapLoaded

    this.trackConfigs = TRACK_CONFIGS
    this.currentMapIndex = 0
    this.currentMap = null

    this.environmentParams = {
      offsetY: 0,
    }

    this._createLights()
  }

  _createLights() {
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 1.8)
    this.scene.add(hemi)
    this.hemi = hemi

    const sun = new THREE.DirectionalLight(0xfffbeb, 2.4)
    sun.position.set(40, 60, 20)
    sun.castShadow = true

    const isCoarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
    const mapSize = isCoarse ? 2048 : 4096
    sun.shadow.mapSize.set(mapSize, mapSize)
    sun.shadow.camera.left = -90
    sun.shadow.camera.right = 90
    sun.shadow.camera.top = 90
    sun.shadow.camera.bottom = -90
    sun.shadow.camera.far = 400
    sun.shadow.bias = -0.0001
    sun.shadow.normalBias = 0.02
    sun.shadow.radius = 2.5
    this.scene.add(sun)
    this.sun = sun
  }

  async loadMap(index = 0) {
    if (this.currentMap) {
      this.currentMap.dispose()
      this.currentMap = null
    }

    this.currentMapIndex = index % this.trackConfigs.length
    const config = this.trackConfigs[this.currentMapIndex]

    const onLapCompleted = () => {
      if (this.hud) {
        this.hud.onLapComplete()
      }
      if (this.raceManager) {
        this.raceManager.onPlayerLapCompleted()
      }
    }

    if (config.mapClass) {
      this.currentMap = new config.mapClass({
        scene: this.scene,
        physicsWorld: this.physicsWorld,
        onLapCompleted,
      })
    } else {
      this.currentMap = new PrebuiltGlbMap({
        scene: this.scene,
        physicsWorld: this.physicsWorld,
        onLapCompleted,
        config,
      })
    }

    if (this.currentMap.ready) {
      await this.currentMap.ready
    }

    if (this.hud) {
      this.hud.setMapName(this.currentMap.name)
      this.hud.reset()
    }

    // Configurar cajas de armas en el circuito actual
    if (this.powerUpManager) {
      this.powerUpManager.setupMapBoxes(this.currentMapIndex)
    }

    // Configurar métricas y grilla de salida de los 6 corredores
    if (this.raceManager) {
      this.raceManager.setTrack(this.currentMap)
    } else if (this.vehicle) {
      this.vehicle.spawnPosition.copy(this.currentMap.spawnPosition)
      this.vehicle.spawnQuaternion.copy(this.currentMap.spawnQuaternion)
      this.vehicle.respawn()
      this.vehicle.clearTireMarks?.()
    }

    if (this.onMapLoaded) {
      this.onMapLoaded(this.currentMap)
    }

    console.log(`[MapManager] Circuito cargado: ${this.currentMap.name}`)
    return this.currentMap
  }

  switchMap(index) {
    if (index === this.currentMapIndex) return
    return this.loadMap(index)
  }

  nextMap() {
    const nextIndex = (this.currentMapIndex + 1) % this.trackConfigs.length
    return this.switchMap(nextIndex)
  }

  setCountdownState(step) {
    if (this.currentMap?.finishArch) {
      this.currentMap.finishArch.setCountdownState(step)
    }
  }

  triggerCelebration() {
    if (this.currentMap?.triggerCelebration) {
      this.currentMap.triggerCelebration()
    }
  }

  applyEnvironmentParams() {
    if (this.currentMap && this.currentMap.circuitModel) {
      this.currentMap.circuitModel.position.y = this.environmentParams.offsetY
    }
  }

  update(delta) {
    if (!this.currentMap) return

    const carPos = this.vehicle?.group?.position
    if (carPos) {
      this.currentMap.update(delta, carPos)
    }
  }
}
