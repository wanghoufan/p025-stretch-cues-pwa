/**
 * Spoken cue planning for the runner.
 *
 * The lifecycle of every timed move is now:
 *   start → "Go." · 10 s left → "Ten seconds left." · time is up → "Time's up."
 *   → during the rest "Next, X" · next move starts → "Go."
 *
 * So the rest (transition) carries two cues: the fixed "timeup" clip and the
 * name of the upcoming move. The step that follows only gets the short "go"
 * cue — repeating the name there is what users heard as a duplicate. Steps
 * with no preceding rest (the first step, or a routine whose restSec is 0)
 * still name the move, because nothing has said it yet.
 *
 * Custom moves have no recording, so the name is spoken by the system voice
 * after the same "timeup" clip; VoiceEngine.speak() falls back to the generic
 * next-move clip where speechSynthesis is unavailable.
 */

/**
 * @returns {{kind:'clip', keys:string[]}|{kind:'speak', textKey:string, leadKeys?:string[]}}
 */
export function stepStartPlan({ afterRest, isFirst, hasClip, clip }) {
  if (afterRest) return { kind: 'clip', keys: ['go'] };
  if (hasClip) return { kind: 'clip', keys: [isFirst ? 'first' : 'next', clip] };
  return { kind: 'speak', textKey: isFirst ? 'voice.firstUp' : 'voice.next' };
}

/**
 * Cue played when a rest starts. `clip` is the upcoming step's recording;
 * an empty value means a custom move whose name has to be spoken after the
 * fixed "timeup" cue.
 *
 * @returns {{kind:'clip', keys:string[]}|{kind:'speak', textKey:string, leadKeys?:string[]}}
 */
export function restPlan({ clip }) {
  if (clip) return { kind: 'clip', keys: ['timeup', 'next-' + clip] };
  return { kind: 'speak', textKey: 'voice.next', leadKeys: ['timeup'] };
}
