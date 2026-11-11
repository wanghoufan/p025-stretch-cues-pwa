import test from 'node:test';
import assert from 'node:assert/strict';

/* VoiceEngine reads `window` in its constructor, so the fake platform has to
 * exist before the module is imported. The MIUI browser case is the one that
 * matters here: no speechSynthesis at all. */

const played = [];
const spoken = [];

class FakeAudio {
  constructor(src) {
    this.src = src;
    played.push(src);
  }

  play() {
    return Promise.resolve();
  }

  pause() {}
}

globalThis.Audio = FakeAudio;

globalThis.window = {
  Audio: FakeAudio,
  speechSynthesis: {
    speak(utterance) { spoken.push({ text: utterance.text, lang: utterance.lang }); },
    cancel() {},
  },
};

globalThis.SpeechSynthesisUtterance = class {
  constructor(text) {
    this.text = text;
  }
};

const { VoiceEngine } = await import('./js/voice.js');

function engine(lang, voices) {
  played.length = 0;
  spoken.length = 0;
  const voice = new VoiceEngine();
  voice.setLanguage(lang);
  voice.setVoices(voices.zh, voices.en);
  return voice;
}

test('custom move is read by the system voice when speechSynthesis exists', () => {
  const voice = engine('zh', { zh: 'xiaoxiao', en: 'aria' });
  voice.speak('下一个，深蹲。');
  assert.deepEqual(spoken, [{ text: '下一个，深蹲。', lang: 'zh-CN' }]);
  assert.equal(played.length, 0, 'no clip should play when the voice is available');
});

test('without speechSynthesis the generic next-move clip plays instead', () => {
  const save = window.speechSynthesis;
  delete window.speechSynthesis;
  const voice = engine('zh', { zh: 'xiaoxiao', en: 'aria' });
  assert.equal(voice.hasSpeech, false);
  voice.speak('下一个，深蹲。');
  assert.deepEqual(played, ['./audio/zh/xiaoxiao/next-move.mp3']);
  assert.equal(spoken.length, 0);
  window.speechSynthesis = save;
});

test('the go cue resolves to the selected voice of the active language', () => {
  const voice = engine('en', { zh: 'xiaoxiao', en: 'jenny' });
  voice.playFixed('go');
  assert.deepEqual(played, ['./audio/en/jenny/go.mp3']);
});

test('speaking is skipped when cues are switched off', () => {
  const voice = engine('zh', { zh: 'xiaoxiao', en: 'aria' });
  voice.setEnabled(false);
  voice.speak('下一个，深蹲。');
  voice.playFixed('go');
  assert.equal(spoken.length, 0);
  assert.equal(played.length, 0);
});
