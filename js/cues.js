/**
 * Spoken cue planning for the runner.
 *
 * The transition (rest) already names the next move, so the step that follows
 * only gets the short "go" cue — repeating the name there is what users heard
 * as a duplicate. Steps with no preceding rest (the first step, or a routine
 * whose restSec is 0) still name the move, because nothing has said it yet.
 *
 * Custom moves have no recording, so they are spoken by the system voice and
 * fall back to the generic next-move clip inside VoiceEngine.speak().
 */

/**
 * @returns {{kind:'clip', keys:string[]}|{kind:'speak', textKey:string}}
 */
export function stepStartPlan({ afterRest, isFirst, hasClip, clip }) {
  if (afterRest) return { kind: 'clip', keys: ['go'] };
  if (hasClip) return { kind: 'clip', keys: [isFirst ? 'first' : 'next', clip] };
  return { kind: 'speak', textKey: isFirst ? 'voice.firstUp' : 'voice.next' };
}

/**
 * Cue played when a rest starts. `clip` is the upcoming step's recording;
 * an empty value means a custom move that has to be spoken.
 *
 * @returns {{kind:'clip', keys:string[]}|{kind:'speak', textKey:string}}
 */
export function restPlan({ clip }) {
  if (clip) return { kind: 'clip', keys: ['next-' + clip] };
  return { kind: 'speak', textKey: 'voice.next' };
}
