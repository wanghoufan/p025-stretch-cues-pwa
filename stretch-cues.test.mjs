import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stepStartPlan, restPlan } from './js/cues.js';
import { translate } from './js/i18n.js';

const WEB = path.dirname(fileURLToPath(import.meta.url));

/* ---------- the cue plan itself ---------- */

test('step after a rest only gets "go" — no name, no seconds', () => {
  const plan = stepStartPlan({ afterRest: true, isFirst: false, hasClip: true, clip: 'step-core-beginner-2' });
  assert.deepEqual(plan, { kind: 'clip', keys: ['go'] });
});

test('step after a rest does not repeat the name even for a custom move', () => {
  const plan = stepStartPlan({ afterRest: true, isFirst: false, hasClip: false, clip: undefined });
  assert.deepEqual(plan, { kind: 'clip', keys: ['go'] });
});

test('first step with no rest announces "第一个动作，X" via the first clip', () => {
  const plan = stepStartPlan({ afterRest: false, isFirst: true, hasClip: true, clip: 'step-a' });
  assert.deepEqual(plan, { kind: 'clip', keys: ['first', 'step-a'] });
});

test('later step with no rest announces "下一个，X" via the next clip', () => {
  const plan = stepStartPlan({ afterRest: false, isFirst: false, hasClip: true, clip: 'step-b' });
  assert.deepEqual(plan, { kind: 'clip', keys: ['next', 'step-b'] });
});

test('custom move with no rest is spoken, not played from a clip', () => {
  assert.deepEqual(
    stepStartPlan({ afterRest: false, isFirst: false, hasClip: false }),
    { kind: 'speak', textKey: 'voice.next' },
  );
  assert.deepEqual(
    stepStartPlan({ afterRest: false, isFirst: true, hasClip: false }),
    { kind: 'speak', textKey: 'voice.firstUp' },
  );
});

test('rest names the upcoming recorded move once', () => {
  assert.deepEqual(restPlan({ clip: 'step-b' }), { kind: 'clip', keys: ['next-step-b'] });
});

test('rest falls back to speech for a custom move', () => {
  assert.deepEqual(restPlan({ clip: '' }), { kind: 'speak', textKey: 'voice.next' });
});

/* ---------- a whole routine, phase by phase ---------- */

function runRoutine({ steps, restSec, hasClip }) {
  const spoken = [];
  const push = (plan, step) => {
    if (plan.kind === 'speak') spoken.push({ type: 'speak', key: plan.textKey, name: step.name });
    else spoken.push({ type: 'clip', keys: plan.keys });
  };
  steps.forEach((step, index) => {
    push(stepStartPlan({
      afterRest: index > 0 && restSec > 0,
      isFirst: index === 0,
      hasClip,
      clip: hasClip ? step.clip : undefined,
    }), step);
    if (restSec > 0 && index < steps.length - 1) {
      const next = steps[index + 1];
      push(restPlan({ clip: hasClip ? next.clip : '' }), next);
    }
  });
  return spoken;
}

test('a routine with rests names each move once and says "go" at every start', () => {
  const spoken = runRoutine({
    steps: [{ name: 'A', clip: 'step-a' }, { name: 'B', clip: 'step-b' }, { name: 'C', clip: 'step-c' }],
    restSec: 5,
    hasClip: true,
  });
  const clips = spoken.map((item) => item.keys);
  assert.deepEqual(clips, [
    ['first', 'step-a'],   // step 1 starts
    ['next-step-b'],       // rest before step 2 names it
    ['go'],                // step 2 starts — no second name
    ['next-step-c'],       // rest before step 3 names it
    ['go'],                // step 3 starts — no second name
  ]);
  assert.equal(clips.filter((keys) => keys[0] === 'go').length, 2);
});

test('a routine without rest announces the name at every start', () => {
  const spoken = runRoutine({
    steps: [{ name: 'A', clip: 'step-a' }, { name: 'B', clip: 'step-b' }, { name: 'C', clip: 'step-c' }],
    restSec: 0,
    hasClip: true,
  });
  assert.deepEqual(spoken.map((item) => item.keys), [
    ['first', 'step-a'],
    ['next', 'step-b'],
    ['next', 'step-c'],
  ]);
});

test('a custom routine with rests gets spoken names during the rest only', () => {
  const spoken = runRoutine({
    steps: [{ name: '深蹲', clip: '' }, { name: '开合跳', clip: '' }],
    restSec: 5,
    hasClip: false,
  });
  assert.deepEqual(spoken, [
    { type: 'speak', key: 'voice.firstUp', name: '深蹲' },
    { type: 'speak', key: 'voice.next', name: '开合跳' },
    { type: 'clip', keys: ['go'] },
  ]);
});

/* ---------- spoken wording ---------- */

test('spoken wording keeps the agreed Chinese and English sentences', () => {
  assert.equal(translate('zh', 'voice.firstUp', { name: '深蹲' }), '第一个动作，深蹲。');
  assert.equal(translate('zh', 'voice.next', { name: '开合跳' }), '下一个，开合跳。');
  assert.equal(translate('en', 'voice.firstUp', { name: 'Squat' }), 'First up, Squat.');
  assert.equal(translate('en', 'voice.next', { name: 'Jumping jacks' }), 'Next, Jumping jacks.');
});

/* ---------- shipped audio ---------- */

test('every voice ships go.mp3 and the service worker manifest lists it', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(WEB, 'audio', 'manifest.json'), 'utf8'));
  const listed = new Set(manifest.files);
  for (const lang of ['zh', 'en']) {
    for (const voice of manifest.voices[lang]) {
      const rel = 'audio/' + lang + '/' + voice + '/go.mp3';
      assert.ok(listed.has(rel), 'manifest is missing ' + rel);
      const file = path.join(WEB, rel);
      assert.ok(fs.existsSync(file), 'missing file ' + rel);
      assert.ok(fs.statSync(file).size > 1024, rel + ' is smaller than 1 KB');
    }
  }
});

/* ---------- wiring in app.js ---------- */

test('app.js routes every step start through the shared plan', () => {
  const source = fs.readFileSync(path.join(WEB, 'js', 'app.js'), 'utf8');
  assert.match(source, /from '\.\/cues\.js'/);
  assert.match(source, /plan\.keys/, 'clips must come from the plan');
  assert.equal(source.includes('voice.playStep'), false, 'the old name-repeat helper must be gone');
  // The duplicate the users reported: playing the step clip again right after
  // the rest had already named it.
  assert.equal(source.includes('if (wasRest && step && step.clip)'), false);
  assert.equal((source.match(/announceStepStart\(/g) || []).length >= 3, true, 'start, skip and transition must share the plan');
});
