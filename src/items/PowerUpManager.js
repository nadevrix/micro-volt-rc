import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

/**
 * PowerUpManager - Gestiona las cajas flotantes de armas arcade, proyectiles,
 * explosiones de chispas, ondas expansivas y manchas de aceite.
 */
export class PowerUpManager {
  constructor({ scene, physicsWorld, getRacers }) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.getRacers = getRacers // () => [ { vehicle, name, isPlayer, ... }, ... ]

    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.boxes = []
    this.projectiles = []
    this.oilPuddles = []
    this.particles = []

    this._loader = new GLTFLoader()
    this._itemBoxTemplate = null
    this._ensureModelLoaded()

    this.weaponTypes = [
      { id: 'spark_battery', name: 'Batería de Chispas', icon: '⚡', charges: 3 },
      { id: 'wave_balloon', name: 'Globo de Onda', icon: '🌊', charges: 3 },
      { id: 'oil_slick', name: 'Mancha de Aceite', icon: '🛢️', charges: 1 },
      { id: 'electro_turbo', name: 'Electro-Turbo', icon: '🚀', charges: 1 },
    ]

    this._setupParticleBuffers()
  }

  async _ensureModelLoaded() {
    if (this._itemBoxTemplate) return this._itemBoxTemplate
    try {
      const gltf = await this._loader.loadAsync('/assets/packs/toy-car-kit/Models/GLB format/item-box.glb')
      this._itemBoxTemplate = gltf.scene
      this._itemBoxTemplate.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true
          if (c.material) {
            c.material = c.material.clone()
            c.material.roughness = 0.2
            c.material.metalness = 0.4
          }
        }
      })
    } catch (e) {
      console.warn('item-box.glb no disponible, usando cápsula de batería', e)
    }
    return this._itemBoxTemplate
  }

  _setupParticleBuffers() {
    this.particleGeo = new THREE.SphereGeometry(0.08, 6, 6)
    this.sparkMatYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    this.sparkMatRed = new THREE.MeshBasicMaterial({ color: 0xef4444 })
    this.sparkMatBlue = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  }

  /**
   * Genera filas de 3 a 4 cajas flotantes en puntos estratégicos según el mapa.
   */
  setupMapBoxes(mapIndex) {
    this.clearAll()

    // Puntos estratégicos en filas de 3 a 4 sobre el asfalto/pista
    let boxRows = []
    if (mapIndex === 0) {
      // Distrito Industrial & Hangar
      boxRows = [
        [
          [36, 1.2, -40],
          [38, 1.2, -40],
          [40, 1.2, -40],
        ],
        [
          [36, 1.2, 35],
          [38, 1.2, 35],
          [40, 1.2, 35],
        ],
        [
          [-42, 6.0, 5],
          [-40, 6.0, 5],
          [-38, 6.0, 5],
        ],
        [
          [-28, 1.2, -88],
          [-26, 1.2, -88],
          [-24, 1.2, -88],
        ],
      ]
    } else if (mapIndex === 1) {
      // Bodega & Taller de Juguetes (2 Pisos)
      boxRows = [
        [
          [23, 1.2, 0],
          [25, 1.2, 0],
          [27, 1.2, 0],
        ],
        [
          [-37, 5.2, -10],
          [-35, 5.2, -10],
          [-33, 5.2, -10],
        ],
        [
          [-17, 5.2, -45],
          [-15, 5.2, -45],
          [-13, 5.2, -45],
        ],
      ]
    } else {
      // Gran Premio del Desierto
      boxRows = [
        [
          [-2, 1.2, -50],
          [0, 1.2, -50],
          [2, 1.2, -50],
        ],
        [
          [53, 1.2, 70],
          [55, 1.2, 70],
          [57, 1.2, 70],
        ],
        [
          [-67, 1.2, 55],
          [-65, 1.2, 55],
          [-63, 1.2, 55],
        ],
      ]
    }

    for (const row of boxRows) {
      for (const pos of row) {
        this._createFloatingBox(pos)
      }
    }
  }

  _createFloatingBox(pos) {
    const boxGroup = new THREE.Group()
    boxGroup.position.set(pos[0], pos[1], pos[2])

    // 1. Modelo 3D item-box de Kenney toy-car-kit
    let itemBoxModel = null
    if (this._itemBoxTemplate) {
      itemBoxModel = this._itemBoxTemplate.clone()
      itemBoxModel.scale.set(1.5, 1.5, 1.5)
      boxGroup.add(itemBoxModel)
    } else {
      // Cápsula de energía / batería RC con estilo cromado/cyan
      const capGroup = new THREE.Group()
      const battGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.85, 16)
      const battMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.8,
        roughness: 0.15,
        emissive: 0x0284c7,
        emissiveIntensity: 0.5,
      })
      const battMesh = new THREE.Mesh(battGeo, battMat)
      capGroup.add(battMesh)
      itemBoxModel = capGroup
      boxGroup.add(itemBoxModel)
    }

    // 2. Rayo interior luminoso / núcleo brillante
    const coreGeo = new THREE.OctahedronGeometry(0.35, 0)
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
    })
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    boxGroup.add(coreMesh)

    // 3. Aro brillante con AdditiveBlending (sin wireframe)
    const ringGeo = new THREE.TorusGeometry(0.72, 0.04, 8, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.rotation.x = Math.PI / 2
    boxGroup.add(ringMesh)

    // 4. Halo neón brillante con AdditiveBlending (sin wireframe)
    const haloGeo = new THREE.RingGeometry(0.45, 0.9, 24)
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const haloMesh = new THREE.Mesh(haloGeo, haloMat)
    haloMesh.rotation.x = Math.PI / 2
    boxGroup.add(haloMesh)

    this.group.add(boxGroup)

    this.boxes.push({
      group: boxGroup,
      baseY: pos[1],
      itemBoxModel,
      coreMesh,
      ringMesh,
      haloMesh,
      active: true,
      respawnTimer: 0,
      phase: Math.random() * Math.PI * 2,
    })
  }

  useWeapon(vehicle) {
    if (!vehicle || !vehicle.inventory) return false

    const item = vehicle.inventory
    const pos = vehicle.chassisBody.position
    const fwd = vehicle._forwardDir()

    switch (item.id) {
      case 'spark_battery':
        this._fireSparkRocket(vehicle, pos, fwd)
        break
      case 'wave_balloon':
        this._fireWaveBalloon(vehicle, pos, fwd)
        break
      case 'oil_slick':
        this._dropOilSlick(vehicle, pos, fwd)
        break
      case 'electro_turbo':
        vehicle.triggerElectroTurbo(3.0)
        break
    }

    item.charges--
    if (item.charges <= 0) {
      vehicle.inventory = null
    }

    return true
  }

  _fireSparkRocket(shooter, pos, fwd) {
    const rocketMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xf97316,
        emissiveIntensity: 1.2,
      })
    )
    rocketMesh.rotation.x = Math.PI / 2
    rocketMesh.position.set(pos.x + fwd.x * 2.2, pos.y + 0.45, pos.z + fwd.z * 2.2)
    this.group.add(rocketMesh)

    this.projectiles.push({
      type: 'spark_rocket',
      mesh: rocketMesh,
      position: rocketMesh.position.clone(),
      velocity: new THREE.Vector3(fwd.x * 65, 0, fwd.z * 65),
      shooter,
      life: 2.2,
    })
  }

  _fireWaveBalloon(shooter, pos, fwd) {
    const balloonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.85,
      })
    )
    balloonMesh.position.set(pos.x + fwd.x * 2.2, pos.y + 0.45, pos.z + fwd.z * 2.2)
    this.group.add(balloonMesh)

    this.projectiles.push({
      type: 'wave_balloon',
      mesh: balloonMesh,
      position: balloonMesh.position.clone(),
      velocity: new THREE.Vector3(fwd.x * 45, 0, fwd.z * 45),
      shooter,
      life: 2.5,
    })
  }

  _dropOilSlick(dropper, pos, fwd) {
    // Mancha de aceite: charco negro brillante con reflejos detrás del auto
    const puddleGeo = new THREE.CircleGeometry(1.6, 24)
    puddleGeo.rotateX(-Math.PI / 2)
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.08,
      metalness: 0.85,
    })
    const puddleMesh = new THREE.Mesh(puddleGeo, puddleMat)
    puddleMesh.position.set(pos.x - fwd.x * 2.2, 0.025, pos.z - fwd.z * 2.2)
    puddleMesh.receiveShadow = true
    this.group.add(puddleMesh)

    this.oilPuddles.push({
      mesh: puddleMesh,
      position: puddleMesh.position.clone(),
      dropper,
      life: 25.0,
      radius: 1.6,
    })
  }

  _explodeSparks(pos) {
    const count = 30
    for (let i = 0; i < count; i++) {
      const mat = Math.random() > 0.4 ? this.sparkMatYellow : this.sparkMatRed
      const p = new THREE.Mesh(this.particleGeo, mat)
      p.position.copy(pos)
      this.group.add(p)

      const angle = Math.random() * Math.PI * 2
      const speed = 6 + Math.random() * 14
      const vy = 3 + Math.random() * 8
      this.particles.push({
        mesh: p,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, vy, Math.sin(angle) * speed),
        gravity: 18,
        life: 0.6 + Math.random() * 0.4,
      })
    }
  }

  _explodeShockwave(pos) {
    const waveGeo = new THREE.RingGeometry(0.2, 0.6, 32)
    waveGeo.rotateX(-Math.PI / 2)
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    })
    const waveMesh = new THREE.Mesh(waveGeo, waveMat)
    waveMesh.position.set(pos.x, 0.15, pos.z)
    this.group.add(waveMesh)

    this.particles.push({
      mesh: waveMesh,
      isWave: true,
      scale: 1,
      maxScale: 18,
      life: 0.7,
      maxLife: 0.7,
    })

    // Empuje lateral a todos los autos cercanos
    const racers = this.getRacers ? this.getRacers() : []
    for (const r of racers) {
      const cpos = r.vehicle.chassisBody.position
      const dx = cpos.x - pos.x
      const dz = cpos.z - pos.z
      const dist = Math.hypot(dx, dz)
      if (dist < 9.0 && dist > 0.1) {
        const factor = (1 - dist / 9.0) * r.vehicle.params.mass * 14.0
        const nx = dx / dist
        const nz = dz / dist
        r.vehicle.applyImpulse(new CANNON.Vec3(nx * factor, r.vehicle.params.mass * 3.5, nz * factor))
      }
    }
  }

  update(delta) {
    const racers = this.getRacers ? this.getRacers() : []

    // 1. Cajas flotantes y detección de recolección
    const now = performance.now() * 0.003
    for (const box of this.boxes) {
      if (box.active) {
        box.group.position.y = box.baseY + Math.sin(now + box.phase) * 0.22
        if (box.itemBoxModel) {
          box.itemBoxModel.rotation.y += 2.0 * delta
        }
        if (box.coreMesh) {
          box.coreMesh.rotation.y += 3.2 * delta
          box.coreMesh.rotation.x += 1.6 * delta
        }
        if (box.ringMesh) {
          box.ringMesh.rotation.z += 2.2 * delta
        }
        if (box.haloMesh) {
          box.haloMesh.rotation.z -= 1.8 * delta
        }

        for (const racer of racers) {
          const cpos = racer.vehicle.chassisBody.position
          const dx = box.group.position.x - cpos.x
          const dy = box.group.position.y - cpos.y
          const dz = box.group.position.z - cpos.z
          const horizDist = Math.hypot(dx, dz)
          if (horizDist < 3.2 && Math.abs(dy) < 2.8) {
            // Recogida!
            box.active = false
            box.group.visible = false
            box.respawnTimer = 5.0 // Reaparece exactamente a los 5 segundos

            // Asignar 1 de las 4 armas al azar
            if (!racer.vehicle.inventory) {
              const choice = this.weaponTypes[Math.floor(Math.random() * this.weaponTypes.length)]
              racer.vehicle.inventory = { ...choice }
            }
            break
          }
        }
      } else {
        box.respawnTimer -= delta
        if (box.respawnTimer <= 0) {
          box.active = true
          box.group.visible = true
        }
      }
    }

    // 2. Proyectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
      proj.life -= delta
      proj.position.addScaledVector(proj.velocity, delta)
      proj.mesh.position.copy(proj.position)

      let hit = false

      // Colisión contra corredores
      for (const r of racers) {
        if (r.vehicle === proj.shooter && proj.life > 2.0) continue // Ignorar disparador al inicio

        const cpos = r.vehicle.chassisBody.position
        if (proj.position.distanceTo(cpos) < 2.4) {
          hit = true
          if (proj.type === 'spark_rocket') {
            this._explodeSparks(proj.position)
            // Hacer saltar por el aire al rival afectado con impulso vertical y vuelco
            r.vehicle.applyImpulse(new CANNON.Vec3(0, r.vehicle.params.mass * 9.5, 0))
            r.vehicle.chassisBody.angularVelocity.x += (Math.random() - 0.5) * 8.0
            r.vehicle.chassisBody.angularVelocity.z += (Math.random() - 0.5) * 8.0
          } else if (proj.type === 'wave_balloon') {
            this._explodeShockwave(proj.position)
          }
          break
        }
      }

      if (hit || proj.life <= 0) {
        if (!hit) {
          if (proj.type === 'spark_rocket') this._explodeSparks(proj.position)
          if (proj.type === 'wave_balloon') this._explodeShockwave(proj.position)
        }
        proj.mesh.geometry?.dispose()
        proj.mesh.removeFromParent()
        this.projectiles.splice(i, 1)
      }
    }

    // 3. Manchas de aceite
    for (let i = this.oilPuddles.length - 1; i >= 0; i--) {
      const puddle = this.oilPuddles[i]
      puddle.life -= delta

      for (const r of racers) {
        const cpos = r.vehicle.chassisBody.position
        const dx = cpos.x - puddle.position.x
        const dz = cpos.z - puddle.position.z
        if (Math.hypot(dx, dz) < puddle.radius + 0.4) {
          // El auto pisa la mancha de aceite: pierde fricción y entra en trompo por 1.5s
          r.vehicle.triggerSpinout(1.5)
          puddle.life = 0
          break
        }
      }

      if (puddle.life <= 0) {
        puddle.mesh.geometry?.dispose()
        puddle.mesh.removeFromParent()
        this.oilPuddles.splice(i, 1)
      }
    }

    // 4. Partículas y ondas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= delta
      if (p.isWave) {
        const progress = 1 - p.life / p.maxLife
        const s = 1 + progress * p.maxScale
        p.mesh.scale.set(s, s, s)
        p.mesh.material.opacity = (p.life / p.maxLife) * 0.9
      } else {
        p.velocity.y -= p.gravity * delta
        p.mesh.position.addScaledVector(p.velocity, delta)
      }

      if (p.life <= 0) {
        p.mesh.geometry?.dispose()
        p.mesh.removeFromParent()
        this.particles.splice(i, 1)
      }
    }
  }

  clearAll() {
    for (const b of this.boxes) {
      b.group.removeFromParent()
    }
    this.boxes = []

    for (const p of this.projectiles) {
      p.mesh.removeFromParent()
    }
    this.projectiles = []

    for (const o of this.oilPuddles) {
      o.mesh.removeFromParent()
    }
    this.oilPuddles = []

    for (const part of this.particles) {
      part.mesh.removeFromParent()
    }
    this.particles = []
  }
}
