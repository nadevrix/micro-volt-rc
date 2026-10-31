import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { applyBuggyLivery } from '../vehicles/BuggyLiveryHelper.js'
import { CAR_PRESETS } from '../vehicles/carPresets.js'

const sharedDracoLoader = new DRACOLoader()
if (typeof window !== 'undefined') {
  sharedDracoLoader.setDecoderPath('/draco/')
}

/**
 * GarageScene.js - Plataforma Giratoria de Exhibición 3D (Showroom / Pedestal RC)
 * Renderiza el auto RC seleccionado sobre un pedestal giratorio en un entorno de tienda/estudio
 * con reflectores cálidos, rotación en 360° automática e interactiva con el mouse.
 */
export class GarageScene {
  constructor({ scene, glbReflectionMap }) {
    this.scene = scene
    this.glbReflectionMap = glbReflectionMap
    this._loader = new GLTFLoader()
    this._loader.setDRACOLoader(sharedDracoLoader)

    this.group = new THREE.Group()
    this.group.position.set(0, 200, 0) // Posición de estudio aislada a gran altura
    this.scene.add(this.group)

    this.currentCarModel = null
    this.turntable = null
    this.carPivot = null
    this.currentCarUrl = null
    this.currentColorHex = null
    this.currentDorsal = '01'

    this.autoRotate = true
    this.rotationSpeed = 0.65
    this.isDragging = false
    this.previousMouseX = 0

    this.cameraPosition = new THREE.Vector3(0, 201.4, 4.4)
    this.cameraLookAt = new THREE.Vector3(0, 200.55, 0)

    this._buildStudio()
    this._attachMouseEvents()
  }

  _buildStudio() {
    // 1. Pedestal Giratorio Circular (base estilo exhibición de juguetes)
    const baseGeo = new THREE.CylinderGeometry(2.7, 2.9, 0.4, 48)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.25,
      metalness: 0.6,
    })
    this.turntableBase = new THREE.Mesh(baseGeo, baseMat)
    this.turntableBase.position.y = 0.2
    this.turntableBase.receiveShadow = true
    this.group.add(this.turntableBase)

    // Aro de Neón Cian brillante alrededor de la plataforma
    const ringGeo = new THREE.TorusGeometry(2.82, 0.05, 16, 64)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    const neonRing = new THREE.Mesh(ringGeo, ringMat)
    neonRing.rotation.x = Math.PI / 2
    neonRing.position.y = 0.38
    this.group.add(neonRing)

    // Superficie superior reflectante con logo "MICRO-VOLT RC"
    const topCanvas = document.createElement('canvas')
    topCanvas.width = 512
    topCanvas.height = 512
    const ctx = topCanvas.getContext('2d')
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.arc(256, 256, 240, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#fde047'
    ctx.font = '900 italic 42px "Orbitron", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⚡ MICRO-VOLT RC ⚡', 256, 256)
    ctx.fillStyle = '#38bdf8'
    ctx.font = '700 20px monospace'
    ctx.fillText('SHOWROOM DISPLAY', 256, 305)

    const topTex = new THREE.CanvasTexture(topCanvas)
    const topGeo = new THREE.CircleGeometry(2.68, 48)
    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      roughness: 0.15,
      metalness: 0.4,
    })
    const topMesh = new THREE.Mesh(topGeo, topMat)
    topMesh.rotation.x = -Math.PI / 2
    topMesh.position.y = 0.405
    topMesh.receiveShadow = true
    this.group.add(topMesh)

    // Pivote giratorio donde monta el auto
    this.carPivot = new THREE.Group()
    this.carPivot.position.y = 0.41
    this.group.add(this.carPivot)

    // 2. Fondo de Estudio Cilíndrico Suave
    const backdropGeo = new THREE.CylinderGeometry(15, 15, 12, 48, 1, true)
    const backdropMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.BackSide,
    })
    const backdrop = new THREE.Mesh(backdropGeo, backdropMat)
    backdrop.position.y = 5
    this.group.add(backdrop)

    // 3. Luces de Estudio y Reflectores Focalizados
    const keySpot = new THREE.SpotLight(0xfff7ed, 4.5, 20, Math.PI / 4, 0.4)
    keySpot.position.set(2, 6, 4)
    keySpot.target = this.carPivot
    keySpot.castShadow = true
    this.group.add(keySpot)

    const fillSpot = new THREE.SpotLight(0x38bdf8, 3.0, 20, Math.PI / 3, 0.5)
    fillSpot.position.set(-3.5, 4, 3)
    fillSpot.target = this.carPivot
    this.group.add(fillSpot)

    const rimLight = new THREE.DirectionalLight(0xfef08a, 1.8)
    rimLight.position.set(0, 3, -4)
    this.group.add(rimLight)

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.group.add(ambient)
  }

  _attachMouseEvents() {
    if (typeof window === 'undefined') return

    const onPointerDown = (e) => {
      // Si el clic no ocurre sobre controles de interfaz
      if (e.target?.closest?.('.menu-card, .arcade-btn, input, select')) return
      this.isDragging = true
      this.previousMouseX = e.clientX
    }

    const onPointerMove = (e) => {
      if (!this.isDragging || !this.carPivot) return
      const deltaX = e.clientX - this.previousMouseX
      this.previousMouseX = e.clientX
      this.carPivot.rotation.y += deltaX * 0.009
    }

    const onPointerUp = () => {
      this.isDragging = false
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  async setCar(carConfig, colorHex, dorsalNumber = '18') {
    let preset = carConfig?.dorsal ? carConfig : null
    if (!preset && carConfig?.id) {
      preset = CAR_PRESETS.find((p) => p.id === carConfig.id)
    }
    if (!preset) {
      preset = CAR_PRESETS.find((p) => p.dorsal === String(dorsalNumber)) || CAR_PRESETS[0]
    }

    this.currentCarUrl = '/assets/prebuilt/rc-original/base.glb'
    this.currentColorHex = colorHex || preset.colorHex
    this.currentDorsal = preset.dorsal

    // Limpiar auto anterior
    if (this.currentCarModel) {
      this.carPivot.remove(this.currentCarModel)
      this.currentCarModel.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose()
        }
      })
      this.currentCarModel = null
    }

    try {
      // 1. Cargar chasis base.glb
      const gltf = await this._loader.loadAsync('/assets/prebuilt/rc-original/base.glb')
      const chassis = gltf.scene.clone(true)
      await applyBuggyLivery(chassis, preset)

      // Centrar chasis
      const chassisBox = new THREE.Box3().setFromObject(chassis)
      const chassisCenter = chassisBox.getCenter(new THREE.Vector3())
      chassis.position.sub(chassisCenter)

      const fullCarGroup = new THREE.Group()
      fullCarGroup.add(chassis)

      // 2. Cargar las 4 ruedas
      const wheelPaths = [
        '/assets/prebuilt/rc-original/front-left.glb',
        '/assets/prebuilt/rc-original/front-right.glb',
        '/assets/prebuilt/rc-original/back-left.glb',
        '/assets/prebuilt/rc-original/back-right.glb',
      ]
      const wheelOffsets = [
        [-0.85, -0.05, 1.15],
        [0.85, -0.05, 1.15],
        [-0.85, -0.05, -1.15],
        [0.85, -0.05, -1.15],
      ]

      for (let i = 0; i < 4; i++) {
        const wGltf = await this._loader.loadAsync(wheelPaths[i])
        const wMesh = wGltf.scene.clone(true)

        const wBox = new THREE.Box3().setFromObject(wMesh)
        const wCenter = wBox.getCenter(new THREE.Vector3())
        wMesh.position.sub(wCenter)

        const wSize = wBox.getSize(new THREE.Vector3())
        const wDiam = Math.max(wSize.y, wSize.z, 0.001)
        const wScale = 0.58 / wDiam

        const wHolder = new THREE.Group()
        wHolder.add(wMesh)
        wHolder.scale.setScalar(wScale)
        wHolder.position.set(wheelOffsets[i][0], wheelOffsets[i][1], wheelOffsets[i][2])
        fullCarGroup.add(wHolder)
      }

      fullCarGroup.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })

      // Escalar para que se ajuste perfectamente a la plataforma de exhibición
      const box = new THREE.Box3().setFromObject(fullCarGroup)
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z, 0.001)
      const targetScale = 2.4 / maxDim
      fullCarGroup.scale.setScalar(targetScale)
      fullCarGroup.position.y += (size.y * targetScale) / 2 + 0.05

      // Antena de radio RC con resorte y bolita naranja
      const antGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.75, 12)
      const antMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.3, metalness: 0.8 })
      const antMesh = new THREE.Mesh(antGeo, antMat)
      antMesh.position.set(0, 0.45, -0.65)
      antMesh.castShadow = true

      const tipGeo = new THREE.SphereGeometry(0.035, 16, 16)
      const tipMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.2, metalness: 0.1 })
      const tipMesh = new THREE.Mesh(tipGeo, tipMat)
      tipMesh.position.y = 0.38
      antMesh.add(tipMesh)
      fullCarGroup.add(antMesh)

      this.carPivot.add(fullCarGroup)
      this.currentCarModel = fullCarGroup
      console.log(`[GarageScene] Buggy RC "${preset.name}" montado en plataforma de exhibición.`)
    } catch (e) {
      console.warn('Error cargando auto en el Garaje 3D:', e)
    }
  }

  update(delta) {
    if (this.autoRotate && !this.isDragging && this.carPivot) {
      this.carPivot.rotation.y += delta * this.rotationSpeed
    }
  }

  setVisible(visible) {
    this.group.visible = visible
  }
}
