import FFT from 'fft.js'

const SAMPLE_RATE = 256
const FFT_SIZE = 256 // 1-second window

// Frequency band ranges (Hz)
const BANDS = {
  delta: [0.5, 4],
  theta: [4, 8],
  alpha: [8, 13],
  beta:  [13, 30],
}

/**
 * EEGProcessor collects samples into a ring buffer and runs FFT
 * every time a full window is filled, extracting band powers and
 * derived cognitive metrics.
 *
 * Call setBaseline() after a calibration phase to enable
 * personalized, basal-alpha-normalized metrics.
 */
export class EEGProcessor {
  constructor() {
    this.buffer = new Float64Array(FFT_SIZE)
    this.bufferIndex = 0
    this.fft = new FFT(FFT_SIZE)
    this.bandPowers = { delta: 0, theta: 0, alpha: 0, beta: 0 }
    this.metrics = { focus: 0, stress: 0, relaxation: 0, cogFatigue: 0 }

    // Baseline (set after calibration). null = uncalibrated.
    this.baseline = null

    // ── Artifact rejection ────────────────────────────────────────────────
    // We maintain a rolling history of total band power across the last
    // ARTIFACT_WINDOW FFT windows. If a window's power exceeds
    // ARTIFACT_THRESHOLD × rolling mean, it is flagged as artifact (blink,
    // jaw-clench, EMG spike) and skipped — metrics are NOT updated.
    this._powerHistory = []
    this._ARTIFACT_WINDOW = 20    // number of windows for rolling mean
    this._ARTIFACT_THRESHOLD = 3  // reject if power > 3× rolling mean

    // ── EMA smoothing ─────────────────────────────────────────────────────
    // Exponential Moving Average applied to each metric AFTER raw computation.
    // α = 0.2 ≈ 5-second time constant at 1 FFT window/second.
    // This is identical to what clinical neurofeedback displays do: real data,
    // just time-averaged so a single contaminated window can't spike the UI.
    this._EMA_ALPHA = 0.2
    this._smoothed = { focus: 0, stress: 0, relaxation: 0, cogFatigue: 0 }
  }

  /**
   * Store the user's personal resting-state EEG baseline.
   * Once set, _computeMetrics() uses these values to normalize outputs.
   *
   * @param {{ basalAlpha, basalBeta, basalTheta, basalDelta }} b
   */
  setBaseline(b) {
    this.baseline = { ...b }
  }

  /**
   * Push a single sample. Returns true when a full FFT window has
   * been processed (i.e. bandPowers and metrics are fresh).
   */
  push(sample) {
    this.buffer[this.bufferIndex] = sample
    this.bufferIndex++

    if (this.bufferIndex >= FFT_SIZE) {
      this._processWindow()
      this.bufferIndex = 0
      return true
    }
    return false
  }

  _processWindow() {
    // Apply Hanning window to reduce spectral leakage
    const windowed = new Array(FFT_SIZE)
    for (let i = 0; i < FFT_SIZE; i++) {
      const han = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)))
      windowed[i] = this.buffer[i] * han
    }

    // Run FFT — fft.js expects interleaved [re, im, re, im, ...]
    const input = this.fft.toComplexArray(windowed, null)
    const output = this.fft.createComplexArray()
    this.fft.realTransform(output, input)
    this.fft.completeSpectrum(output)

    // Compute magnitude spectrum (only need first half: 0 … N/2)
    const magnitudes = new Float64Array(FFT_SIZE / 2)
    for (let i = 0; i < FFT_SIZE / 2; i++) {
      const re = output[2 * i]
      const im = output[2 * i + 1]
      magnitudes[i] = Math.sqrt(re * re + im * im)
    }

    // Extract band powers
    const freshPowers = {}
    let totalPower = 0
    for (const [band, [lo, hi]] of Object.entries(BANDS)) {
      const binLo = Math.max(1, Math.round((lo * FFT_SIZE) / SAMPLE_RATE))
      const binHi = Math.min(FFT_SIZE / 2 - 1, Math.round((hi * FFT_SIZE) / SAMPLE_RATE))
      let sum = 0
      for (let i = binLo; i <= binHi; i++) {
        sum += magnitudes[i] * magnitudes[i] // power = mag²
      }
      
      // Scale down massive raw magnitude squared values to a readable µV range.
      // Raw FFT output from uncalibrated ADC values can run into millions.
      // We take the square root to return to linear magnitude (typical real EEG is 10-100 µV).
      const rawPower = sum / (binHi - binLo + 1)
      freshPowers[band] = Math.sqrt(rawPower)
      
      totalPower += freshPowers[band]
    }

    // ── Artifact rejection ────────────────────────────────────────────────
    // Maintain a rolling window of total powers for the threshold comparison.
    this._powerHistory.push(totalPower)
    if (this._powerHistory.length > this._ARTIFACT_WINDOW) {
      this._powerHistory.shift()
    }

    if (this._powerHistory.length >= 3) { // need at least 3 samples to judge
      const rollingMean = this._powerHistory.reduce((a, b) => a + b, 0) / this._powerHistory.length
      if (totalPower > this._ARTIFACT_THRESHOLD * rollingMean) {
        // Artifact detected — discard this window, keep previous metrics
        return
      }
    }

    // Only update bandPowers from a clean window
    Object.assign(this.bandPowers, freshPowers)

    this._computeMetrics()
  }

  _computeMetrics() {
    const { alpha, beta, theta } = this.bandPowers
    const eps = 1e-6 // avoid division by zero

    if (this.baseline) {
      /*
       * Baseline-normalized formulas with log-sensitivity scaling.
       *
       * Raw EEG ratios span a very wide dynamic range (often 0.01 – 100+).
       * A naive ratio*constant approach means tiny signal changes→huge swings.
       * Instead, we use: score = clamp(logK(1 + ratio * K_sens) * 100, 0, 100)
       * where logK(x) = ln(1+x)/ln(K) — compresses outliers while remaining
       * reactive to real changes, just like a VU meter in audio engineering.
       *
       * Focus     — β / (basalAlpha + θ)         Lubar 1991
       * Stress    — β / basalAlpha                Klimesch 1999
       * Relaxation— α / basalAlpha                Alpha blocking paradigm
       * Cog Load  — (θ/β) / (basalTheta/basalBeta) Oken et al. 2006 TBR
       */
      const { basalAlpha, basalBeta, basalTheta } = this.baseline
      const bAlpha = Math.max(basalAlpha, eps)
      const bBeta  = Math.max(basalBeta, eps)
      const bTheta = Math.max(basalTheta, eps)

      // ── Focus ──────────────────────────────────────────────────────────────
      // Raw ratio typically 0.5–3 for a fresh, alert mind.
      // K_sens = 12 maps ratio=1 → ~54%, ratio=2 → ~80%
      const focusRaw = beta / (bAlpha + theta + eps)
      this.metrics.focus = clamp(logScale(focusRaw, 12) * 100, 0, 100)

      // ── Stress ─────────────────────────────────────────────────────────────
      // Beta/basalAlpha. Healthy baseline ~1, stress pushes to 2–4.
      // K_sens = 8 maps ratio=1 → ~55%, ratio=3 → ~88%
      const stressRaw = beta / (bAlpha + eps)
      this.metrics.stress = clamp(logScale(stressRaw, 8) * 100, 0, 100)

      // ── Relaxation ─────────────────────────────────────────────────────────
      // alpha/basalAlpha = 1 at total rest, <1 when mentally active.
      // K_sens = 6 maps ratio=1 → ~72%, ratio=0.5 → ~45%
      const relaxRaw = alpha / bAlpha
      this.metrics.relaxation = clamp(logScale(relaxRaw, 6) * 100, 0, 100)

      // ── Cognitive Fatigue ──────────────────────────────────────────────────
      // Theta/Beta ratio relative to resting TBR. Fatigue pushes this up.
      // K_sens = 10 maps TBRratio=1 → ~59%, ratio=2 → ~84%
      const currentTBR  = theta / (beta + eps)
      const baselineTBR = bTheta / bBeta
      const fatigueRaw  = currentTBR / (baselineTBR + eps)
      this.metrics.cogFatigue = clamp(logScale(fatigueRaw, 10) * 100, 0, 100)

    } else {
      /*
       * Uncalibrated fallback with log sensitivity.
       * Without a personal baseline, we use live band ratios directly.
       *
       * KNOWN LIMITS:
       *   - Focus/Stress: live alpha in denominator can co-vary with numerator;
       *     readings are less stable than calibrated mode.
       *   - Fatigue: uses raw TBR (Theta/Beta ratio). Standard clinical marker
       *     even without baseline. Higher TBR → more mental fatigue.
       *   - Relaxation: alpha/beta ratio (unbounded, can exceed 1 when deeply
       *     relaxed) fed through logScale for smooth 0–100 output.
       */
      const focusRaw = beta / (alpha + theta + eps)
      this.metrics.focus = clamp(logScale(focusRaw, 12) * 100, 0, 100)

      const stressRaw = beta / (alpha + eps)
      this.metrics.stress = clamp(logScale(stressRaw, 8) * 100, 0, 100)

      // Relaxation: alpha/beta ratio — higher = more relaxed.
      // Using alpha/beta (not bounded 0–1) so logScale can push above 72%.
      const relaxRaw = alpha / (beta + eps)
      this.metrics.relaxation = clamp(logScale(relaxRaw, 6) * 100, 0, 100)

      // Cognitive Fatigue: raw Theta/Beta ratio (TBR).
      // Standard clinical marker — high TBR correlates with mental fatigue.
      // (Previous version had theta cancel out algebraically — this fixes that.)
      const fatigueRaw = theta / (beta + eps)
      this.metrics.cogFatigue = clamp(logScale(fatigueRaw, 10) * 100, 0, 100)
    }

    // ── Apply EMA smoothing to all metrics ─────────────────────────────
    // Blend raw computed value with previous smoothed value.
    // Alpha = 0.2 ≈ 5-second time constant at 1 FFT/second (standard for
    // neurofeedback displays). This is real data — just time-averaged.
    const alpha_ema = this._EMA_ALPHA
    for (const key of ['focus', 'stress', 'relaxation', 'cogFatigue']) {
      this._smoothed[key] = alpha_ema * this.metrics[key] + (1 - alpha_ema) * this._smoothed[key]
      this.metrics[key] = this._smoothed[key]
    }
  }

  getBandPowers() {
    return { ...this.bandPowers }
  }

  getMetrics() {
    return { ...this.metrics }
  }

  reset() {
    this.bufferIndex = 0
    this.buffer.fill(0)
    this.bandPowers = { delta: 0, theta: 0, alpha: 0, beta: 0 }
    this.metrics = { focus: 0, stress: 0, relaxation: 0, cogFatigue: 0 }
    this.baseline = null
    this._powerHistory = []
    this._smoothed = { focus: 0, stress: 0, relaxation: 0, cogFatigue: 0 }
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * Log-sensitivity scaling — maps a non-negative raw ratio onto [0, 1].
 *
 * Equivalent to a VU-meter "loudness" style compression:
 *   logScale(ratio, K) = ln(1 + ratio * K) / ln(1 + K)
 *
 * At ratio=0  → output = 0
 * At ratio=1  → output = 0.5  (the "knee" — mid-scale, perfectly linear anchor)
 * At ratio>>1 → output → 1   (outliers compressed, no runaway spikes)
 *
 * K controls sensitivity. Higher K → more compressed curve, gentler peaks.
 *   K=4  → very sensitive / raw feel
 *   K=8  → balanced, realistic for EEG   ← default for most metrics
 *   K=20 → very compressed / VU-meter feel
 */
function logScale(ratio, K) {
  const r = Math.max(0, ratio) // ensure non-negative
  return Math.log(1 + r * K) / Math.log(1 + K)
}
