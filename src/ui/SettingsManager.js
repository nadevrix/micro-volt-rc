/**
 * SettingsManager.js - Gestor de configuración persistente (localStorage)
 * y sintetizador de audio para la interfaz arcade.
 */

const STORAGE_KEY = 'microvolt_rc_settings_v1'

export const DEFAULT_SETTINGS = {
  graphics: {
    shadowQuality: 'medium', // 'low' | 'medium' | 'high'
    resolutionScale: 1.0,     // 0.75 | 1.0
    fov: 70,                 // 60 - 85
    showFps: false,
  },
  audio: {
    masterVolume: 0.8,
    motorVolume: 0.8,
    sfxVolume: 0.9,
  },
  gameplay: {
    cameraView: 'close',     // 'close' | 'medium' | 'far'
    speedUnit: 'mph',        // 'mph' | 'kmh'
    steerSensitivity: 1.0,   // 0.5 - 1.5
  },
}

export class SettingsManager {
  constructor() {
    this.settings = this.load()
    this.audioCtx = null
    this.uiMasterGain = null
    this._initAudio()
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          graphics: { ...DEFAULT_SETTINGS.graphics, ...(parsed.graphics || {}) },
          audio: { ...DEFAULT_SETTINGS.audio, ...(parsed.audio || {}) },
          gameplay: { ...DEFAULT_SETTINGS.gameplay, ...(parsed.gameplay || {}) },
        }
      }
    } catch (e) {
      console.warn('No se pudo cargar settings de localStorage:', e)
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    } catch (e) {
      console.warn('Error guardando en localStorage:', e)
    }
  }

  get(category, key) {
    return this.settings[category]?.[key]
  }

  set(category, key, value) {
    if (!this.settings[category]) this.settings[category] = {}
    this.settings[category][key] = value
    this.save()
  }

  // --- Sintetizador Web Audio para Interfaz Arcade ---

  _initAudio() {
    if (typeof window === 'undefined') return
    const initCtx = () => {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx && !this.audioCtx) {
        this.audioCtx = new AudioCtx()
        this.uiMasterGain = this.audioCtx.createGain()
        this.uiMasterGain.gain.setValueAtTime(this.settings.audio.masterVolume * this.settings.audio.sfxVolume, this.audioCtx.currentTime)
        this.uiMasterGain.connect(this.audioCtx.destination)
      }
      window.removeEventListener('pointerdown', initCtx)
      window.removeEventListener('keydown', initCtx)
    }
    window.addEventListener('pointerdown', initCtx, { once: true })
    window.addEventListener('keydown', initCtx, { once: true })
  }

  _resumeAudio() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
  }

  playHover() {
    this._resumeAudio()
    if (!this.audioCtx || this.uiMasterGain.gain.value <= 0.01) return
    try {
      const now = this.audioCtx.currentTime
      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(540, now)
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.04)

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

      osc.connect(gain)
      gain.connect(this.uiMasterGain)

      osc.start(now)
      osc.stop(now + 0.045)
    } catch (e) {}
  }

  playSelect() {
    this._resumeAudio()
    if (!this.audioCtx || this.uiMasterGain.gain.value <= 0.01) return
    try {
      const now = this.audioCtx.currentTime
      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(660, now)
      osc.frequency.setValueAtTime(880, now + 0.05)
      osc.frequency.setValueAtTime(1100, now + 0.1)

      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

      osc.connect(gain)
      gain.connect(this.uiMasterGain)

      osc.start(now)
      osc.stop(now + 0.19)
    } catch (e) {}
  }

  playBack() {
    this._resumeAudio()
    if (!this.audioCtx || this.uiMasterGain.gain.value <= 0.01) return
    try {
      const now = this.audioCtx.currentTime
      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.1)

      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

      osc.connect(gain)
      gain.connect(this.uiMasterGain)

      osc.start(now)
      osc.stop(now + 0.11)
    } catch (e) {}
  }

  playCountdownBeep(isFinal = false) {
    this._resumeAudio()
    if (!this.audioCtx || this.uiMasterGain.gain.value <= 0.01) return
    try {
      const now = this.audioCtx.currentTime
      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()

      if (isFinal) {
        // Sonido triunfal ¡GO! (doble tono armónico alto)
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(880, now)
        osc.frequency.setValueAtTime(1320, now + 0.06)

        gain.gain.setValueAtTime(0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

        osc.connect(gain)
        gain.connect(this.uiMasterGain)

        osc.start(now)
        osc.stop(now + 0.65)
      } else {
        // Tono corto estándar de cuenta regresiva (3, 2, 1)
        osc.type = 'square'
        osc.frequency.setValueAtTime(440, now)

        gain.gain.setValueAtTime(0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

        osc.connect(gain)
        gain.connect(this.uiMasterGain)

        osc.start(now)
        osc.stop(now + 0.16)
      }
    } catch (e) {}
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  updateVolumes() {
    if (this.uiMasterGain && this.audioCtx) {
      const vol = this.settings.audio.masterVolume * this.settings.audio.sfxVolume
      this.uiMasterGain.gain.setValueAtTime(vol, this.audioCtx.currentTime)
    }
  }
}
