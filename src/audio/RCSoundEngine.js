/**
 * RCSoundEngine.js - Procedural RC Electric Motor & Tire Drift Sound Synthesizer
 * Built entirely with Web Audio API (Zero external assets).
 */

export class RCSoundEngine {
  constructor() {
    this.ctx = null
    this.isInitialized = false
    this.isMuted = false
    this.masterGain = null

    // Motor synthesis nodes
    this.oscSaw = null
    this.oscTri = null
    this.motorFilter = null
    this.motorGain = null

    // Tire slide (white noise) synthesis nodes
    this.noiseSource = null
    this.slideFilter = null
    this.slideGain = null

    // State tracking
    this.currentMotorFreq = 120
    this.targetMotorFreq = 120

    this._onUserInteraction = this._onUserInteraction.bind(this)
    this._attachGestureListeners()
  }

  _attachGestureListeners() {
    if (typeof window === 'undefined') return
    const events = ['keydown', 'pointerdown', 'touchstart']
    const handler = () => {
      this.init()
      this.resume()
      events.forEach((evt) => window.removeEventListener(evt, handler))
    }
    events.forEach((evt) => window.addEventListener(evt, handler, { once: true }))
  }

  init() {
    if (this.isInitialized || typeof window === 'undefined') return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) {
      console.warn('Web Audio API no está soportada en este entorno.')
      return
    }

    try {
      this.ctx = new AudioContextClass()
      const now = this.ctx.currentTime

      // Master output
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(0.5, now)
      this.masterGain.connect(this.ctx.destination)

      // --- 1. Electric RC Motor (ESC PWM + brushless motor whine) ---
      this.oscSaw = this.ctx.createOscillator()
      this.oscSaw.type = 'sawtooth'
      this.oscSaw.frequency.setValueAtTime(110, now)

      this.oscTri = this.ctx.createOscillator()
      this.oscTri.type = 'triangle'
      this.oscTri.frequency.setValueAtTime(220, now)

      this.motorFilter = this.ctx.createBiquadFilter()
      this.motorFilter.type = 'lowpass'
      this.motorFilter.frequency.setValueAtTime(600, now)
      this.motorFilter.Q.setValueAtTime(4.0, now)

      this.motorGain = this.ctx.createGain()
      this.motorGain.gain.setValueAtTime(0.01, now)

      // Connect motor: oscillators -> filter -> motorGain -> masterGain
      this.oscSaw.connect(this.motorFilter)
      this.oscTri.connect(this.motorFilter)
      this.motorFilter.connect(this.motorGain)
      this.motorGain.connect(this.masterGain)

      this.oscSaw.start()
      this.oscTri.start()

      // --- 2. Tire Drift / Slide (Filtered White Noise) ---
      const bufferSize = this.ctx.sampleRate * 2
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }

      this.noiseSource = this.ctx.createBufferSource()
      this.noiseSource.buffer = noiseBuffer
      this.noiseSource.loop = true

      this.slideFilter = this.ctx.createBiquadFilter()
      this.slideFilter.type = 'bandpass'
      this.slideFilter.frequency.setValueAtTime(1200, now)
      this.slideFilter.Q.setValueAtTime(1.8, now)

      this.slideGain = this.ctx.createGain()
      this.slideGain.gain.setValueAtTime(0.0, now)

      this.noiseSource.connect(this.slideFilter)
      this.slideFilter.connect(this.slideGain)
      this.slideGain.connect(this.masterGain)

      this.noiseSource.start()

      this.isInitialized = true
    } catch (e) {
      console.warn('Error al inicializar AudioContext:', e)
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  _onUserInteraction() {
    this.init()
    this.resume()
  }

  /**
   * Update engine sound and drift noise each frame.
   * @param {Object} state
   * @param {number} state.speedKmh - Current vehicle speed in km/h
   * @param {number} state.maxSpeedKmh - Max speed with boost
   * @param {boolean} state.isThrottle - True if accelerating
   * @param {boolean} state.isBraking - True if braking or in reverse
   * @param {boolean} state.isSliding - True if wheels are drifting/sliding
   * @param {boolean} state.isAirborne - True if car is airborne
   * @param {number} state.lateralSlip - Normalized lateral slip amount (0 to 1+)
   */
  update({
    speedKmh = 0,
    maxSpeedKmh = 140,
    isThrottle = false,
    isBraking = false,
    isSliding = false,
    isAirborne = false,
    lateralSlip = 0,
  } = {}) {
    if (!this.isInitialized || !this.ctx || this.ctx.state !== 'running') return

    const now = this.ctx.currentTime
    const speedNorm = Math.min(Math.max(speedKmh / maxSpeedKmh, 0), 1.2)

    // --- Motor Sound Dynamics ---
    // High-pitched electric motor pitch mapping:
    // Idle: ~90 Hz, Max speed: ~900 Hz, with boost up to ~1100 Hz
    let baseFreq = 95 + speedNorm * 750
    if (isThrottle) baseFreq += 45 // Pitch bump under electric load
    if (isAirborne && isThrottle) baseFreq += 180 // Free-spinning unloaded wheels whine higher

    // Smooth frequency interpolation
    this.targetMotorFreq = baseFreq
    this.currentMotorFreq += (this.targetMotorFreq - this.currentMotorFreq) * 0.25

    this.oscSaw.frequency.setTargetAtTime(this.currentMotorFreq, now, 0.04)
    this.oscTri.frequency.setTargetAtTime(this.currentMotorFreq * 1.5, now, 0.04)

    // Filter opens with speed and throttle (giving that crisp RC whine)
    const filterFreq = 500 + speedNorm * 2800 + (isThrottle ? 600 : 0)
    this.motorFilter.frequency.setTargetAtTime(filterFreq, now, 0.05)

    // Volume depends on speed, throttle, and braking (0.0 when stopped/idle)
    let motorVol = 0.0
    if (speedKmh > 2 || isThrottle) {
      motorVol = 0.08 + speedNorm * 0.22 + (isThrottle ? 0.08 : 0)
    }
    if (this.isMuted) motorVol = 0
    this.motorGain.gain.setTargetAtTime(motorVol, now, 0.05)

    // --- Drift & Skid Noise Dynamics ---
    let driftVol = 0
    if (isSliding && !isAirborne && speedKmh > 12) {
      const slipFactor = Math.min(Math.max(lateralSlip, 0.3), 1.0)
      driftVol = 0.08 + slipFactor * 0.28
      // Modulate filter frequency based on slide violence
      const driftFilterCutoff = 900 + slipFactor * 1400
      this.slideFilter.frequency.setTargetAtTime(driftFilterCutoff, now, 0.04)
    }
    if (this.isMuted) driftVol = 0
    this.slideGain.gain.setTargetAtTime(driftVol, now, 0.03)
  }

  /**
   * Silencia instantáneamente el motor y los derrapes (usado en menús, pausas y fin de carrera).
   */
  silence() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    if (this.motorGain) {
      this.motorGain.gain.setTargetAtTime(0, now, 0.03)
    }
    if (this.slideGain) {
      this.slideGain.gain.setTargetAtTime(0, now, 0.03)
    }
  }

  setMuted(muted) {
    this.isMuted = muted
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05)
    }
  }

  dispose() {
    if (this.ctx) {
      try {
        this.ctx.close()
      } catch (e) {}
    }
  }
}
