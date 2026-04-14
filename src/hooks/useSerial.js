import { useState, useRef, useCallback } from 'react'
import { EEGProcessor } from '../utils/eegProcessor'

/**
 * React hook for reading EEG samples from an Arduino via the Web Serial API.
 *
 * Returns:
 *   isConnected       — boolean
 *   isSupported       — boolean (false on Firefox / Safari)
 *   connect()         — opens a serial port dialog
 *   disconnect()      — closes the port
 *   rawSample         — latest sample value (number)
 *   bandPowers        — { delta, theta, alpha, beta }
 *   metrics           — { focus, stress, relaxation, cogFatigue }
 *   chartData         — rolling array of { t, alpha, beta, theta, delta } for the chart
 *   getSessionAverages() — returns the current running average of the connected session
 *   startCalibration(durationMs, onComplete) — calibrate baseline
 *   applyBaseline(baseline) — manually pass baseline to processor
 */
export default function useSerial() {
  const [isConnected, setIsConnected] = useState(false)
  const [rawSample, setRawSample] = useState(0)
  const [bandPowers, setBandPowers] = useState({ delta: 0, theta: 0, alpha: 0, beta: 0 })
  const [metrics, setMetrics] = useState({ focus: 0, stress: 0, relaxation: 0, cogFatigue: 0 })
  const [chartData, setChartData] = useState([])
  const [connectError, setConnectError] = useState(null) // null | string

  const portRef = useRef(null)
  const readerRef = useRef(null)
  const processorRef = useRef(new EEGProcessor())
  const tickRef = useRef(0)
  const abortRef = useRef(null)

  // Session Tracking state
  const sessionStartRef = useRef(0)
  const sessionStateRef = useRef({
    samples: 0,
    focusSum: 0,
    stressSum: 0,
    relaxationSum: 0,
    cogFatigueSum: 0
  })

  // Calibration accumulator (used during startCalibration window)
  const calibAccRef = useRef(null)

  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator

  const connect = useCallback(async () => {
    if (!isSupported) return
    setConnectError(null)
    try {
      const port = await navigator.serial.requestPort()
      try {
        await port.open({ baudRate: 115200 })
      } catch (openErr) {
        setConnectError('Failed to open port. Make sure no other application is using it.')
        return
      }
      portRef.current = port
      // Reset processor and start tracking a new session
      processorRef.current = new EEGProcessor()
      sessionStartRef.current = Date.now()
      sessionStateRef.current = {
        samples: 0,
        focusSum: 0,
        stressSum: 0,
        relaxationSum: 0,
        cogFatigueSum: 0
      }
      // Reset chart data and tick for a new session
      tickRef.current = 0
      setChartData([])
      setIsConnected(true)

      // Set up an AbortController so we can cancel the read loop
      const abortController = new AbortController()
      abortRef.current = abortController

      // Start background reading
      _readLoop(port, abortController.signal)
      return true // signal successful connection
    } catch (err) {
      if (err.name === 'NotFoundError' || err.name === 'AbortError') {
        // User dismissed the port picker — not a real error, just be silent
        return
      }
      console.error('Serial connect error:', err)
      setConnectError('Could not connect to device: ' + err.message)
    }
  }, [isSupported])

  const disconnect = useCallback(async () => {
    try {
      // Signal the read loop to stop
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }

      // Close the reader if it exists
      if (readerRef.current) {
        try {
          await readerRef.current.cancel()
        } catch { /* ignore */ }
        readerRef.current = null
      }

      if (portRef.current) {
        try {
          await portRef.current.close()
        } catch (err) {
          console.error('Error closing port:', err)
        }
        portRef.current = null
      }
    } catch (err) {
      console.error('Serial disconnect error:', err)
    } finally {
      setIsConnected(false)
    }
    
    // Calculate and return session summary when disconnected
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000)
    const { samples, focusSum, stressSum, relaxationSum, cogFatigueSum } = sessionStateRef.current

    if (samples > 0) {
      return {
        durationSeconds,
        focusAvg: focusSum / samples,
        stressAvg: stressSum / samples,
        relaxationAvg: relaxationSum / samples,
        cogFatigueAvg: cogFatigueSum / samples
      }
    }
    
    return null
  }, [])

  const getSessionAverages = useCallback(() => {
    const { samples, focusSum, stressSum, relaxationSum, cogFatigueSum } = sessionStateRef.current
    if (samples === 0) return null

    return {
      focus: focusSum / samples,
      stress: stressSum / samples,
      relaxation: relaxationSum / samples,
      cogFatigue: cogFatigueSum / samples
    }
  }, [])

  // Wipes out the accumulated averages (used after calibration so
  // the calibration period doesn't contaminate the real session average)
  const clearSessionData = useCallback(() => {
    sessionStateRef.current = { samples: 0, focusSum: 0, stressSum: 0, relaxationSum: 0, cogFatigueSum: 0 }
    sessionStartRef.current = Date.now()
  }, [])

  /**
   * Kick off a calibration window.
   * For `durationMs` ms, the read loop accumulates band powers into
   * calibAccRef. At the end, averages are computed and:
   *   1. Applied to the EEGProcessor via setBaseline()
   *   2. Passed to onComplete({ basalAlpha, basalBeta, basalTheta, basalDelta })
   *
   * @param {number} durationMs
   * @param {function} onComplete
   */
  const startCalibration = useCallback((durationMs, onComplete) => {
    // Reset accumulator
    calibAccRef.current = {
      samples: 0,
      alphaSum: 0,
      betaSum: 0,
      thetaSum: 0,
      deltaSum: 0,
    }

    setTimeout(() => {
      const acc = calibAccRef.current
      if (!acc || acc.samples === 0) {
        onComplete(null)
        calibAccRef.current = null
        return
      }

      const baseline = {
        basalAlpha: acc.alphaSum / acc.samples,
        basalBeta:  acc.betaSum  / acc.samples,
        basalTheta: acc.thetaSum / acc.samples,
        basalDelta: acc.deltaSum / acc.samples,
      }

      // Apply to processor
      processorRef.current.setBaseline(baseline)
      calibAccRef.current = null
      onComplete(baseline)
    }, durationMs)
  }, [])

  /**
   * Apply a pre-existing baseline (e.g. restored from storage) directly.
   */
  const applyBaseline = useCallback((baseline) => {
    processorRef.current.setBaseline(baseline)
  }, [])

  // Internal: continuously read lines from the serial port
  async function _readLoop(port, signal) {
    const decoder = new TextDecoderStream()
    const readableStreamClosed = port.readable.pipeTo(decoder.writable, { signal }).catch(() => {})

    const reader = decoder.readable.getReader()
    readerRef.current = reader

    let lineBuf = ''
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done || signal.aborted) break
        if (!value) continue

        lineBuf += value
        const lines = lineBuf.split('\n')
        lineBuf = lines.pop() // keep incomplete tail

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          const val = parseFloat(trimmed)
          if (isNaN(val)) continue

          setRawSample(val)

          const windowReady = processorRef.current.push(val)
          if (windowReady) {
            const bp = processorRef.current.getBandPowers()
            const m = processorRef.current.getMetrics()
            setBandPowers(bp)
            setMetrics(m)

            // If a calibration window is open, accumulate band powers
            if (calibAccRef.current) {
              calibAccRef.current.samples++
              calibAccRef.current.alphaSum += bp.alpha
              calibAccRef.current.betaSum  += bp.beta
              calibAccRef.current.thetaSum += bp.theta
              calibAccRef.current.deltaSum += bp.delta
            } else {
              // Only accumulate for session averages if NOT currently calibrating
              sessionStateRef.current.samples++
              sessionStateRef.current.focusSum += m.focus
              sessionStateRef.current.stressSum += m.stress
              sessionStateRef.current.relaxationSum += m.relaxation
              sessionStateRef.current.cogFatigueSum += m.cogFatigue
            }

            // Append one data point per FFT window to chart data (rolling 60 points)
            const t = tickRef.current++
            setChartData(prev => {
              const next = [...prev, { t, alpha: bp.alpha, beta: bp.beta, theta: bp.theta, delta: bp.delta }]
              return next.length > 60 ? next.slice(-60) : next
            })
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Serial read error:', err)
      }
    } finally {
      reader.releaseLock()
      await readableStreamClosed
    }
  }

  return {
    isConnected,
    isSupported,
    connect,
    disconnect,
    rawSample,
    bandPowers,
    metrics,
    chartData,
    connectError,
    clearConnectError: () => setConnectError(null),
    clearChartData: () => setChartData([]),
    getSessionAverages,
    clearSessionData,
    startCalibration,
    applyBaseline,
  }
}
