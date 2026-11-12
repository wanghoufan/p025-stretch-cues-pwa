const AUDIO_BASE = './audio';

/**
 * Cue playback.
 *
 * The primary path is a packaged audio clip per language, so the app still
 * speaks in browsers without the Web Speech API (notably the MIUI system
 * browser, where `speechSynthesis` is undefined). Web Speech is only a
 * fallback for text we have no clip for.
 */
export class VoiceEngine {
  constructor() {
    this.enabled = true;
    this.lang = 'en';
    this.zhVoice = 'xiaoxiao';
    this.enVoice = 'aria';
    this.rate = 0.95;
    this.onBlocked = null;
    this.onStarted = null;
    this.currentAudio = null;
    this.sequenceToken = 0;
    this.hasAudio = typeof window !== 'undefined' && typeof window.Audio !== 'undefined';
    this.hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  setLanguage(lang) {
    this.lang = lang === 'zh' ? 'zh' : 'en';
  }

  setVoices(zhVoice, enVoice) {
    this.zhVoice = zhVoice || 'xiaoxiao';
    this.enVoice = enVoice || 'aria';
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
    if (!this.enabled) this.stop();
  }

  setRate(rate) {
    this.rate = Number(rate) || 1;
  }

  clipUrl(key) {
    const voice = this.lang === 'zh' ? this.zhVoice : this.enVoice;
    return AUDIO_BASE + '/' + this.lang + '/' + voice + '/' + key + '.mp3';
  }

  /**
   * Call synchronously from a real tap. Unlocks Web Audio and the media
   * element session; the first clip is then allowed to play.
   */
  unlock() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !window.__stretchAudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        window.__stretchAudioCtx = ctx;
      }
    } catch (error) {
      // AudioContext is a best-effort extra unlock.
    }
    if (this.hasSpeech) {
      try {
        const warmup = new SpeechSynthesisUtterance(' ');
        warmup.volume = 0;
        warmup.lang = this.lang === 'zh' ? 'zh-CN' : 'en-US';
        window.speechSynthesis.speak(warmup);
      } catch (error) {
        // Ignore; clip playback reports real failures.
      }
    }
  }

  /**
   * Play clips back to back. `onDone` runs once the last clip ends, which is
   * how a fixed cue (timeup) hands over to spoken text.
   */
  playSequence(keys, onDone) {
    if (!this.enabled) return;
    if (!this.hasAudio || !keys || !keys.length) {
      if (typeof onDone === 'function') onDone();
      return;
    }
    this.stop();
    const token = ++this.sequenceToken;
    let index = 0;
    let blockedReported = false;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (typeof onDone === 'function') onDone();
    };

    const fail = () => {
      if (blockedReported) return;
      blockedReported = true;
      if (this.onBlocked) this.onBlocked();
      // A blocked clip must not swallow the spoken name that follows it.
      finish();
    };

    const playNext = () => {
      if (token !== this.sequenceToken) return;
      if (index >= keys.length) {
        finish();
        return;
      }
      const key = keys[index++];
      const audio = new Audio(this.clipUrl(key));
      audio.preload = 'auto';
      audio.playbackRate = Math.max(0.7, Math.min(1.3, this.rate));
      audio.preservesPitch = true;
      audio.webkitPreservesPitch = true;
      this.currentAudio = audio;
      if (typeof window !== 'undefined') window.__stretchAudio = audio;

      audio.onplaying = () => {
        if (token === this.sequenceToken && this.onStarted) this.onStarted();
      };
      audio.onended = () => {
        if (token === this.sequenceToken) playNext();
      };
      audio.onerror = fail;

      const result = audio.play();
      if (result && result.catch) result.catch(fail);
    };

    playNext();
  }

  playFixed(key) {
    this.playSequence([key]);
  }

  /**
   * Read text with the system voice. `leadKeys` are clips played first — the
   * rest cue uses this to say "Time's up." before naming a custom move.
   */
  speak(text, leadKeys) {
    if (!this.enabled || !text) return;
    const say = () => {
      if (this.hasSpeech) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.lang === 'zh' ? 'zh-CN' : 'en-US';
        utterance.rate = this.rate;
        utterance.volume = 1;
        try { window.speechSynthesis.speak(utterance); } catch (error) { /* ignore */ }
        return;
      }
      if (this.hasAudio) this.playFixed('next-move');
    };
    if (this.hasAudio && Array.isArray(leadKeys) && leadKeys.length) {
      this.playSequence(leadKeys, say);
      return;
    }
    say();
  }

  stop() {
    this.sequenceToken += 1;
    if (this.currentAudio) {
      try { this.currentAudio.pause(); } catch (error) { /* ignore */ }
      this.currentAudio = null;
    }
    if (this.hasSpeech) {
      try { window.speechSynthesis.cancel(); } catch (error) { /* ignore */ }
    }
  }
}
