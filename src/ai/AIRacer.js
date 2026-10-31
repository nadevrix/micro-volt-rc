import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Vehicle } from '../Vehicle.js'
import { CAR_PRESETS } from '../vehicles/carPresets.js'

/**
 * Configuraciones únicas para los 5 rivales IA con liveries oficiales de Buggy RC.
 */
export const AI_RACER_CONFIGS = [
  {
    name: 'POLE POZ',
    preset: CAR_PRESETS[1],
    steerAgility: 3.2,
    cornerSlowdown: 0.45,
    topSpeedFactor: 1.0,
  },
  {
    name: 'VOLT-54',
    preset: CAR_PRESETS[2],
    steerAgility: 2.8,
    cornerSlowdown: 0.50,
    topSpeedFactor: 0.96,
  },
  {
    name: 'ADEON',
    preset: CAR_PRESETS[3],
    steerAgility: 3.0,
    cornerSlowdown: 0.44,
    topSpeedFactor: 0.97,
  },
  {
    name: 'SPARKY',
    preset: CAR_PRESETS[4],
    steerAgility: 2.9,
    cornerSlowdown: 0.46,
    topSpeedFactor: 0.98,
  },
  {
    name: 'PHANTOM',
    preset: CAR_PRESETS[5],
    steerAgility: 3.1,
    cornerSlowdown: 0.42,
    topSpeedFactor: 0.99,
  },
]

export class AIRacer {
  constructor({ scene, physicsWorld, glbReflectionMap, config, waypoints = [] }) {
    this.name = config.name
    this.config = config
    this.waypoints = waypoints
    this.targetWaypointIndex = 0

    const preset = config.preset || CAR_PRESETS[1]

    // Instancia de vehículo físico completo (misma física de RaycastVehicle)
    this.vehicle = new Vehicle(scene, physicsWorld, glbReflectionMap, null, {
      isPlayer: false,
      name: config.name,
      preset: preset,
      color: preset.colorHex,
      carUrl: preset.url,
      racerNumber: preset.dorsal,
    })

    this.currentLap = 1
    this.stuckTimer = 0
    this.reversingTimer = 0
    this.useWeaponTimer = 1.0 + Math.random() * 3.0
    this.isLocked = false

    this._tmpDir = new CANNON.Vec3()
    this._tmpRight = new CANNON.Vec3()
    this._tmpTarget = new THREE.Vector3()
  }

  setWaypoints(waypoints, startIndex = 1) {
    this.waypoints = waypoints
    this.targetWaypointIndex = startIndex % Math.max(1, waypoints.length)
  }

  update(delta, powerUpManager = null) {
    if (this.isLocked) {
      this.vehicle.input.forward = false
      this.vehicle.input.backward = false
      this.vehicle.input.left = false
      this.vehicle.input.right = false
      this.vehicle.input.throttleAxis = 0
      this.vehicle.input.steerAxis = 0
      this.vehicle.input.handbrake = true
      this.vehicle.chassisBody.velocity.setZero()
      this.vehicle.chassisBody.angularVelocity.setZero()
      this.vehicle.update(delta)
      return
    }

    if (!this.waypoints || this.waypoints.length === 0) return

    const pos = this.vehicle.chassisBody.position
    const speed = this.vehicle.speedKmh
    const targetWp = this.waypoints[this.targetWaypointIndex]

    if (!targetWp) return

    // 1. Detección de paso por waypoint en 3D
    const dx = targetWp[0] - pos.x
    const dy = (targetWp[1] !== undefined ? targetWp[1] : 0.5) - pos.y
    const dz = targetWp[2] - pos.z
    const distToWp = Math.hypot(dx, dy, dz)

    const reachRadius = 9.5
    if (distToWp < reachRadius) {
      this.targetWaypointIndex = (this.targetWaypointIndex + 1) % this.waypoints.length
    }

    // 2. Anti-stuck (si velocidad < 2 km/h por más de 2.5s)
    if (speed < 2.0) {
      this.stuckTimer += delta
    } else {
      this.stuckTimer = 0
    }

    if (this.stuckTimer > 2.5) {
      if (this.stuckTimer < 4.2) {
        // Fase de reversa automática
        this.vehicle.input.forward = false
        this.vehicle.input.backward = true
        this.vehicle.input.throttleAxis = -1.0
        this.vehicle.input.steerAxis = (this.targetWaypointIndex % 2 === 0 ? 0.7 : -0.7)
        this.vehicle.update(delta)
        return
      } else {
        // Reaparece orientado hacia el siguiente waypoint
        this.respawnAtWaypoint()
        this.stuckTimer = 0
      }
    }

    // 3. Cálculo de ángulo y steering hacia el waypoint objetivo
    const currentWp = this.waypoints[this.targetWaypointIndex]
    const toWpX = currentWp[0] - pos.x
    const toWpZ = currentWp[2] - pos.z

    // Vector forward del vehículo (+Z en local)
    const forward = this.vehicle._forwardDir()
    // Vector right del vehículo (+X en local)
    this.vehicle.chassisBody.quaternion.vmult(new CANNON.Vec3(1, 0, 0), this._tmpRight)

    const dotForward = toWpX * forward.x + toWpZ * forward.z
    const dotRight = toWpX * this._tmpRight.x + toWpZ * this._tmpRight.z
    const angle = Math.atan2(dotRight, dotForward)

    // Control de giro proporcional con agilidad ajustada
    const steer = THREE.MathUtils.clamp(angle * this.config.steerAgility, -1, 1)
    this.vehicle.input.steerAxis = steer
    this.vehicle.input.left = steer < -0.08
    this.vehicle.input.right = steer > 0.08

    // 4. Aceleración y frenado según la curvatura
    const absAngle = Math.abs(angle)
    if (absAngle < 0.22) {
      // Recta: aceleración al máximo
      this.vehicle.input.forward = true
      this.vehicle.input.backward = false
      this.vehicle.input.throttleAxis = 1.0 * this.config.topSpeedFactor
      this.vehicle.input.handbrake = false
      this.vehicle.input.boost = distToWp > 25 && Math.random() < 0.3
    } else if (absAngle < 0.55) {
      // Curva suave
      this.vehicle.input.forward = true
      this.vehicle.input.backward = false
      this.vehicle.input.throttleAxis = 0.7 * this.config.topSpeedFactor
      this.vehicle.input.handbrake = false
      this.vehicle.input.boost = false
    } else {
      // Curva cerrada: reduce aceleración drásticamente o frena
      this.vehicle.input.boost = false
      if (speed > 55) {
        this.vehicle.input.forward = false
        this.vehicle.input.backward = true
        this.vehicle.input.throttleAxis = -0.4
        this.vehicle.input.handbrake = absAngle > 1.1
      } else {
        this.vehicle.input.forward = true
        this.vehicle.input.backward = false
        this.vehicle.input.throttleAxis = this.config.cornerSlowdown
        this.vehicle.input.handbrake = false
      }
    }

    // 5. Uso autónomo de armas / power-ups si posee
    if (powerUpManager && this.vehicle.inventory) {
      this.useWeaponTimer -= delta
      if (this.useWeaponTimer <= 0) {
        powerUpManager.useWeapon(this.vehicle)
        this.useWeaponTimer = 2.0 + Math.random() * 3.0
      }
    }

    // 6. Actualización física del vehículo
    this.vehicle.update(delta)
  }

  respawnAtWaypoint() {
    const wp = this.waypoints[this.targetWaypointIndex]
    if (!wp) return

    const nextIndex = (this.targetWaypointIndex + 1) % this.waypoints.length
    const nextWp = this.waypoints[nextIndex]

    const dx = nextWp[0] - wp[0]
    const dz = nextWp[2] - wp[2]
    const yaw = Math.atan2(dx, dz)

    this.vehicle.chassisBody.position.set(wp[0], (wp[1] || 0.5) + 1.2, wp[2])
    this.vehicle.chassisBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw)
    this.vehicle.chassisBody.velocity.setZero()
    this.vehicle.chassisBody.angularVelocity.setZero()
  }

  destroy() {
    this.vehicle.destroy()
  }
}
