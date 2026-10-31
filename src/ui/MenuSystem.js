import './style.css'
import { CAR_PRESETS } from '../vehicles/carPresets.js'

/**
 * Modelos oficiales de los 6 Buggies RC con fichas técnicas reales.
 */
export const OFFICIAL_RC_CARS = CAR_PRESETS

export const COLOR_PALETTE = [
  { name: 'Verde Esmeralda', hex: 0x22c55e, css: '#22c55e' },
  { name: 'Azul Eléctrico', hex: 0x2563eb, css: '#2563eb' },
  { name: 'Rojo Carmesí', hex: 0xef4444, css: '#ef4444' },
  { name: 'Naranja Neón', hex: 0xf97316, css: '#f97316' },
  { name: 'Morado Titanio', hex: 0x8b5cf6, css: '#8b5cf6' },
  { name: 'Amarillo Rayo', hex: 0xfacc15, css: '#facc15' },
]

export const DORSALS = ['01', '07', '13', '24', '42', '77', '99']

export const TRACK_INFOS = [
  {
    index: 0,
    name: 'Distrito Industrial & Hangar',
    tag: 'CIRCUITO URBANO / HANGAR',
    desc: 'Circuito callejero e industrial con túnel de contenedores, puente elevado a 5 metros, asfalto de alta adherencia y chicana.',
    surface: 'Asfalto Industrial & Concreto',
    lengthM: 480,
    record: '00:26:150',
    svgPath: 'M 140,40 L 140,120 Q 140,150 110,150 L 50,150 Q 30,150 30,120 L 30,60 Q 30,40 50,40 L 110,40 Q 140,40 140,60 Z',
  },
  {
    index: 1,
    name: 'Bodega & Taller de Juguetes',
    tag: 'CIRCUITO MINIATURA 2 PISOS',
    desc: 'Escenario colosal estilo Micro Machines. Carrera bajo mesas gigantes, rampa de madera a la gran mesa de trabajo (4.5m) y descenso en curva.',
    surface: 'Parquet de Madera & Tablones',
    lengthM: 420,
    record: '00:24:820',
    svgPath: 'M 130,40 L 130,140 Q 130,165 100,165 L 45,165 Q 25,165 25,140 L 25,55 Q 25,35 50,35 L 105,35 Q 130,35 130,55 Z',
  },
  {
    index: 2,
    name: 'Gran Premio del Desierto',
    tag: 'SUPER SPEEDWAY DEL DESIERTO',
    desc: 'Circuito profesional al aire libre entre cañones rocosos, curvas de alta velocidad con pianos rojo/blanco y recta principal de meta.',
    surface: 'Asfalto de Competición & Curbs',
    lengthM: 550,
    record: '00:28:400',
    svgPath: 'M 100,30 L 155,75 Q 165,110 140,145 L 80,165 Q 40,155 35,120 L 35,65 Q 40,30 80,30 Z',
  },
]

/**
 * MenuSystem - Sistema completo de menús multipantalla para videojuego comercial
 */
export class MenuSystem {
  constructor({ settingsManager, garageScene, onStartRace, onResumeRace, onRestartRace, onQuitToMenu, onCountdownStep }) {
    this.settings = settingsManager
    this.garage = garageScene
    this.onStartRace = onStartRace
    this.onResumeRace = onResumeRace
    this.onRestartRace = onRestartRace
    this.onQuitToMenu = onQuitToMenu
    this.onCountdownStep = onCountdownStep || null

    // Estado actual de selecciones
    this.gameMode = 'single' // 'single' | 'championship' | 'timetrial' | 'showroom'
    this.selectedCarIndex = 0
    this.selectedColor = COLOR_PALETTE[0]
    this.selectedDorsal = '42'
    this.selectedTrackIndex = 0

    // Reglas de carrera
    this.raceRules = {
      laps: 3,
      aiDifficulty: 'normal', // 'rookie' | 'normal' | 'master'
      timeOfDay: 'day',       // 'day' | 'sunset' | 'night'
      weaponsEnabled: true,
    }

    // Estado del campeonato
    this.championship = {
      isActive: false,
      currentRaceIndex: 0,
      points: {}, // { [racerName]: totalPoints }
    }

    this.currentScreen = 'home' // 'home' | 'garage' | 'track' | 'settings' | 'pause' | 'none'
    this.isPaused = false
    this.isCountingDown = false

    this._createDOM()
    this._attachKeyListeners()

    // Mostrar garaje con el primer auto
    this._updateGarageCar()
  }

  _createDOM() {
    this.root = document.createElement('div')
    this.root.id = 'commercial-menu-system'
    this.root.className = 'menu-system-root'

    this.root.innerHTML = `
      <!-- PANTALLA A: MENÚ PRINCIPAL (HOME) -->
      <div id="screen-home" class="menu-screen active">
        <div class="menu-header-banner">
          <div class="arcade-main-logo">MICRO-VOLT RC</div>
          <div class="arcade-edition-tag">PC CD-ROM 1999 EDITION // v2.0</div>
        </div>

        <div class="main-buttons-stack">
          <button class="menu-pill-btn" data-mode="single">
            <span class="btn-tag">[ 01 ]</span>
            <div class="btn-texts">
              <span class="btn-title">CARRERA RAPIDA</span>
              <span class="btn-sub">SINGLE RACE // Elige auto y circuito</span>
            </div>
          </button>

          <button class="menu-pill-btn" data-mode="championship">
            <span class="btn-tag">[ 02 ]</span>
            <div class="btn-texts">
              <span class="btn-title">CAMPEONATO RC</span>
              <span class="btn-sub">CHAMPIONSHIP // Gran Premio de 3 pistas por puntos</span>
            </div>
          </button>

          <button class="menu-pill-btn" data-mode="timetrial">
            <span class="btn-tag">[ 03 ]</span>
            <div class="btn-texts">
              <span class="btn-title">CONTRARRELOJ</span>
              <span class="btn-sub">TIME TRIAL // Corre solo para batir el record</span>
            </div>
          </button>

          <button class="menu-pill-btn" data-mode="showroom">
            <span class="btn-tag">[ 04 ]</span>
            <div class="btn-texts">
              <span class="btn-title">GARAJE DE EXHIBICION</span>
              <span class="btn-sub">CAR SHOWROOM // Inspeccion 3D y personalizacion</span>
            </div>
          </button>

          <button class="menu-pill-btn" id="btn-open-settings">
            <span class="btn-tag">[ 05 ]</span>
            <div class="btn-texts">
              <span class="btn-title">CONFIGURACION</span>
              <span class="btn-sub">SETTINGS // Graficos, Audio y Controles</span>
            </div>
          </button>
        </div>

        <div class="menu-footer-hint">Navega con Clic o Teclado // Arrastra el auto con el mouse para rotarlo en 360 grados</div>
      </div>

      <!-- PANTALLA B: SELECTOR DE AUTO (GARAJE 3D) -->
      <div id="screen-garage" class="menu-screen">
        <div class="screen-top-bar">
          <button class="nav-back-btn" id="btn-garage-back">&lt;&lt; VOLVER</button>
          <div class="screen-title" id="garage-screen-title">GARAJE DE AUTOS RC</div>
          <button class="nav-next-btn" id="btn-garage-next">CONTINUAR &gt;&gt;</button>
        </div>

        <div class="garage-two-columns">
          <!-- Columna izquierda: Navegación de autos y personalización -->
          <div class="garage-car-picker-card">
            <div class="car-nav-row">
              <button class="arrow-btn" id="btn-car-prev">&lt;</button>
              <div class="car-headline">
                <div class="car-picker-name" id="car-display-name">DUSTY RED #18</div>
                <div class="car-picker-class" id="car-display-class">ORIGINAL FACTORY EDITION // 4WD</div>
              </div>
              <button class="arrow-btn" id="btn-car-next">&gt;</button>
            </div>

            <!-- Miniaturas rápidas de los 6 autos -->
            <div class="car-thumbs-strip" id="car-thumbs-strip">
              ${OFFICIAL_RC_CARS.map((c, i) => `
                <div class="car-thumb ${i === 0 ? 'selected' : ''}" data-index="${i}">
                  <span>#${c.dorsal}</span>
                </div>
              `).join('')}
            </div>

            <div class="customizer-block">
              <div class="custom-title">PINTURA DE CARROCERÍA:</div>
              <div class="color-swatches-row" id="color-swatches-row">
                ${COLOR_PALETTE.map((col, i) => `
                  <div class="color-swatch ${i === 0 ? 'selected' : ''}" style="background: ${col.css};" data-index="${i}" title="${col.name}"></div>
                `).join('')}
              </div>
            </div>

            <div class="customizer-block">
              <div class="custom-title">NUMERO DE DORSAL:</div>
              <div class="dorsal-buttons-row" id="dorsal-buttons-row">
                ${DORSALS.map((d, i) => `
                  <button class="dorsal-btn ${d === '18' ? 'selected' : ''}" data-dorsal="${d}">#${d}</button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Columna derecha: Ficha técnica estilo Re-Volt -->
          <div class="garage-specs-card">
            <div class="specs-title">FICHA TECNICA DEL AUTO RC</div>
            <div class="specs-desc" id="car-display-desc">Buggy RC clasico con esquema de pintura original rojo y flamas amarillas.</div>

            <div class="spec-stat-item">
              <div class="stat-meta"><span>VELOCIDAD MAXIMA</span><strong id="stat-val-speed">55 MPH</strong></div>
              <div class="stat-track"><div class="stat-fill cyan-fill" id="stat-bar-speed" style="width: 92%;"></div></div>
            </div>

            <div class="spec-stat-item">
              <div class="stat-meta"><span>ACELERACION</span><strong id="stat-val-accel">90%</strong></div>
              <div class="stat-track"><div class="stat-fill yellow-fill" id="stat-bar-accel" style="width: 90%;"></div></div>
            </div>

            <div class="spec-stat-item">
              <div class="stat-meta"><span>AGARRE Y ADHERENCIA</span><strong id="stat-val-grip">94%</strong></div>
              <div class="stat-track"><div class="stat-fill green-fill" id="stat-bar-grip" style="width: 94%;"></div></div>
            </div>

            <div class="spec-stat-item">
              <div class="stat-meta"><span>PESO DEL CHASIS</span><strong id="stat-val-weight">1.15 KG</strong></div>
              <div class="stat-track"><div class="stat-fill purple-fill" id="stat-bar-weight" style="width: 50%;"></div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- PANTALLA C: SELECTOR DE CIRCUITO Y REGLAS -->
      <div id="screen-track" class="menu-screen">
        <div class="screen-top-bar">
          <button class="nav-back-btn" id="btn-track-back">&lt;&lt; VOLVER</button>
          <div class="screen-title">SELECCION DE CIRCUITO Y REGLAS</div>
          <button class="nav-start-btn" id="btn-track-start">START RACE &gt;&gt;</button>
        </div>

        <div class="track-selection-grid">
          <!-- Tarjetas de Circuitos -->
          <div class="tracks-card-column">
            ${TRACK_INFOS.map((t, idx) => `
              <div class="track-select-card ${idx === 0 ? 'selected' : ''}" data-track="${idx}">
                <div class="track-card-header">
                  <span class="track-tag">${t.tag}</span>
                  <span class="track-record">RÉCORD: ${t.record}</span>
                </div>
                <div class="track-title-text">${t.name}</div>
                <div class="track-desc-text">${t.desc}</div>
                <div class="track-stats-row">
                  <span>Longitud: <strong>${t.lengthM}m</strong></span>
                  <span>Superficie: <strong>${t.surface || 'Asfalto / Acrobacias'}</strong></span>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Opciones de Reglas de Carrera -->
          <div class="rules-card-column">
            <div class="rules-header">CONFIGURACIÓN DE LA PRUEBA</div>

            <div class="rule-option-group">
              <label>NÚMERO DE VUELTAS:</label>
              <div class="toggle-buttons-row" data-rule="laps">
                <button class="toggle-btn selected" data-val="3">3 Vueltas</button>
                <button class="toggle-btn" data-val="5">5 Vueltas</button>
                <button class="toggle-btn" data-val="10">10 Vueltas</button>
              </div>
            </div>

            <div class="rule-option-group">
              <label>DIFICULTAD DE IA:</label>
              <div class="toggle-buttons-row" data-rule="aiDifficulty">
                <button class="toggle-btn" data-val="rookie">Fácil (Rookie)</button>
                <button class="toggle-btn selected" data-val="normal">Normal (Arcade)</button>
                <button class="toggle-btn" data-val="master">Difícil (Master)</button>
              </div>
            </div>

            <div class="rule-option-group">
              <label>HORA / AMBIENTE:</label>
              <div class="toggle-buttons-row" data-rule="timeOfDay">
                <button class="toggle-btn selected" data-val="day">Día Soleado</button>
                <button class="toggle-btn" data-val="sunset">Atardecer Naranja</button>
                <button class="toggle-btn" data-val="night">Noche Iluminada</button>
              </div>
            </div>

            <div class="rule-option-group">
              <label>ARMAS Y POWER-UPS:</label>
              <div class="toggle-buttons-row" data-rule="weaponsEnabled">
                <button class="toggle-btn selected" data-val="true">Activadas</button>
                <button class="toggle-btn" data-val="false">Carrera Limpia</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PANTALLA D: PANEL DE CONFIGURACIÓN -->
      <div id="screen-settings" class="menu-screen">
        <div class="screen-top-bar">
          <button class="nav-back-btn" id="btn-settings-back">&lt;&lt; VOLVER</button>
          <div class="screen-title">CONFIGURACIÓN DEL JUEGO</div>
          <div style="width: 100px;"></div>
        </div>

        <div class="settings-modal-card">
          <!-- Pestañas de configuración -->
          <div class="settings-tabs-header">
            <button class="settings-tab-btn active" data-tab="tab-graphics">GRÁFICOS</button>
            <button class="settings-tab-btn" data-tab="tab-audio">AUDIO</button>
            <button class="settings-tab-btn" data-tab="tab-gameplay">JUEGO Y CONTROLES</button>
          </div>

          <!-- Contenido Pestaña 1: Gráficos -->
          <div id="tab-graphics" class="settings-tab-pane active">
            <div class="setting-row">
              <span class="setting-label">Calidad de Sombras</span>
              <div class="toggle-buttons-row" data-setting="graphics.shadowQuality">
                <button class="toggle-btn" data-val="low">Baja</button>
                <button class="toggle-btn selected" data-val="medium">Media</button>
                <button class="toggle-btn" data-val="high">Alta</button>
              </div>
            </div>

            <div class="setting-row">
              <span class="setting-label">Escala de Resolución</span>
              <div class="toggle-buttons-row" data-setting="graphics.resolutionScale">
                <button class="toggle-btn" data-val="0.75">75%</button>
                <button class="toggle-btn selected" data-val="1.0">100%</button>
              </div>
            </div>

            <div class="setting-row">
              <span class="setting-label">Campo de Visión (FOV): <strong id="val-fov">70°</strong></span>
              <input type="range" min="60" max="85" value="70" class="arcade-slider" id="slider-fov" />
            </div>

            <div class="setting-row">
              <span class="setting-label">Mostrar Contador de FPS</span>
              <div class="toggle-buttons-row" data-setting="graphics.showFps">
                <button class="toggle-btn" data-val="true">Sí</button>
                <button class="toggle-btn selected" data-val="false">No</button>
              </div>
            </div>

            <div class="setting-row">
              <span class="setting-label">Pantalla Completa</span>
              <button class="action-small-btn" id="btn-fullscreen-toggle">Alternar Pantalla Completa (F11)</button>
            </div>
          </div>

          <!-- Contenido Pestaña 2: Audio -->
          <div id="tab-audio" class="settings-tab-pane">
            <div class="setting-row">
              <span class="setting-label">Volumen General: <strong id="val-vol-master">80%</strong></span>
              <input type="range" min="0" max="100" value="80" class="arcade-slider" id="slider-vol-master" />
            </div>

            <div class="setting-row">
              <span class="setting-label">Volumen Motor Eléctrico RC: <strong id="val-vol-motor">80%</strong></span>
              <input type="range" min="0" max="100" value="80" class="arcade-slider" id="slider-vol-motor" />
            </div>

            <div class="setting-row">
              <span class="setting-label">Efectos y Armas: <strong id="val-vol-sfx">90%</strong></span>
              <input type="range" min="0" max="100" value="90" class="arcade-slider" id="slider-vol-sfx" />
            </div>
          </div>

          <!-- Contenido Pestaña 3: Juego y Controles -->
          <div id="tab-gameplay" class="settings-tab-pane">
            <div class="setting-row">
              <span class="setting-label">Vista de Cámara Predeterminada</span>
              <div class="toggle-buttons-row" data-setting="gameplay.cameraView">
                <button class="toggle-btn selected" data-val="close">Rasante RC</button>
                <button class="toggle-btn" data-val="medium">Media</button>
                <button class="toggle-btn" data-val="far">Lejana</button>
              </div>
            </div>

            <div class="setting-row">
              <span class="setting-label">Unidad de Velocímetro</span>
              <div class="toggle-buttons-row" data-setting="gameplay.speedUnit">
                <button class="toggle-btn selected" data-val="mph">MPH</button>
                <button class="toggle-btn" data-val="kmh">KM/H</button>
              </div>
            </div>

            <div class="setting-row">
              <span class="setting-label">Sensibilidad de Dirección: <strong id="val-steer-sens">1.0x</strong></span>
              <input type="range" min="50" max="150" value="100" class="arcade-slider" id="slider-steer-sens" />
            </div>

            <!-- Tabla Visual de Controles -->
            <div class="controls-guide-table">
              <div class="guide-row"><span class="k-key">W / UP</span><span>Acelerar</span></div>
              <div class="guide-row"><span class="k-key">S / DOWN</span><span>Freno / Marcha Atrás</span></div>
              <div class="guide-row"><span class="k-key">A - D / LEFT - RIGHT</span><span>Dirección RC</span></div>
              <div class="guide-row"><span class="k-key">ESPACIO</span><span>Disparar Arma / Ítem</span></div>
              <div class="guide-row"><span class="k-key">SHIFT</span><span>Turbo Boost Nitro</span></div>
              <div class="guide-row"><span class="k-key">R</span><span>Reposicionar Auto en Pista</span></div>
              <div class="guide-row"><span class="k-key">C</span><span>Alternar Cámara Rasante / Lejana</span></div>
              <div class="guide-row"><span class="k-key">ESC</span><span>Pausa y Menú</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- OVERLAY DE PAUSA (ESC) -->
      <div id="screen-pause" class="menu-screen">
        <div class="pause-card">
          <div class="pause-title">PAUSA</div>
          <div class="pause-subtitle">CARRERA EN CURSO DETENIDA</div>

          <div class="pause-buttons-stack">
            <button class="arcade-btn" id="btn-pause-resume">REANUDAR CARRERA</button>
            <button class="arcade-btn" id="btn-pause-restart">REINICIAR CARRERA</button>
            <button class="arcade-btn" id="btn-pause-settings">CONFIGURACIÓN</button>
            <button class="arcade-btn danger-btn" id="btn-pause-quit">SALIR AL MENÚ PRINCIPAL</button>
          </div>
        </div>
      </div>

      <!-- SEMÁFORO DE SALIDA (3, 2, 1, GO!) -->
      <div id="overlay-countdown" class="countdown-overlay" style="display: none;">
        <div class="traffic-light-box">
          <div class="light-bulb bulb-red" id="light-bulb-3"></div>
          <div class="light-bulb bulb-yellow" id="light-bulb-2"></div>
          <div class="light-bulb bulb-yellow" id="light-bulb-1"></div>
          <div class="light-bulb bulb-green" id="light-bulb-go"></div>
        </div>
        <div class="countdown-digit" id="countdown-text">3</div>
      </div>

      <!-- MINIMAPA TRANSPARENTE EN CARRERA -->
      <div id="hud-minimap-container" class="minimap-container" style="display: none;">
        <canvas id="minimap-canvas" width="180" height="180"></canvas>
      </div>

      <!-- CLASIFICACIÓN INTERMEDIA DE CAMPEONATO -->
      <div id="screen-championship" class="menu-screen">
        <div class="championship-card">
          <div class="arcade-title">CAMPEONATO RC</div>
          <div class="arcade-subtitle" id="championship-status-subtitle">CLASIFICACIÓN GENERAL</div>

          <table class="results-table">
            <thead>
              <tr>
                <th>POS</th>
                <th>PILOTO</th>
                <th>PUNTOS TOTALES</th>
              </tr>
            </thead>
            <tbody id="championship-leaderboard-body"></tbody>
          </table>

          <div style="display: flex; gap: 16px; justify-content: center; margin-top: 24px;">
            <button class="arcade-btn" id="btn-champ-next">SIGUIENTE CARRERA &gt;&gt;</button>
            <button class="arcade-btn danger-btn" id="btn-champ-quit">ABANDONAR</button>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(this.root)
    this._attachButtonEvents()
  }

  _attachButtonEvents() {
    // 1. Pantalla Home: Botones de modos de juego
    this.root.querySelectorAll('.menu-pill-btn[data-mode]').forEach((btn) => {
      btn.addEventListener('mouseenter', () => this.settings.playHover())
      btn.addEventListener('click', () => {
        this.settings.playSelect()
        const mode = btn.dataset.mode
        this.gameMode = mode
        if (mode === 'showroom') {
          this.switchScreen('garage')
          this.root.querySelector('#garage-screen-title').textContent = 'GARAJE / SHOWROOM 3D'
          this.root.querySelector('#btn-garage-next').style.display = 'none'
        } else {
          this.switchScreen('garage')
          this.root.querySelector('#garage-screen-title').textContent = 'SELECCIONA TU AUTO RC'
          this.root.querySelector('#btn-garage-next').style.display = ''
        }
      })
    })

    // Botón Configuración en Home
    const btnSettings = this.root.querySelector('#btn-open-settings')
    btnSettings?.addEventListener('mouseenter', () => this.settings.playHover())
    btnSettings?.addEventListener('click', () => {
      this.settings.playSelect()
      this.switchScreen('settings')
    })

    // 2. Pantalla Garaje: Navegación de autos
    const btnPrevCar = this.root.querySelector('#btn-car-prev')
    const btnNextCar = this.root.querySelector('#btn-car-next')
    btnPrevCar?.addEventListener('click', () => {
      this.settings.playSelect()
      this.selectedCarIndex = (this.selectedCarIndex - 1 + OFFICIAL_RC_CARS.length) % OFFICIAL_RC_CARS.length
      this._updateCarSelection()
    })
    btnNextCar?.addEventListener('click', () => {
      this.settings.playSelect()
      this.selectedCarIndex = (this.selectedCarIndex + 1) % OFFICIAL_RC_CARS.length
      this._updateCarSelection()
    })

    // Miniaturas
    this.root.querySelectorAll('.car-thumb').forEach((thumb) => {
      thumb.addEventListener('mouseenter', () => this.settings.playHover())
      thumb.addEventListener('click', () => {
        this.settings.playSelect()
        this.selectedCarIndex = parseInt(thumb.dataset.index, 10)
        this._updateCarSelection()
      })
    })

    // Colores
    this.root.querySelectorAll('.color-swatch').forEach((swatch) => {
      swatch.addEventListener('mouseenter', () => this.settings.playHover())
      swatch.addEventListener('click', () => {
        this.settings.playSelect()
        this.root.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('selected'))
        swatch.classList.add('selected')
        const idx = parseInt(swatch.dataset.index, 10)
        this.selectedColor = COLOR_PALETTE[idx]
        this._updateGarageCar()
      })
    })

    // Dorsales
    this.root.querySelectorAll('.dorsal-btn').forEach((btn) => {
      btn.addEventListener('mouseenter', () => this.settings.playHover())
      btn.addEventListener('click', () => {
        this.settings.playSelect()
        this.root.querySelectorAll('.dorsal-btn').forEach((b) => b.classList.remove('selected'))
        btn.classList.add('selected')
        this.selectedDorsal = btn.dataset.dorsal
        this._updateGarageCar()
      })
    })

    // Volver y Continuar en Garaje
    this.root.querySelector('#btn-garage-back')?.addEventListener('click', () => {
      this.settings.playBack()
      this.switchScreen('home')
    })
    this.root.querySelector('#btn-garage-next')?.addEventListener('click', () => {
      this.settings.playSelect()
      this.switchScreen('track')
    })

    // 3. Pantalla Track: Selección de circuito
    this.root.querySelectorAll('.track-select-card').forEach((card) => {
      card.addEventListener('mouseenter', () => this.settings.playHover())
      card.addEventListener('click', () => {
        this.settings.playSelect()
        this.root.querySelectorAll('.track-select-card').forEach((c) => c.classList.remove('selected'))
        card.classList.add('selected')
        this.selectedTrackIndex = parseInt(card.dataset.track, 10)
      })
    })

    // Toggles de reglas
    this.root.querySelectorAll('.toggle-buttons-row[data-rule]').forEach((row) => {
      const ruleKey = row.dataset.rule
      row.querySelectorAll('.toggle-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => this.settings.playHover())
        btn.addEventListener('click', () => {
          this.settings.playSelect()
          row.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('selected'))
          btn.classList.add('selected')
          let val = btn.dataset.val
          if (val === 'true') val = true
          else if (val === 'false') val = false
          else if (!isNaN(Number(val))) val = Number(val)
          this.raceRules[ruleKey] = val
        })
      })
    })

    this.root.querySelector('#btn-track-back')?.addEventListener('click', () => {
      this.settings.playBack()
      this.switchScreen('garage')
    })

    this.root.querySelector('#btn-track-start')?.addEventListener('click', () => {
      this.settings.playSelect()
      this.startConfiguredRace()
    })

    // 4. Pantalla Settings: Pestañas
    this.root.querySelectorAll('.settings-tab-btn').forEach((tabBtn) => {
      tabBtn.addEventListener('mouseenter', () => this.settings.playHover())
      tabBtn.addEventListener('click', () => {
        this.settings.playSelect()
        this.root.querySelectorAll('.settings-tab-btn').forEach((b) => b.classList.remove('active'))
        this.root.querySelectorAll('.settings-tab-pane').forEach((p) => p.classList.remove('active'))
        tabBtn.classList.add('active')
        const target = this.root.querySelector(`#${tabBtn.dataset.tab}`)
        target?.classList.add('active')
      })
    })

    this.root.querySelector('#btn-settings-back')?.addEventListener('click', () => {
      this.settings.playBack()
      if (this.isPaused) {
        this.switchScreen('pause')
      } else {
        this.switchScreen('home')
      }
    })

    // Sliders de Settings
    const sliderFov = this.root.querySelector('#slider-fov')
    sliderFov?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10)
      this.root.querySelector('#val-fov').textContent = `${val}°`
      this.settings.set('graphics', 'fov', val)
    })

    const sliderVolMaster = this.root.querySelector('#slider-vol-master')
    sliderVolMaster?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) / 100
      this.root.querySelector('#val-vol-master').textContent = `${Math.round(val * 100)}%`
      this.settings.set('audio', 'masterVolume', val)
      this.settings.updateVolumes()
    })

    const sliderVolMotor = this.root.querySelector('#slider-vol-motor')
    sliderVolMotor?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) / 100
      this.root.querySelector('#val-vol-motor').textContent = `${Math.round(val * 100)}%`
      this.settings.set('audio', 'motorVolume', val)
    })

    const sliderVolSfx = this.root.querySelector('#slider-vol-sfx')
    sliderVolSfx?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) / 100
      this.root.querySelector('#val-vol-sfx').textContent = `${Math.round(val * 100)}%`
      this.settings.set('audio', 'sfxVolume', val)
      this.settings.updateVolumes()
    })

    const sliderSteer = this.root.querySelector('#slider-steer-sens')
    sliderSteer?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) / 100
      this.root.querySelector('#val-steer-sens').textContent = `${val.toFixed(1)}x`
      this.settings.set('gameplay', 'steerSensitivity', val)
    })

    this.root.querySelector('#btn-fullscreen-toggle')?.addEventListener('click', () => {
      this.settings.playSelect()
      this.settings.toggleFullscreen()
    })

    // 5. Botones de Pausa
    this.root.querySelector('#btn-pause-resume')?.addEventListener('click', () => {
      this.settings.playSelect()
      this.resumeRace()
    })
    this.root.querySelector('#btn-pause-restart')?.addEventListener('click', () => {
      this.settings.playSelect()
      this.isPaused = false
      this.switchScreen('none')
      if (this.onRestartRace) this.onRestartRace()
      this.triggerCountdown()
    })
    this.root.querySelector('#btn-pause-settings')?.addEventListener('click', () => {
      this.settings.playSelect()
      this.switchScreen('settings')
    })
    this.root.querySelector('#btn-pause-quit')?.addEventListener('click', () => {
      this.settings.playBack()
      this.isPaused = false
      this.switchScreen('home')
      if (this.onQuitToMenu) this.onQuitToMenu()
    })

    // 6. Botones de Campeonato
    this.root.querySelector('#btn-champ-next')?.addEventListener('click', () => {
      this.settings.playSelect()
      this.advanceChampionship()
    })
    this.root.querySelector('#btn-champ-quit')?.addEventListener('click', () => {
      this.settings.playBack()
      this.championship.isActive = false
      this.switchScreen('home')
      if (this.onQuitToMenu) this.onQuitToMenu()
    })
  }

  _attachKeyListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.currentScreen === 'settings' && this.isPaused) {
          this.switchScreen('pause')
          e.preventDefault()
          return
        }
        if (this.currentScreen === 'none' && !this.isCountingDown) {
          this.pauseRace()
          e.preventDefault()
          return
        }
        if (this.currentScreen === 'pause') {
          this.resumeRace()
          e.preventDefault()
          return
        }
      }
    })
  }

  _updateCarSelection() {
    const car = OFFICIAL_RC_CARS[this.selectedCarIndex]
    this.selectedColor = COLOR_PALETTE.find((c) => c.hex === car.defaultColor) || COLOR_PALETTE[0]

    // Actualizar nombre y clase
    this.root.querySelector('#car-display-name').textContent = car.name
    this.root.querySelector('#car-display-class').textContent = `CLASE: ${car.class.toUpperCase()} • ${car.drivetrain}`
    this.root.querySelector('#car-display-desc').textContent = car.desc

    // Actualizar barras animadas
    this.root.querySelector('#stat-val-speed').textContent = `${car.topSpeedMph} MPH`
    this.root.querySelector('#stat-bar-speed').style.width = `${car.speedPercent}%`

    this.root.querySelector('#stat-val-accel').textContent = `${car.accelPercent}%`
    this.root.querySelector('#stat-bar-accel').style.width = `${car.accelPercent}%`

    this.root.querySelector('#stat-val-grip').textContent = `${car.gripPercent}%`
    this.root.querySelector('#stat-bar-grip').style.width = `${car.gripPercent}%`

    this.root.querySelector('#stat-val-weight').textContent = `${car.weightKg} KG`
    this.root.querySelector('#stat-bar-weight').style.width = `${car.weightPercent}%`

    // Actualizar miniaturas
    this.root.querySelectorAll('.car-thumb').forEach((t, i) => {
      t.classList.toggle('selected', i === this.selectedCarIndex)
    })

    // Actualizar muestra de color seleccionada
    this.root.querySelectorAll('.color-swatch').forEach((s, i) => {
      s.classList.toggle('selected', COLOR_PALETTE[i].hex === this.selectedColor.hex)
    })

    this._updateGarageCar()
  }

  _updateGarageCar() {
    if (this.garage) {
      const car = OFFICIAL_RC_CARS[this.selectedCarIndex]
      this.garage.setCar(car, this.selectedColor.hex, this.selectedDorsal)
    }
  }

  switchScreen(screenName) {
    this.currentScreen = screenName
    this.root.querySelectorAll('.menu-screen').forEach((screen) => {
      screen.classList.remove('active')
    })

    if (screenName !== 'none') {
      const target = this.root.querySelector(`#screen-${screenName}`)
      target?.classList.add('active')
      this.garage?.setVisible(screenName !== 'pause')
      this.setHudVisible(false)
      this.setMinimapVisible(false)
    } else {
      this.garage?.setVisible(false)
      this.setHudVisible(true)
      this.setMinimapVisible(true)
    }
  }

  setHudVisible(visible) {
    const hudTopLeft = document.getElementById('hud-top-left')
    const hudTopRight = document.getElementById('hud-top-right')
    const hudBottomLeft = document.getElementById('hud-bottom-left')
    const hudBottomRight = document.getElementById('hud-bottom-right')
    const displayVal = visible ? '' : 'none'
    if (hudTopLeft) hudTopLeft.style.display = displayVal
    if (hudTopRight) hudTopRight.style.display = displayVal
    if (hudBottomLeft) hudBottomLeft.style.display = displayVal
    if (hudBottomRight) hudBottomRight.style.display = displayVal
  }

  setMinimapVisible(visible) {
    const mm = this.root.querySelector('#hud-minimap-container')
    if (mm) mm.style.display = visible ? 'block' : 'none'
  }

  startConfiguredRace() {
    this.switchScreen('none')
    const car = OFFICIAL_RC_CARS[this.selectedCarIndex]

    if (this.gameMode === 'championship') {
      this.championship.isActive = true
      this.championship.currentRaceIndex = 0
      this.selectedTrackIndex = 0 // Primera carrera: Suburban
    }

    if (this.onStartRace) {
      this.onStartRace({
        car,
        colorHex: this.selectedColor.hex,
        dorsal: this.selectedDorsal,
        trackIndex: this.selectedTrackIndex,
        rules: this.raceRules,
        gameMode: this.gameMode,
      })
    }

    this.triggerCountdown()
  }

  triggerCountdown() {
    this.isCountingDown = true
    const overlay = this.root.querySelector('#overlay-countdown')
    const textElem = this.root.querySelector('#countdown-text')
    const bulb3 = this.root.querySelector('#light-bulb-3')
    const bulb2 = this.root.querySelector('#light-bulb-2')
    const bulb1 = this.root.querySelector('#light-bulb-1')
    const bulbGo = this.root.querySelector('#light-bulb-go')

    if (!overlay) return
    overlay.style.display = 'flex'

    // Reset de focos
    bulb3.classList.remove('lit')
    bulb2.classList.remove('lit')
    bulb1.classList.remove('lit')
    bulbGo.classList.remove('lit')

    // 3...
    textElem.textContent = '3'
    bulb3.classList.add('lit')
    this.settings.playCountdownBeep(false)
    if (this.onCountdownStep) this.onCountdownStep(3)

    setTimeout(() => {
      // 2...
      textElem.textContent = '2'
      bulb2.classList.add('lit')
      this.settings.playCountdownBeep(false)
      if (this.onCountdownStep) this.onCountdownStep(2)
    }, 1000)

    setTimeout(() => {
      // 1...
      textElem.textContent = '1'
      bulb1.classList.add('lit')
      this.settings.playCountdownBeep(false)
      if (this.onCountdownStep) this.onCountdownStep(1)
    }, 2000)

    setTimeout(() => {
      // ¡GO!
      textElem.textContent = '¡GO!'
      textElem.style.color = '#22c55e'
      bulbGo.classList.add('lit')
      this.settings.playCountdownBeep(true)
      this.isCountingDown = false
      if (this.onCountdownStep) this.onCountdownStep('GO')
    }, 3000)

    setTimeout(() => {
      overlay.style.display = 'none'
      textElem.style.color = '#fde047'
      if (this.onCountdownStep) this.onCountdownStep(null)
    }, 3900)
  }

  pauseRace() {
    this.isPaused = true
    this.switchScreen('pause')
  }

  resumeRace() {
    this.isPaused = false
    this.switchScreen('none')
    if (this.onResumeRace) this.onResumeRace()
  }

  /**
   * Actualiza el minimapa transparente en tiempo real.
   */
  updateMinimap(waypoints, racers) {
    if (this.currentScreen !== 'none' || !waypoints || waypoints.length === 0) return

    const canvas = this.root.querySelector('#minimap-canvas')
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    // Fondo transparente ahumado
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'
    ctx.beginPath()
    ctx.roundRect(0, 0, w, h, 14)
    ctx.fill()
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 2
    ctx.stroke()

    // Encontrar límites de waypoints para normalizar al canvas
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const wp of waypoints) {
      if (wp[0] < minX) minX = wp[0]
      if (wp[0] > maxX) maxX = wp[0]
      if (wp[2] < minZ) minZ = wp[2]
      if (wp[2] > maxZ) maxZ = wp[2]
    }

    const pad = 24
    const scaleX = (w - pad * 2) / (maxX - minX || 1)
    const scaleZ = (h - pad * 2) / (maxZ - minZ || 1)

    const toCanvasX = (worldX) => pad + (worldX - minX) * scaleX
    const toCanvasY = (worldZ) => pad + (worldZ - minZ) * scaleZ

    // Dibujar trazado del circuito
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    waypoints.forEach((wp, idx) => {
      const cx = toCanvasX(wp[0])
      const cy = toCanvasY(wp[2])
      if (idx === 0) ctx.moveTo(cx, cy)
      else ctx.lineTo(cx, cy)
    })
    ctx.closePath()
    ctx.stroke()

    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 2
    ctx.stroke()

    // Dibujar corredores (puntos de colores)
    if (racers) {
      racers.forEach((r) => {
        const pos = r.vehicle?.chassisBody?.position
        if (!pos) return
        const rx = toCanvasX(pos.x)
        const ry = toCanvasY(pos.z)

        ctx.beginPath()
        ctx.arc(rx, ry, r.isPlayer ? 5.5 : 4, 0, Math.PI * 2)

        if (r.isPlayer) {
          ctx.fillStyle = '#22c55e'
          ctx.fill()
          ctx.lineWidth = 2
          ctx.strokeStyle = '#ffffff'
          ctx.stroke()
        } else {
          ctx.fillStyle = r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#ef4444'
          ctx.fill()
        }
      })
    }
  }

  showChampionshipResults(results) {
    const pointsTable = [10, 6, 4, 3, 2, 1]
    results.forEach((r, idx) => {
      const pts = pointsTable[idx] || 0
      this.championship.points[r.name] = (this.championship.points[r.name] || 0) + pts
    })

    const body = this.root.querySelector('#championship-leaderboard-body')
    if (!body) return

    const sortedStandings = Object.entries(this.championship.points)
      .map(([name, pts]) => ({ name, pts }))
      .sort((a, b) => b.pts - a.pts)

    body.innerHTML = sortedStandings.map((s, idx) => `
      <tr class="${s.name.includes('Tú') ? 'player-row' : ''}">
        <td><strong>#${idx + 1}</strong></td>
        <td>${s.name}</td>
        <td><strong>${s.pts} PTS</strong></td>
      </tr>
    `).join('')

    const subtitle = this.root.querySelector('#championship-status-subtitle')
    const btnNext = this.root.querySelector('#btn-champ-next')

    if (this.championship.currentRaceIndex === 0) {
      subtitle.textContent = 'CARRERA 1 DE 3 COMPLETADA'
      btnNext.textContent = 'CARRERA 2: SKETCHBOOK OVAL >>'
    } else if (this.championship.currentRaceIndex === 1) {
      subtitle.textContent = 'CARRERA 2 DE 3 COMPLETADA'
      btnNext.textContent = 'CARRERA 3: DESERT GRAND PRIX >>'
    } else {
      subtitle.textContent = 'CAMPEONATO FINALIZADO // PODIO OFICIAL'
      btnNext.textContent = 'FINALIZAR CAMPEONATO'
    }

    this.switchScreen('championship')
  }

  advanceChampionship() {
    if (this.championship.currentRaceIndex < 2) {
      this.championship.currentRaceIndex++
      this.selectedTrackIndex = this.championship.currentRaceIndex
      this.startConfiguredRace()
    } else {
      this.championship.isActive = false
      this.switchScreen('home')
      if (this.onQuitToMenu) this.onQuitToMenu()
    }
  }

  isMenuOpen() {
    return this.currentScreen !== 'none'
  }
}
