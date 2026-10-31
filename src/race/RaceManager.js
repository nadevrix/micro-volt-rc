import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { AIRacer, AI_RACER_CONFIGS } from '../ai/AIRacer.js'

/**
 * RaceManager - Gestiona la carrera completa:
 * - 6 corredores (Jugador + 5 Rivales IA en parrilla escalonada)
 * - Progreso exacto en el circuito mediante proyección en waypoints
 * - Clasificación en tiempo real (1st a 6th)
 * - Diferencia en metros con el auto inmediatamente adelante y atrás
 * - 4 cronómetros en formato MM:SS:mmm (Lap, Last Lap, Best Lap, Race)
 */
export class RaceManager {
  constructor({ scene, physicsWorld, glbReflectionMap, playerVehicle, hud }) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.glbReflectionMap = glbReflectionMap
    this.playerVehicle = playerVehicle
    this.hud = hud

    this.aiRacers = []
    this.racers = [] // [player, ...ai]

    this.waypoints = []
    this.segmentLengths = []
    this.cumDistances = []
    this.totalCircuitLength = 100

    this.totalLaps = 3
    this.isRaceActive = false

    // 4 cronómetros en milisegundos
    this.raceStartTime = 0
    this.currentLapStartTime = 0
    this.lastLapTimeMs = 0 // Inicializado en 00:00:000
    this.bestLapTimeMs = 5 * 60 * 1000 // Inicializado en 05:00:000
    this.currentLapTimeMs = 0
    this.totalRaceTimeMs = 0

    this._initAIRacers()
  }

  _initAIRacers() {
    this.aiRacers = AI_RACER_CONFIGS.map((config) => {
      return new AIRacer({
        scene: this.scene,
        physicsWorld: this.physicsWorld,
        glbReflectionMap: this.glbReflectionMap,
        config,
      })
    })

    // Lista unificada de los 6 corredores
    this.racers = [
      {
        id: 'player',
        name: this.playerVehicle.name || 'Tú',
        vehicle: this.playerVehicle,
        isPlayer: true,
        currentLap: 1,
        lapProgress: 0,
        totalProgress: 0,
        rank: 1,
      },
      ...this.aiRacers.map((ai, index) => ({
        id: `ai_${index}`,
        name: ai.name,
        vehicle: ai.vehicle,
        aiInstance: ai,
        isPlayer: false,
        currentLap: 1,
        lapProgress: 0,
        totalProgress: 0,
        rank: index + 2,
      })),
    ]
  }

  /**
   * Configura la pista actual, precomputa longitudes de waypoints y coloca los 6 autos en la grilla.
   */
  setTrack(map) {
    if (!map || !map.waypoints || map.waypoints.length === 0) return

    this.waypoints = map.waypoints
    this._computeTrackMetrics()

    // Sincronizar waypoints con cada IA (apuntando al waypoint 1 hacia la primera curva)
    for (const ai of this.aiRacers) {
      ai.setWaypoints(this.waypoints, 1)
    }

    // Posicionar los 6 autos en la parrilla de salida
    this.setupGrid(map.spawnPosition, map.spawnQuaternion)

    // Iniciar / reiniciar cronómetros
    this.resetTimers()
  }

  _computeTrackMetrics() {
    const n = this.waypoints.length
    this.segmentLengths = []
    this.cumDistances = [0]
    let total = 0

    for (let i = 0; i < n; i++) {
      const p1 = this.waypoints[i]
      const p2 = this.waypoints[(i + 1) % n]
      const dist = Math.hypot(p2[0] - p1[0], (p2[1] || 0.5) - (p1[1] || 0.5), p2[2] - p1[2])
      this.segmentLengths.push(dist)
      total += dist
      if (i < n - 1) {
        this.cumDistances.push(total)
      }
    }
    this.totalCircuitLength = total
  }

  /**
   * Coloca los 6 autos en la parrilla de salida en 3 filas escalonadas de 2.
   * Coincide exactamente con las marcas de cajones #1 a #6 del FinishLineArch.
   */
  setupGrid(spawnPos, spawnQuat) {
    // Vector adelante y derecha según la rotación de salida
    const fwd = new CANNON.Vec3(0, 0, 1)
    spawnQuat.vmult(fwd, fwd)

    const right = new CANNON.Vec3(1, 0, 0)
    spawnQuat.vmult(right, right)

    // Formación de grilla (Filas de 2):
    // Fila 0: Jugador (izq, #1), Pole Poz (der, #2)
    // Fila 1: Volt-54 (izq, #3), Adeon (der, #4)
    // Fila 2: Sparky (izq, #5), Phantom (der, #6)
    const gridLayout = [
      { col: -1, row: 0 },
      { col: 1, row: 0 },
      { col: -1, row: 1 },
      { col: 1, row: 1 },
      { col: -1, row: 2 },
      { col: 1, row: 2 },
    ]

    const lateralSpacing = 2.6
    const rowSpacing = 6.5
    const initialGridOffset = 4.5

    for (let i = 0; i < this.racers.length; i++) {
      const racer = this.racers[i]
      const slot = gridLayout[i] || { col: 0, row: i }

      const distBack = initialGridOffset + slot.row * rowSpacing
      const x = spawnPos.x + right.x * (slot.col * lateralSpacing) - fwd.x * distBack
      const y = spawnPos.y
      const z = spawnPos.z + right.z * (slot.col * lateralSpacing) - fwd.z * distBack

      racer.vehicle.chassisBody.position.set(x, y, z)
      racer.vehicle.chassisBody.quaternion.copy(spawnQuat)
      racer.vehicle.chassisBody.velocity.setZero()
      racer.vehicle.chassisBody.angularVelocity.setZero()
      racer.vehicle.clearTireMarks?.()

      racer.currentLap = 1
      racer.lapProgress = 0
      racer.totalProgress = 0

      if (racer.aiInstance) {
        racer.aiInstance.currentLap = 1
        racer.aiInstance.stuckTimer = 0
        racer.aiInstance.targetWaypointIndex = 1
        racer.aiInstance.isLocked = true
      }
    }
  }

  setCountdownState(step) {
    if (step === 'GO') {
      this.isCountingDown = false
      this.isRaceActive = true
      this.resetTimers()
      this.playerVehicle.input.handbrake = false
      for (const ai of this.aiRacers) {
        ai.isLocked = false
        ai.stuckTimer = 0
        ai.targetWaypointIndex = 1
        ai.vehicle.input.handbrake = false
        ai.vehicle.input.forward = true
        ai.vehicle.input.throttleAxis = 1.0 * ai.config.topSpeedFactor
      }
    } else if (step !== null) {
      this.isCountingDown = true
      this.isRaceActive = false
      this.playerVehicle.input.handbrake = true
      for (const ai of this.aiRacers) {
        ai.isLocked = true
        ai.stuckTimer = 0
        ai.vehicle.input.handbrake = true
        ai.vehicle.input.forward = false
        ai.vehicle.input.throttleAxis = 0
        ai.vehicle.chassisBody.velocity.setZero()
        ai.vehicle.chassisBody.angularVelocity.setZero()
      }
    }
  }

  resetTimers() {
    const now = performance.now()
    this.raceStartTime = now
    this.currentLapStartTime = now
    this.lastLapTimeMs = 0
    this.bestLapTimeMs = 5 * 60 * 1000 // 05:00:000
    this.isRaceActive = true
  }

  onPlayerLapCompleted() {
    const now = performance.now()
    const lapTime = now - this.currentLapStartTime
    this.lastLapTimeMs = lapTime
    if (lapTime < this.bestLapTimeMs) {
      this.bestLapTimeMs = lapTime
    }
    this.currentLapStartTime = now

    const playerRacer = this.racers.find((r) => r.isPlayer)
    if (playerRacer) {
      playerRacer.currentLap++
      if (playerRacer.currentLap > this.totalLaps) {
        this.isRaceActive = false
        const results = this.racers.map((r) => ({
          ...r,
          totalTime: this.formatTimeMs(this.totalRaceTimeMs),
          bestLap: this.formatTimeMs(
            r.isPlayer
              ? this.bestLapTimeMs
              : Math.max(12000, this.bestLapTimeMs + (r.rank - 1) * 950)
          ),
        }))
        if (this.onRaceFinished) {
          this.onRaceFinished(results)
        } else {
          this.hud?.showFinishScreen(results)
        }
      }
    }
  }

  update(delta, powerUpManager = null) {
    if (!this.waypoints || this.waypoints.length === 0) return

    // 1. Actualizar IA rivals
    for (const ai of this.aiRacers) {
      ai.update(delta, powerUpManager)
    }

    // 2. Calcular progreso en pista de cada corredor
    for (const racer of this.racers) {
      const pos = racer.vehicle.chassisBody.position
      racer.lapProgress = this._getTrackProgress(pos.x, pos.y, pos.z)
      // Progreso total en metros: (lap * circuito) + avance en la vuelta
      racer.totalProgress = ((racer.currentLap - 1) * this.totalCircuitLength) + racer.lapProgress
    }

    // 3. Ordenar corredores de 1st a 6th
    const sorted = [...this.racers].sort((a, b) => b.totalProgress - a.totalProgress)
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].rank = i + 1
    }

    // 4. Calcular diferencias con auto inmediatamente adelante y atrás del jugador
    const playerRacer = this.racers.find((r) => r.isPlayer)
    const playerIndexInRank = sorted.findIndex((r) => r.isPlayer)

    let aheadText = ''
    let behindText = ''

    if (playerIndexInRank > 0) {
      const aheadRacer = sorted[playerIndexInRank - 1]
      const diffMeters = Math.max(1, Math.round(aheadRacer.totalProgress - playerRacer.totalProgress))
      aheadText = `-${diffMeters}m ${aheadRacer.name}`
    }

    if (playerIndexInRank < sorted.length - 1) {
      const behindRacer = sorted[playerIndexInRank + 1]
      const diffMeters = Math.max(1, Math.round(playerRacer.totalProgress - behindRacer.totalProgress))
      behindText = `+${diffMeters}m ${behindRacer.name}`
    }

    // 5. Actualizar los 4 cronómetros
    const now = performance.now()
    if (this.isRaceActive) {
      this.currentLapTimeMs = now - this.currentLapStartTime
      this.totalRaceTimeMs = now - this.raceStartTime
    }

    // 6. Enviar información al HUD
    if (this.hud) {
      this.hud.updateRaceStats({
        position: playerRacer.rank,
        aheadText,
        behindText,
        lapTime: this.formatTimeMs(this.currentLapTimeMs),
        lastLapTime: this.formatTimeMs(this.lastLapTimeMs),
        bestLapTime: this.formatTimeMs(this.bestLapTimeMs),
        raceTime: this.formatTimeMs(this.totalRaceTimeMs),
        currentLap: playerRacer.currentLap,
        totalLaps: this.totalLaps,
        inventory: playerRacer.vehicle.inventory,
      })
    }
  }

  /**
   * Proyecta la posición del auto sobre el circuito de waypoints para obtener la distancia recorrida en 3D.
   */
  _getTrackProgress(px, py = 0.5, pz = 0) {
    let bestDistSq = Infinity
    let bestProgress = 0
    const n = this.waypoints.length

    for (let i = 0; i < n; i++) {
      const p1 = this.waypoints[i]
      const p2 = this.waypoints[(i + 1) % n]
      const segLen = this.segmentLengths[i]
      if (segLen === 0) continue

      const p1y = p1[1] || 0.5
      const p2y = p2[1] || 0.5

      const vx = p2[0] - p1[0]
      const vy = p2y - p1y
      const vz = p2[2] - p1[2]

      const ux = px - p1[0]
      const uy = py - p1y
      const uz = pz - p1[2]

      const t = THREE.MathUtils.clamp((ux * vx + uy * vy + uz * vz) / (segLen * segLen), 0, 1)
      const projX = p1[0] + t * vx
      const projY = p1y + t * vy
      const projZ = p1[2] + t * vz

      const distSq = (px - projX) ** 2 + (py - projY) ** 2 + (pz - projZ) ** 2
      if (distSq < bestDistSq) {
        bestDistSq = distSq
        bestProgress = this.cumDistances[i] + t * segLen
      }
    }

    return bestProgress
  }

  /**
   * Formatea milisegundos en formato MM:SS:mmm (ej. 00:13:313)
   */
  formatTimeMs(ms) {
    if (!Number.isFinite(ms) || ms < 0) return '00:00:000'
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const millis = Math.floor(ms % 1000)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(millis).padStart(3, '0')}`
  }

  /**
   * Obtiene el siguiente waypoint objetivo hacia el cual debe apuntar la flecha del HUD.
   */
  getNextWaypointForPlayer() {
    if (!this.waypoints || this.waypoints.length === 0) return null
    const pos = this.playerVehicle.chassisBody.position
    const n = this.waypoints.length
    let bestDistSq = Infinity
    let bestIdx = 0
    for (let i = 0; i < n; i++) {
      const wp = this.waypoints[i]
      const dSq = (pos.x - wp[0]) ** 2 + (pos.z - wp[2]) ** 2
      if (dSq < bestDistSq) {
        bestDistSq = dSq
        bestIdx = i
      }
    }
    return this.waypoints[(bestIdx + 1) % n]
  }

  destroy() {
    for (const ai of this.aiRacers) {
      ai.destroy()
    }
    this.aiRacers = []
    this.racers = []
  }
}
