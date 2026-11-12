/**
 * Test-only "time speed". The runner keeps every clock value in routine time
 * (remainingMs, elapsedActionMs, the 10 s cue, the progress bar); only the
 * 200 ms page timer is real time. Scaling therefore happens at exactly one
 * place: the conversion of a real elapsed gap into routine time.
 */
export const SPEED_CHOICES = [1, 2, 6, 10];

/** Anything that is not an offered choice falls back to the normal 1×. */
export function normalizeSpeed(value) {
  const speed = Number(value);
  return SPEED_CHOICES.includes(speed) ? speed : 1;
}

/**
 * Real elapsed milliseconds → routine milliseconds.
 *
 *   routineMs = realMs × speed
 *
 * So at 6× a 60 s move consumes 60000 ms of routine time from 10000 ms of real
 * time, and one 200 ms tick takes 1200 ms off the countdown.
 */
export function routineMs(realMs, speed) {
  const elapsed = Math.max(0, Number(realMs) || 0);
  return elapsed * normalizeSpeed(speed);
}
