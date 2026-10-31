import './style.css'
import { OFFICIAL_RC_CARS } from './MenuSystem.js'

export const CAR_MODELS = OFFICIAL_RC_CARS

export class HUD {
  constructor() {
    this.root = null

    // 1. Esquina Superior Izquierda
    this.lapElement = null
    this.weaponIconElement = null
    this.weaponChargesElement = null

    // 2. Esquina Superior Derecha
    this.lastLapElement = null
    this.bestLapElement = null
    this.lapTimeElement = null
    this.raceTimeElement = null

    // 3. Esquina Inferior Izquierda
    this.rankNumElement = null
    this.rankSufElement = null
    this.waypointArrowElement = null
    this.aheadDistElement = null
    this.aheadNameElement = null
    this.behindDistElement = null
    this.behindNameElement = null

    // 4. Esquina Inferior Derecha
    this.leds = []
    this.speedNumElement = null

    // Menús y Overlays
    this.menuOverlay = null
    this.finishOverlay = null

    this.selectedCarIndex = 0
    this.selectedMapIndex = 0

    this.isMenuOpen = true
    this.isFinished = false

    this._createDOM()
  }

  _createDOM() {
    if (typeof document === 'undefined') return

    const root = document.createElement('div')
    root.className = 'arcade-hud-root'
    root.innerHTML = `
      <!-- 1. ESQUINA SUPERIOR IZQUIERDA -->
      <div id="hud-top-left">
        <div class="hud-lap-block">
          <span class="arcade-label-cyan">Lap</span>
          <span class="hud-lap-text" id="hud-lap-val">1/3</span>
        </div>
        <div class="hud-weapon-box" id="hud-weapon-box">
          <div class="hud-weapon-icon" id="hud-weapon-icon"></div>
          <div class="hud-weapon-charges" id="hud-weapon-charges"></div>
        </div>
      </div>

      <!-- 2. ESQUINA SUPERIOR DERECHA -->
      <div id="hud-top-right">
        <div class="hud-time-block">
          <span class="time-label">Last Lap</span>
          <span class="time-value" id="hud-time-last">00:00:000</span>
        </div>
        <div class="hud-time-block">
          <span class="time-label">Best Lap</span>
          <span class="time-value" id="hud-time-best">05:00:000</span>
        </div>
        <div class="hud-time-block">
          <span class="time-label">Lap</span>
          <span class="time-value" id="hud-time-lap">00:00:000</span>
        </div>
        <div class="hud-time-block">
          <span class="time-label">Race</span>
          <span class="time-value" id="hud-time-race">00:00:000</span>
        </div>
      </div>

      <!-- 3. ESQUINA INFERIOR IZQUIERDA -->
      <div id="hud-bottom-left">
        <div class="hud-pos-row">
          <div class="hud-rank-large" id="hud-rank-box">
            <span class="rank-num" id="hud-rank-num">1</span><span class="rank-suf" id="hud-rank-suf">st</span>
          </div>
          <div class="hud-waypoint-arrow-container">
            <svg class="hud-waypoint-arrow" id="hud-waypoint-arrow" viewBox="0 0 24 30">
              <polygon points="12,2 22,26 12,19 2,26" fill="#ef4444" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" />
            </svg>
          </div>
        </div>

        <div class="hud-distance-box arcade-metallic-panel">
          <div class="hud-distance-row" id="hud-row-ahead">
            <span class="dist-ahead" id="hud-dist-ahead">--</span>
            <span class="racer-name" id="hud-name-ahead">LÍDER</span>
          </div>
          <div class="hud-distance-row" id="hud-row-behind">
            <span class="dist-behind" id="hud-dist-behind">--</span>
            <span class="racer-name" id="hud-name-behind">ÚLTIMO</span>
          </div>
        </div>
      </div>

      <!-- 4. ESQUINA INFERIOR DERECHA (Arco LED) -->
      <div id="hud-bottom-right">
        <div class="hud-speedometer-container" id="hud-led-arc">
          <!-- 8 LEDs en arco ascendente -->
        </div>
        <div class="hud-speed-label">
          <span class="hud-speed-num" id="hud-speed-num">0</span>
          <span class="hud-speed-unit">mph</span>
        </div>
      </div>
    `

    document.body.appendChild(root)
    this.root = root

    // Cachear referencias DOM
    this.lapElement = root.querySelector('#hud-lap-val')
    this.weaponIconElement = root.querySelector('#hud-weapon-icon')
    this.weaponChargesElement = root.querySelector('#hud-weapon-charges')

    this.lastLapElement = root.querySelector('#hud-time-last')
    this.bestLapElement = root.querySelector('#hud-time-best')
    this.lapTimeElement = root.querySelector('#hud-time-lap')
    this.raceTimeElement = root.querySelector('#hud-time-race')

    this.rankNumElement = root.querySelector('#hud-rank-num')
    this.rankSufElement = root.querySelector('#hud-rank-suf')
    this.waypointArrowElement = root.querySelector('#hud-waypoint-arrow')
    this.aheadDistElement = root.querySelector('#hud-dist-ahead')
    this.aheadNameElement = root.querySelector('#hud-name-ahead')
    this.behindDistElement = root.querySelector('#hud-dist-behind')
    this.behindNameElement = root.querySelector('#hud-name-behind')

    this.speedNumElement = root.querySelector('#hud-speed-num')

    this._buildLEDArc(root.querySelector('#hud-led-arc'))
    this._buildMenuOverlay()
    this._buildFinishOverlay()

    // Oculto por defecto durante los menús
    this.setVisible(false)
  }

  setVisible(visible) {
    if (this.root) {
      this.root.style.display = visible ? 'block' : 'none'
    }
  }

  _buildLEDArc(container) {
    if (!container) return
    // 8 LEDs en arco ascendente
    // 2 Rojos, 3 Amarillos, 3 Verdes
    const ledConfig = [
      { class: 'led-red', x: 10, y: 38 },
      { class: 'led-red', x: 28, y: 46 },
      { class: 'led-yellow', x: 48, y: 54 },
      { class: 'led-yellow', x: 70, y: 62 },
      { class: 'led-yellow', x: 93, y: 69 },
      { class: 'led-green', x: 117, y: 74 },
      { class: 'led-green', x: 141, y: 77 },
      { class: 'led-green', x: 165, y: 78 },
    ]

    this.leds = []
    ledConfig.forEach((cfg) => {
      const led = document.createElement('div')
      led.className = `hud-led ${cfg.class}`
      led.style.left = `${cfg.x}px`
      led.style.bottom = `${cfg.y}px`
      container.appendChild(led)
      this.leds.push(led)
    })
  }

  _buildMenuOverlay() {
    // La navegación de menús ahora es gestionada por MenuSystem.js
    this.isMenuOpen = false
    this.menuOverlay = null
  }

  _buildFinishOverlay() {
    const finish = document.createElement('div')
    finish.id = 'arcade-finish-screen'
    finish.className = 'arcade-overlay'
    finish.style.display = 'none'
    finish.innerHTML = `
      <div class="arcade-title">¡CARRERA FINALIZADA!</div>
      <div class="arcade-subtitle" id="finish-pos-title">RESULTADOS OFICIALES</div>

      <table class="results-table">
        <thead>
          <tr>
            <th>POS</th>
            <th>PILOTO</th>
            <th>TIEMPO TOTAL</th>
            <th>MEJOR VUELTA</th>
          </tr>
        </thead>
        <tbody id="finish-results-body">
        </tbody>
      </table>

      <div style="display: flex; gap: 16px;">
        <button class="arcade-btn" id="btn-restart-race">VOLVER A CORRER</button>
        <button class="arcade-btn" id="btn-menu-race" style="background: linear-gradient(180deg, #475569 0%, #334155 100%); border-color: #94a3b8;">CAMBIAR MAPA</button>
      </div>
    `

    document.body.appendChild(finish)
    this.finishOverlay = finish
  }

  initMenuHandlers(onStartRace, onRestartRace, onOpenMenu) {
    const startBtn = this.menuOverlay?.querySelector('#btn-start-race')
    startBtn?.addEventListener('click', () => {
      this.menuOverlay.style.display = 'none'
      this.isMenuOpen = false
      if (onStartRace) {
        onStartRace({
          car: CAR_MODELS[this.selectedCarIndex],
          mapIndex: this.selectedMapIndex,
        })
      }
    })

    const restartBtn = this.finishOverlay?.querySelector('#btn-restart-race')
    restartBtn?.addEventListener('click', () => {
      this.finishOverlay.style.display = 'none'
      this.isFinished = false
      if (onRestartRace) onRestartRace()
    })

    const menuBtn = this.finishOverlay?.querySelector('#btn-menu-race')
    menuBtn?.addEventListener('click', () => {
      this.finishOverlay.style.display = 'none'
      this.menuOverlay.style.display = 'flex'
      this.isMenuOpen = true
      if (onOpenMenu) onOpenMenu()
    })
  }

  setMapName(name) {
    // Sincronización opcional
  }

  reset() {
    this.isFinished = false
    if (this.lapElement) this.lapElement.textContent = '1/3'
    if (this.finishOverlay) this.finishOverlay.style.display = 'none'
  }

  onLapComplete() {
    // Manejado por raceManager
  }

  showFinishScreen(racers) {
    if (this.isFinished || !this.finishOverlay) return
    this.isFinished = true

    const sorted = [...(racers || [])].sort((a, b) => b.totalProgress - a.totalProgress)
    const tbody = this.finishOverlay.querySelector('#finish-results-body')
    if (tbody) {
      tbody.innerHTML = sorted
        .map((r, i) => {
          const ord = ['1st', '2nd', '3rd', '4th', '5th', '6th'][i] || `${i + 1}th`
          return `
          <tr class="${r.isPlayer ? 'player-row' : ''}">
            <td style="color: ${i === 0 ? '#facc15' : i === 1 ? '#e2e8f0' : i === 2 ? '#f97316' : '#fff'};">${ord}</td>
            <td>${r.name}</td>
            <td>${r.totalTime || '00:00:000'}</td>
            <td>${r.bestLap || '00:00:000'}</td>
          </tr>
        `
        })
        .join('')
    }

    this.finishOverlay.style.display = 'flex'
  }

  /**
   * Actualización en cada fotograma llamada por RaceManager
   */
  updateRaceStats(stats) {
    if (!stats || this.isMenuOpen) return

    // 1. Lap (arriba izq)
    if (this.lapElement && stats.currentLap && stats.totalLaps) {
      this.lapElement.textContent = `${Math.min(stats.currentLap, stats.totalLaps)}/${stats.totalLaps}`
    }

    // Arma actual en recuadro 72x72
    if (this.weaponIconElement) {
      if (stats.inventory) {
        this.weaponIconElement.textContent = stats.inventory.icon || 'PWR'
        this.weaponChargesElement.textContent = stats.inventory.charges || '1'
      } else {
        this.weaponIconElement.textContent = ''
        this.weaponChargesElement.textContent = ''
      }
    }

    // 2. Tiempos (arriba der)
    if (this.lastLapElement && stats.lastLapTime) this.lastLapElement.textContent = stats.lastLapTime
    if (this.bestLapElement && stats.bestLapTime) this.bestLapElement.textContent = stats.bestLapTime
    if (this.lapTimeElement && stats.lapTime) this.lapTimeElement.textContent = stats.lapTime
    if (this.raceTimeElement && stats.raceTime) this.raceTimeElement.textContent = stats.raceTime

    // 3. Posición grande y flecha (abajo izq)
    if (this.rankNumElement && stats.position) {
      const suffixes = ['', 'st', 'nd', 'rd', 'th', 'th', 'th']
      this.rankNumElement.textContent = stats.position
      this.rankSufElement.textContent = suffixes[stats.position] || 'th'
    }

    // Distancias
    if (this.aheadDistElement) {
      if (stats.aheadText) {
        const parts = stats.aheadText.split(' ')
        this.aheadDistElement.textContent = parts[0] || '--'
        this.aheadNameElement.textContent = parts.slice(1).join(' ') || 'ADELANTE'
      } else {
        this.aheadDistElement.textContent = '--'
        this.aheadNameElement.textContent = 'LÍDER'
      }
    }

    if (this.behindDistElement) {
      if (stats.behindText) {
        const parts = stats.behindText.split(' ')
        this.behindDistElement.textContent = parts[0] || '--'
        this.behindNameElement.textContent = parts.slice(1).join(' ') || 'ATRÁS'
      } else {
        this.behindDistElement.textContent = '--'
        this.behindNameElement.textContent = 'ÚLTIMO'
      }
    }
  }

  /**
   * Actualiza la orientación de la flecha roja hacia el siguiente waypoint
   */
  updateWaypointArrow(vehiclePos, vehicleFwd, targetWaypoint) {
    if (!this.waypointArrowElement || !vehiclePos || !vehicleFwd || !targetWaypoint) return

    const toWpX = targetWaypoint[0] - vehiclePos.x
    const toWpZ = targetWaypoint[2] - vehiclePos.z

    const carYaw = Math.atan2(vehicleFwd.x, vehicleFwd.z)
    const wpYaw = Math.atan2(toWpX, toWpZ)

    let relYaw = wpYaw - carYaw
    // Normalizar a [-PI, PI]
    while (relYaw > Math.PI) relYaw -= Math.PI * 2
    while (relYaw < -Math.PI) relYaw += Math.PI * 2

    const angleDeg = relYaw * (180 / Math.PI)
    this.waypointArrowElement.style.transform = `rotate(${angleDeg.toFixed(1)}deg)`
  }

  /**
   * Actualiza el velocímetro en arco LED y texto en mph o km/h
   */
  updateSpeedometer(speedKmh, unit = 'mph') {
    const isMph = (unit || 'mph').toLowerCase() === 'mph'
    const speedVal = isMph ? Math.round(Math.max(0, speedKmh) * 0.621371) : Math.round(Math.max(0, speedKmh))
    if (this.speedNumElement) {
      this.speedNumElement.textContent = speedVal
    }
    const unitLabel = document.querySelector('.hud-unit-label')
    if (unitLabel) unitLabel.textContent = isMph ? 'MPH' : 'KM/H'

    // 8 LEDs iluminados proporcionalmente
    const maxVal = isMph ? 85 : 136
    const litCount = Math.min(8, Math.round((speedVal / maxVal) * 8))

    for (let i = 0; i < this.leds.length; i++) {
      if (i < litCount) {
        this.leds[i].classList.add('lit')
      } else {
        this.leds[i].classList.remove('lit')
      }
    }
  }

  update() {
    // No-op
  }
}
