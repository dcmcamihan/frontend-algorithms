export type VelocityTrackerOptions = {
  /** Weight of the newest sample, between 0 (ignore new samples) and 1 (no smoothing). */
  smoothing?: number
  /** A gap longer than this between samples starts a new gesture at velocity 0. */
  idleResetMs?: number
}

export interface VelocityTracker {
  /** Add a scroll position (px) at a time (ms). Returns the smoothed velocity in px per ms. */
  update(position: number, timeMs: number): number
  /** Current smoothed velocity in px per ms. Positive means the position is increasing. */
  readonly velocity: number
  /** Forget all samples, for example after scrolling stops. */
  reset(): void
}

/**
 * Estimates scroll velocity from position samples, smoothed with an exponential moving
 * average so one uneven event does not swing the result. Framework-free.
 */
export function createVelocityTracker(options: VelocityTrackerOptions = {}): VelocityTracker {
  const smoothing = options.smoothing ?? 0.5
  const idleResetMs = options.idleResetMs ?? 100
  if (!Number.isFinite(smoothing) || smoothing <= 0 || smoothing > 1) {
    throw new RangeError('smoothing must be greater than 0 and at most 1')
  }
  if (!Number.isFinite(idleResetMs) || idleResetMs <= 0) {
    throw new RangeError('idleResetMs must be a finite number greater than 0')
  }

  let lastPosition = 0
  let lastTime = 0
  let hasSample = false
  let hasVelocity = false
  let velocity = 0

  const reset = () => {
    hasSample = false
    hasVelocity = false
    velocity = 0
  }

  return {
    update(position, timeMs) {
      if (!Number.isFinite(position) || !Number.isFinite(timeMs)) return velocity
      const dt = timeMs - lastTime
      if (!hasSample || dt > idleResetMs) {
        reset()
      } else if (dt > 0) {
        const sample = (position - lastPosition) / dt
        velocity = hasVelocity ? smoothing * sample + (1 - smoothing) * velocity : sample
        hasVelocity = true
      } else {
        // Same timestamp or clock went backwards: keep the estimate, take the new position.
      }
      hasSample = true
      lastPosition = position
      lastTime = timeMs
      return velocity
    },
    get velocity() {
      return velocity
    },
    reset,
  }
}
