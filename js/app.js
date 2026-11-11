import { translate, resolveLanguage } from './i18n.js';
import { SEED_ACTIONS, SEED_ROUTINES, SEED_VERSION } from './seed.js';
import * as db from './db.js';
import { VoiceEngine } from './voice.js';

const appEl = document.getElementById('app');
const voice = new VoiceEngine();
const ACTIVE_KEY = 'stretch-active-session';

voice.onBlocked = () => {
  state.voiceBlocked = true;
  if (state.screen === 'runner') {
    appEl.innerHTML = screenRunner();
    updateRunnerUI();
  }
};

voice.onStarted = () => {
  if (!state.voiceBlocked) return;
  state.voiceBlocked = false;
  const banner = document.querySelector('.banner');
  if (banner) banner.remove();
};

const state = {
  lang: 'zh',
  languageSetting: 'auto',
  speech: true,
  rate: 0.95,
  zhVoice: 'xiaoxiao',
  enVoice: 'aria',
  routines: [],
  history: [],
  screen: 'home',
  libraryScene: 'all',
  runner: null,
  saved: null,
  editor: null,
  lastResult: null,
  canInstall: false,
};

let installPrompt = null;
let wakeLock = null;

const t = (key, params) => translate(state.lang, key, params);

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function localName(item) {
  return state.lang === 'en' ? (item.nameEn || item.nameZh) : (item.nameZh || item.nameEn);
}

function stepCue(step) {
  return state.lang === 'en' ? (step.cueEn || step.cueZh || '') : (step.cueZh || step.cueEn || '');
}

const PRESET_ORDER = new Map(SEED_ROUTINES.map((routine, index) => [routine.id, index]));

/** Presets in catalog order, then anything the user made. */
function sortRoutines(list) {
  return list.slice().sort((a, b) => {
    const aOrder = PRESET_ORDER.has(a.id) ? PRESET_ORDER.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bOrder = PRESET_ORDER.has(b.id) ? PRESET_ORDER.get(b.id) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a.id).localeCompare(String(b.id));
  });
}

function localActionName(action) {
  return state.lang === 'en' ? action.en : action.zh;
}

function actionTags(action) {
  const parts = action.bodypart.map((part) => t('part.' + part));
  parts.push(t('diff.' + action.difficulty));
  return parts.join(' · ');
}

function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function formatDuration(seconds) {
  return t('history.duration', { min: Math.floor(seconds / 60), sec: seconds % 60 });
}

function routineSeconds(routine) {
  const rest = Number(routine.restSec || 0);
  return routine.steps.reduce((sum, step, index) => (
    sum + Number(step.seconds || 0) + (index < routine.steps.length - 1 ? rest : 0)
  ), 0);
}

function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

async function saveSettings() {
  await db.put('settings', {
    key: 'app',
    language: state.languageSetting,
    speech: state.speech,
    rate: state.rate,
    zhVoice: state.zhVoice,
    enVoice: state.enVoice,
  });
}

function applyVoiceSettings() {
  voice.setLanguage(state.lang);
  voice.setEnabled(state.speech);
  voice.setRate(state.rate);
  voice.setVoices(state.zhVoice, state.enVoice);
}

/** The home-screen name follows the resolved UI language, not the browser UI. */
function applyManifestLanguage(lang) {
  const link = document.getElementById('manifest-link');
  if (link) {
    link.setAttribute('href', lang === 'en' ? './manifest.en.webmanifest' : './manifest.webmanifest');
  }
  const title = lang === 'en' ? 'Stretch Cues' : '拉伸播报·pwa';
  const apple = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (apple) apple.setAttribute('content', title);
  document.title = title;
}

function canUseServiceWorker() {
  return 'serviceWorker' in navigator
    && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
}

async function boot() {
  try {
    const settings = await db.get('settings', 'app');
    if (settings) {
      state.languageSetting = settings.language || 'auto';
      state.speech = settings.speech !== false;
      state.rate = Number(settings.rate) || 0.95;
      state.zhVoice = settings.zhVoice || 'xiaoxiao';
      state.enVoice = settings.enVoice || 'aria';
    }

    let routines = await db.getAll('routines');
    const seeded = await db.get('meta', 'seeded');
    const seededVersion = Number(seeded && seeded.version) || 0;
    if (!routines.length && !seeded) {
      await db.bulkPut('routines', SEED_ROUTINES);
      await db.put('meta', { key: 'seeded', version: SEED_VERSION });
      routines = await db.getAll('routines');
    } else if (seeded && seededVersion < SEED_VERSION) {
      // Every user already has the three legacy presets (morning-reset,
      // desk-reset, bedtime-wind-down). Replace only those shipped rows with
      // the full catalog; custom routines are never touched.
      const presetIds = new Set(SEED_ROUTINES.map((routine) => routine.id));
      const legacy = routines.filter((routine) => routine.builtin && !presetIds.has(routine.id));
      for (const routine of legacy) {
        await db.remove('routines', routine.id);
      }
      // Upsert the shipped presets so rest durations reach existing installs;
      // user-created routines (builtin absent) are never touched.
      await db.bulkPut('routines', SEED_ROUTINES);
      await db.put('meta', { key: 'seeded', version: SEED_VERSION });
      routines = await db.getAll('routines');
    }

    state.routines = sortRoutines(routines);
    state.history = await db.getAll('history');
    state.lang = resolveLanguage(state.languageSetting);
    applyVoiceSettings();
    applyManifestLanguage(state.lang);

    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && state.routines.some((routine) => routine.id === saved.routineId)) {
          state.saved = saved;
        } else {
          localStorage.removeItem(ACTIVE_KEY);
        }
      }
    } catch (error) {
      localStorage.removeItem(ACTIVE_KEY);
    }

    if (canUseServiceWorker()) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    render();
  } catch (error) {
    appEl.innerHTML = '<div class="screen"><div class="card"><h1>Stretch Cues</h1>'
      + '<p class="muted">This browser could not open local storage. Try a normal (non-private) window.</p></div></div>';
  }
}

/* ---------------- screens ---------------- */

function screenHome() {
  const resume = state.saved ? (() => {
    const routine = state.routines.find((item) => item.id === state.saved.routineId);
    if (!routine) return '';
    return `
      <div class="card resume-card">
        <p class="eyebrow">${esc(t('home.resume'))}</p>
        <h3>${esc(localName(routine))}</h3>
        <p class="muted">${esc(t('home.resumeDesc', {
          name: localName(routine),
          step: (state.saved.stepIndex || 0) + 1,
          count: routine.steps.length,
        }))}</p>
        <button class="primary" data-action="resume-saved">${esc(t('runner.resume'))}</button>
      </div>`;
  })() : '';

  const cards = state.routines.map((routine) => `
    <article class="card routine-card">
      <div class="routine-head">
        <h3>${esc(localName(routine))}</h3>
        <span class="badge">${esc(t('home.steps', { count: routine.steps.length }))}</span>
      </div>
      <p class="muted">${esc(formatClock(routineSeconds(routine) * 1000))}${routine.restSec ? ' · ' + esc(t('home.rest', { sec: routine.restSec })) : ''}</p>
      <button class="primary" data-action="start" data-id="${esc(routine.id)}">${esc(t('home.start'))}</button>
      <button class="text-danger" data-action="delete-routine" data-id="${esc(routine.id)}">${esc(t('home.delete'))}</button>
    </article>`).join('');

  return `
    <div class="screen">
      <header class="topbar">
        <div>
          <h1>${esc(t('app.name'))}</h1>
          <p class="muted">${esc(t('app.tagline'))}</p>
        </div>
      </header>

      <div class="quick-grid">
        <button class="primary" data-action="go-new">${esc(t('home.new'))}</button>
        <button data-action="go-library">${esc(t('nav.library'))}</button>
        <button data-action="go-history">${esc(t('nav.history'))}</button>
        <button data-action="go-settings">${esc(t('nav.settings'))}</button>
      </div>

      ${resume}
      <h2>${esc(t('nav.home'))}</h2>
      ${state.routines.length ? cards : `
        <div class="card">
          <h3>${esc(t('home.empty'))}</h3>
          <p class="muted">${esc(t('home.emptyDesc'))}</p>
          <button class="primary" data-action="go-new">${esc(t('home.new'))}</button>
        </div>`}
      <p class="foot">${esc(t('home.saved'))}</p>
      ${state.canInstall ? `<button class="install" data-action="install">${esc(t('install.button'))}</button>` : ''}
    </div>`;
}

const LIBRARY_SCENES = ['stretch', 'warmup', 'core'];

function actionCard(action) {
  return `
    <article class="card routine-card">
      <div class="routine-head">
        <h3>${esc(localActionName(action))}</h3>
        <span class="badge">${esc(t('library.seconds', { seconds: action.seconds }))}</span>
      </div>
      <p class="muted">${esc(actionTags(action))}</p>
      <button class="primary" data-action="start-action" data-key="${esc(action.key)}">${esc(t('library.start'))}</button>
    </article>`;
}

function screenLibrary() {
  const chips = [['all', t('library.all')]]
    .concat(LIBRARY_SCENES.map((scene) => [scene, t('library.scene.' + scene)]))
    .map(([key, label]) => `<button class="${state.libraryScene === key ? 'primary' : ''}" data-action="library-scene" data-scene="${key}">${esc(label)}</button>`)
    .join('');

  const scenes = state.libraryScene === 'all' ? LIBRARY_SCENES : [state.libraryScene];
  const sections = scenes.map((scene) => {
    const actions = SEED_ACTIONS.filter((action) => action.scene === scene);
    if (!actions.length) return '';
    const heading = state.libraryScene === 'all' ? `<h2>${esc(t('library.scene.' + scene))}</h2>` : '';
    return heading + actions.map(actionCard).join('');
  }).join('');

  return `
    <div class="screen">
      <div class="runner-top">
        <button class="link" data-action="go-home">${esc(t('common.back'))}</button>
      </div>
      <h1>${esc(t('library.title'))}</h1>
      <p class="muted">${esc(t('library.desc', { count: SEED_ACTIONS.length }))}</p>
      <div class="quick-grid">${chips}</div>
      ${sections}
    </div>`;
}

function screenRunner() {
  const runner = state.runner;
  const step = runner.routine.steps[runner.stepIndex];
  const next = runner.stepIndex + 1 < runner.routine.steps.length
    ? runner.routine.steps[runner.stepIndex + 1]
    : null;

  return `
    <div class="screen runner">
      <div class="runner-top">
        <button class="link" data-action="go-home">${esc(t('common.back'))}</button>
        <span class="badge" id="phase-label">${esc(t('runner.stepOf', {
          index: runner.stepIndex + 1,
          count: runner.routine.steps.length,
        }))}</span>
      </div>

      <h1 class="routine-title">${esc(localName(runner.routine))}</h1>
      <div class="countdown" id="countdown">${formatClock(runner.remainingMs)}</div>
      <p class="phase" id="phase">${esc(t('runner.cueLabel'))}</p>

      <div class="card current-card">
        <h2 class="step-name" id="step-name">${esc(localName(step))}</h2>
        <p class="cue" id="cue">${esc(stepCue(step))}</p>
        <p class="muted" id="next-line">${next
          ? esc(t('runner.next', { name: localName(next) }))
          : esc(t('runner.lastStep'))}</p>
      </div>

      <div class="progress" role="progressbar" aria-label="${esc(t('runner.progress'))}">
        <div class="progress-fill" id="progress-fill"></div>
      </div>

      ${state.voiceBlocked ? `<p class="banner">${esc(t('runner.voiceBlocked'))}</p>` : ''}

      <div class="control-grid">
        <button id="pause-btn" data-action="pause">${esc(t('runner.pause'))}</button>
        <button data-action="prev">${esc(t('runner.previous'))}</button>
        <button data-action="add10">${esc(t('runner.add10'))}</button>
        <button data-action="skip">${esc(t('runner.skip'))}</button>
      </div>
      <button class="danger" data-action="end">${esc(t('runner.end'))}</button>
    </div>`;
}

function screenDone() {
  const result = state.lastResult || { completed: true, name: '', seconds: 0 };
  return `
    <div class="screen">
      <div class="done-mark">${result.completed ? '✓' : '·'}</div>
      <h1>${esc(result.completed ? t('runner.done') : t('runner.ended'))}</h1>
      <p class="lede">${esc(result.completed
        ? t('runner.doneDesc', { name: result.name })
        : t('runner.endedDesc'))}</p>
      <div class="card">
        <p class="eyebrow">${esc(t('runner.total'))}</p>
        <p class="big-number">${esc(formatDuration(result.seconds))}</p>
      </div>
      <button class="primary" data-action="go-home">${esc(t('runner.backHome'))}</button>
    </div>`;
}

function screenSettings() {
  const langOption = (value, label) => `
    <label class="choice">
      <input type="radio" name="lang" value="${value}" ${state.languageSetting === value ? 'checked' : ''}>
      <span>${esc(label)}</span>
    </label>`;

  const voiceOption = (name, value, current) => {
    const langKey = name === 'zhVoice' ? 'zh' : 'en';
    return `
      <label class="choice">
        <input type="radio" name="${name}" value="${value}" ${current === value ? 'checked' : ''}>
        <span>${esc(t('voice.' + langKey + '.' + value))}</span>
      </label>`;
  };

  return `
    <div class="screen">
      <div class="runner-top">
        <button class="link" data-action="go-home">${esc(t('common.back'))}</button>
      </div>
      <h1>${esc(t('settings.title'))}</h1>

      <section class="card">
        <h2>${esc(t('settings.language'))}</h2>
        <p class="muted">${esc(t('settings.languageDesc'))}</p>
        <div class="choices">
          ${langOption('auto', t('settings.auto'))}
          ${langOption('zh', t('settings.chinese'))}
          ${langOption('en', t('settings.english'))}
        </div>
      </section>

      <section class="card">
        <h2>${esc(t('settings.speech'))}</h2>
        <p class="muted">${esc(t('settings.speechDesc'))}</p>
        <label class="switch-row">
          <input type="checkbox" data-setting="speech" ${state.speech ? 'checked' : ''}>
          <span>${esc(t('settings.speech'))}</span>
        </label>
        <label class="slider-row">
          <span>${esc(t('settings.rate'))}</span>
          <output id="rate-value">${esc(t('settings.rateValue', { value: state.rate.toFixed(2) }))}</output>
        </label>
        <input type="range" min="0.7" max="1.3" step="0.05" value="${state.rate}" data-setting="rate">
      </section>

      <section class="card">
        <h2>${esc(t('settings.voices'))}</h2>
        <p class="muted">${esc(t('settings.voicesDesc'))}</p>
        <p class="group-label">${esc(t('settings.zhVoice'))}</p>
        <div class="choices">
          ${voiceOption('zhVoice', 'xiaoxiao', state.zhVoice)}
          ${voiceOption('zhVoice', 'xiaoyi', state.zhVoice)}
          ${voiceOption('zhVoice', 'yunxi', state.zhVoice)}
          ${voiceOption('zhVoice', 'yunjian', state.zhVoice)}
        </div>
        <p class="group-label">${esc(t('settings.enVoice'))}</p>
        <div class="choices">
          ${voiceOption('enVoice', 'aria', state.enVoice)}
          ${voiceOption('enVoice', 'jenny', state.enVoice)}
          ${voiceOption('enVoice', 'guy', state.enVoice)}
          ${voiceOption('enVoice', 'andrew', state.enVoice)}
        </div>
        <button data-action="preview-voice">${esc(t('settings.preview'))}</button>
      </section>

      <section class="card">
        <h2>${esc(t('settings.data'))}</h2>
        <p class="muted">${esc(t('settings.dataDesc'))}</p>
        <button data-action="export">${esc(t('settings.export'))}</button>
        <button data-action="import">${esc(t('settings.import'))}</button>
        <button class="danger" data-action="clear-data">${esc(t('settings.clear'))}</button>
        <input id="import-file" type="file" accept="application/json,.json" hidden>
      </section>

      <section class="card">
        <h2>${esc(t('install.title'))}</h2>
        ${state.canInstall
          ? `<button class="primary" data-action="install">${esc(t('install.button'))}</button>`
          : `<p class="muted">${esc(t('install.iosHint'))}</p>`}
      </section>

      <section class="card">
        <h2>${esc(t('settings.about'))}</h2>
        <p class="muted">${esc(t('settings.aboutText'))}</p>
      </section>
    </div>`;
}

function screenHistory() {
  const total = state.history.reduce((sum, item) => sum + Number(item.seconds || 0), 0);
  const rows = state.history.slice().sort((a, b) => b.endedAt - a.endedAt).slice(0, 60).map((item) => `
    <article class="card history-row">
      <div class="routine-head">
        <h3>${esc(item.name)}</h3>
        <span class="badge ${item.completed ? 'ok' : 'warn'}">${esc(item.completed ? t('history.completed') : t('history.endedEarly'))}</span>
      </div>
      <p class="muted">${esc(new Date(item.endedAt).toLocaleString(state.lang === 'en' ? 'en-US' : 'zh-CN', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }))}</p>
      <p>${esc(formatDuration(item.seconds))}</p>
    </article>`).join('');

  return `
    <div class="screen">
      <div class="runner-top">
        <button class="link" data-action="go-home">${esc(t('common.back'))}</button>
      </div>
      <h1>${esc(t('history.title'))}</h1>
      <div class="card">
        <p class="eyebrow">${esc(t('history.total'))}</p>
        <p class="big-number">${esc(formatDuration(total))}</p>
        <p class="muted">${esc(t('history.sessions', { count: state.history.length }))}</p>
      </div>
      ${state.history.length ? rows : `
        <div class="card">
          <h3>${esc(t('history.empty'))}</h3>
          <p class="muted">${esc(t('history.emptyDesc'))}</p>
        </div>`}
      ${state.history.length ? `<button class="text-danger" data-action="clear-history">${esc(t('history.clear'))}</button>` : ''}
    </div>`;
}

function screenEditor() {
  const editor = state.editor;
  const steps = editor.steps.map((step, index) => `
    <div class="step-edit">
      <label>${esc(t('editor.stepName'))}
        <input type="text" value="${esc(step.name)}" data-field="step-name" data-index="${index}" placeholder="${esc(t('editor.namePlaceholder'))}">
      </label>
      <div class="step-edit-row">
        <label>${esc(t('editor.seconds'))}
          <input type="number" min="5" max="600" step="5" value="${esc(step.seconds)}" data-field="step-seconds" data-index="${index}">
        </label>
        <button class="text-danger" data-action="remove-step" data-index="${index}">${esc(t('editor.remove'))}</button>
      </div>
    </div>`).join('');

  return `
    <div class="screen">
      <div class="runner-top">
        <button class="link" data-action="go-home">${esc(t('common.back'))}</button>
      </div>
      <h1>${esc(t('editor.title'))}</h1>

      <label class="field">${esc(t('editor.name'))}
        <input type="text" id="routine-name" value="${esc(editor.name)}" data-field="routine-name" placeholder="${esc(t('editor.namePlaceholder'))}">
      </label>

      <h2>${esc(t('editor.steps'))}</h2>
      ${steps || `<p class="muted">${esc(t('editor.errorSteps'))}</p>`}
      <button data-action="add-step">${esc(t('editor.addStep'))}</button>
      <p class="muted">${esc(t('editor.tip'))}</p>
      <p class="muted">${esc(t('editor.audioNote'))}</p>
      <button class="primary" data-action="save-routine">${esc(t('editor.save'))}</button>
    </div>`;
}

function render() {
  document.documentElement.lang = state.lang === 'en' ? 'en' : 'zh-CN';
  if (state.screen === 'runner') {
    // The runner is rendered once, then updated in place to avoid flicker.
    if (!document.getElementById('countdown')) {
      appEl.innerHTML = screenRunner();
    }
    updateRunnerUI();
    return;
  }
  appEl.innerHTML = ({
    home: screenHome,
    library: screenLibrary,
    settings: screenSettings,
    history: screenHistory,
    editor: screenEditor,
    done: screenDone,
  }[state.screen] || screenHome)();
  window.scrollTo(0, 0);
}

/* ---------------- runner ---------------- */

function updateRunnerUI() {
  const runner = state.runner;
  if (!runner) return;
  const step = runner.routine.steps[runner.stepIndex];
  const total = runner.routine.steps.length;
  const isRest = runner.phase === 'rest';
  const restMs = restSecondsFor(runner, runner.stepIndex) * 1000;
  const stepMs = Math.max(1000, Number(step.seconds || 0) * 1000);
  const totalMs = Math.max(1, plannedMs(runner.routine));
  const doneMs = plannedDoneMs(runner, stepMs, restMs);
  const next = runner.stepIndex + 1 < total ? runner.routine.steps[runner.stepIndex + 1] : null;
  const position = isRest ? Math.min(runner.stepIndex + 2, total) : runner.stepIndex + 1;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText('countdown', formatClock(runner.remainingMs));
  setText('step-name', isRest ? t('runner.restHeadline') : localName(step));
  setText('cue', isRest
    ? t('runner.restCue', { name: next ? localName(next) : '' })
    : stepCue(step));
  setText('phase', runner.paused
    ? t('runner.pausedLabel')
    : (isRest ? t('runner.restLabel') : t('runner.cueLabel')));
  setText('phase-label', t('runner.stepOf', { index: position, count: total }));
  setText('next-line', isRest
    ? t('runner.restCountdown', { sec: Math.max(0, Math.ceil(runner.remainingMs / 1000)) })
    : (next ? t('runner.next', { name: localName(next) }) : t('runner.lastStep')));

  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = Math.max(0, Math.min(100, (doneMs / totalMs) * 100)).toFixed(2) + '%';

  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.textContent = runner.paused ? t('runner.resume') : t('runner.pause');
    pauseBtn.dataset.action = runner.paused ? 'resume' : 'pause';
  }
  const addBtn = document.querySelector('[data-action="add10"]');
  if (addBtn) addBtn.disabled = isRest;
  const skipBtn = document.querySelector('[data-action="skip"]');
  if (skipBtn) skipBtn.textContent = isRest ? t('runner.skipRest') : t('runner.skip');
}

function restSecondsFor(runner, index) {
  if (index >= runner.routine.steps.length - 1) return 0;
  return Math.max(0, Number(runner.routine.restSec || 0));
}

function plannedMs(routine) {
  const rest = Math.max(0, Number(routine.restSec || 0)) * 1000;
  return routine.steps.reduce((sum, step, index) => (
    sum + Number(step.seconds || 0) * 1000 + (index < routine.steps.length - 1 ? rest : 0)
  ), 0);
}

function plannedDoneMs(runner, stepMs, restMs) {
  const rest = Math.max(0, Number(runner.routine.restSec || 0)) * 1000;
  let ms = 0;
  for (let i = 0; i < runner.stepIndex; i += 1) {
    ms += Number(runner.routine.steps[i].seconds || 0) * 1000;
    if (i < runner.routine.steps.length - 1) ms += rest;
  }
  const phaseTotal = runner.phase === 'rest' ? restMs : stepMs;
  if (runner.phase === 'rest') ms += stepMs;
  ms += Math.max(0, phaseTotal - Math.max(0, runner.remainingMs));
  return Math.min(ms, plannedMs(runner.routine));
}

function tick() {
  const runner = state.runner;
  if (!runner || !runner.running) return;
  const now = performance.now();
  const delta = Math.min(now - runner.lastTick, 2000);
  runner.lastTick = now;

  if (!runner.paused) {
    if (runner.phase === 'step') {
      // Stats count the action time only, matching the original runner.
      runner.elapsedActionMs += delta;
    }
    runner.remainingMs -= delta;
    if (runner.phase === 'step' && runner.remainingMs <= 10000 && !runner.spokenTen) {
      runner.spokenTen = true;
      voice.playFixed('ten');
    }
    if (runner.remainingMs <= 0) {
      advancePhase();
      return;
    }
  }
  updateRunnerUI();
}

/** Step → rest (when the routine has one) → next step; the last step finishes. */
function advancePhase() {
  const runner = state.runner;
  if (!runner) return;
  const next = runner.routine.steps[runner.stepIndex + 1];

  if (runner.phase === 'step') {
    const rest = restSecondsFor(runner, runner.stepIndex);
    if (next && rest > 0) {
      runner.phase = 'rest';
      runner.remainingMs = rest * 1000;
      runner.spokenTen = true;
      persistSession();
      voice.stop();
      // The original speaks the prepared step once, at transition start.
      if (runner.routine.builtin && next.clip) voice.playFixed('next-' + next.clip);
      updateRunnerUI();
      return;
    }
    if (!next) {
      finish(true);
      return;
    }
    startStepAt(runner.stepIndex + 1);
    return;
  }

  if (!next) {
    finish(true);
    return;
  }
  // The transition already announced this step ("下一个，X"), so the step
  // itself only repeats its name in the original's "X，30秒" slot.
  startStepAt(runner.stepIndex + 1, { leadIn: false });
}

function startStepAt(index, options) {
  const runner = state.runner;
  if (!runner) return;
  const opts = options || {};
  const step = runner.routine.steps[index];
  runner.stepIndex = index;
  runner.phase = 'step';
  runner.remainingMs = Number(step.seconds || 0) * 1000;
  runner.spokenTen = runner.remainingMs <= 10000;
  persistSession();
  voice.stop();
  if (opts.playCue !== false) {
    if (opts.leadIn === false && step.clip) voice.playFixed(step.clip);
    else voice.playStep(step, index === 0, !!runner.routine.builtin);
  }
  updateRunnerUI();
}

/** Skip the current phase: a rest jumps to the next step, a step skips its rest. */
function skipPhase() {
  const runner = state.runner;
  if (!runner) return;
  const nextIndex = runner.stepIndex + 1;
  if (nextIndex >= runner.routine.steps.length) {
    finish(true);
    return;
  }
  // Skipping a rest means the transition cue was already spoken.
  startStepAt(nextIndex, { leadIn: runner.phase !== 'rest' });
}

/** Library tap: practice one preset action for its catalog duration. */
function startAction(key) {
  const action = SEED_ACTIONS.find((item) => item.key === key);
  if (!action) return;
  startRun({
    id: 'action-' + action.key,
    nameZh: action.zh,
    nameEn: action.en,
    builtin: true,
    steps: [{
      id: 'action-' + action.key,
      nameZh: action.zh,
      nameEn: action.en,
      cueZh: action.cueZh,
      cueEn: action.cueEn,
      seconds: action.seconds,
      clip: action.clip,
    }],
  });
}

function startRun(routine, options) {
  if (!routine) return;
  const opts = options || {};
  const startIndex = Math.max(0, Math.min(routine.steps.length - 1, Number(opts.stepIndex) || 0));
  const startStep = routine.steps[startIndex];
  const startPhase = opts.phase === 'rest' && restSecondsFor({ routine, stepIndex: startIndex }, startIndex) > 0
    ? 'rest'
    : 'step';
  const phaseDefaultMs = startPhase === 'rest'
    ? restSecondsFor({ routine, stepIndex: startIndex }, startIndex) * 1000
    : Number(startStep.seconds || 0) * 1000;
  const remaining = Number(opts.remainingMs) > 0 ? Number(opts.remainingMs) : phaseDefaultMs;

  voice.unlock();
  applyVoiceSettings();

  state.runner = {
    routine,
    stepIndex: startIndex,
    phase: startPhase,
    remainingMs: remaining,
    paused: false,
    running: true,
    lastTick: performance.now(),
    elapsedActionMs: 0,
    spokenTen: remaining <= 10000,
    timer: null,
  };
  state.screen = 'runner';
  state.voiceBlocked = false;
  state.saved = null;
  localStorage.removeItem(ACTIVE_KEY);
  render();

  // A resumed rest does not replay the cue; a fresh start announces the step.
  if (startPhase === 'step') {
    voice.playStep(startStep, startIndex === 0, !!routine.builtin);
  }
  state.runner.timer = setInterval(tick, 200);
  requestWakeLock();
}

function persistSession() {
  const runner = state.runner;
  if (!runner) return;
  const payload = {
    routineId: runner.routine.id,
    stepIndex: runner.stepIndex,
    phase: runner.phase,
    remainingMs: Math.max(0, Math.round(runner.remainingMs)),
    savedAt: Date.now(),
  };
  state.saved = payload;
  try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(payload)); } catch (error) { /* ignore */ }
}

function finish(completed) {
  const runner = state.runner;
  if (!runner) return;
  clearInterval(runner.timer);
  voice.stop();
  const seconds = Math.round(runner.elapsedActionMs / 1000);
  const name = localName(runner.routine);

  if (seconds >= 5) {
    const entry = {
      id: 'history-' + Date.now(),
      routineId: runner.routine.id,
      name,
      endedAt: Date.now(),
      seconds,
      completed: !!completed,
    };
    db.put('history', entry).then(() => {
      state.history.push(entry);
    }).catch(() => {});
  }

  if (completed) voice.playFixed('done');

  state.lastResult = { completed: !!completed, name, seconds };
  state.runner = null;
  state.saved = null;
  localStorage.removeItem(ACTIVE_KEY);
  state.screen = 'done';
  releaseWakeLock();
  render();
}

/* ---------------- wake lock ---------------- */

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (error) {
    wakeLock = null;
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

/* ---------------- editor ---------------- */

function newEditor() {
  state.editor = { name: '', steps: [{ name: '', seconds: 30 }] };
}

function saveRoutine() {
  const editor = state.editor;
  if (!editor) return;
  const name = String(editor.name || '').trim();
  if (!name) {
    toast(t('editor.errorName'));
    return;
  }
  const steps = editor.steps
    .map((step) => ({
      name: String(step.name || '').trim(),
      seconds: Math.max(5, Math.min(600, Number(step.seconds) || 30)),
    }))
    .filter((step) => step.name);
  if (!steps.length) {
    toast(t('editor.errorSteps'));
    return;
  }

  const id = 'custom-' + Date.now();
  const routine = {
    id,
    nameZh: name,
    nameEn: name,
    builtin: false,
    steps: steps.map((step, index) => ({
      id: id + '-' + index,
      nameZh: step.name,
      nameEn: step.name,
      seconds: step.seconds,
      cueZh: '',
      cueEn: '',
    })),
  };

  db.put('routines', routine).then(() => db.getAll('routines')).then((routines) => {
    state.routines = sortRoutines(routines);
    state.editor = null;
    state.screen = 'home';
    render();
  }).catch(() => toast(t('settings.importError')));
}

/* ---------------- data ---------------- */

async function exportBackup() {
  const settings = await db.get('settings', 'app');
  const payload = {
    app: 'stretch-voice-pwa',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    counts: { routines: state.routines.length, history: state.history.length },
    data: {
      routines: state.routines,
      history: state.history,
      settings: settings || { key: 'app', language: state.languageSetting, speech: state.speech, rate: state.rate },
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = 'stretch-backup-' + stamp + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(t('settings.exportDone'));
}

async function importBackup(file) {
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    if (!payload || payload.app !== 'stretch-voice-pwa' || !payload.data
      || !Array.isArray(payload.data.routines) || !Array.isArray(payload.data.history)) {
      throw new Error('bad file');
    }
    const routines = payload.data.routines;
    const history = payload.data.history;
    if (!window.confirm(t('settings.importOk', { routines: routines.length, history: history.length })
      + '\n\n' + t('settings.clearMsg'))) {
      return;
    }
    await db.clear('routines');
    await db.clear('history');
    await db.bulkPut('routines', routines);
    await db.bulkPut('history', history);
    if (payload.data.settings && payload.data.settings.key === 'app') {
      await db.put('settings', payload.data.settings);
      state.languageSetting = payload.data.settings.language || 'auto';
      state.speech = payload.data.settings.speech !== false;
      state.rate = Number(payload.data.settings.rate) || 0.95;
      state.zhVoice = payload.data.settings.zhVoice || 'xiaoxiao';
      state.enVoice = payload.data.settings.enVoice || 'aria';
      state.lang = resolveLanguage(state.languageSetting);
      applyVoiceSettings();
      applyManifestLanguage(state.lang);
    }
    state.routines = sortRoutines(await db.getAll('routines'));
    state.history = await db.getAll('history');
    state.saved = null;
    localStorage.removeItem(ACTIVE_KEY);
    state.screen = 'home';
    render();
    toast(t('settings.importOk', { routines: routines.length, history: history.length }));
  } catch (error) {
    toast(t('settings.importError'));
  }
}

async function clearAllData() {
  if (!window.confirm(t('settings.clearMsg'))) return;
  await db.clear('routines');
  await db.clear('history');
  await db.put('meta', { key: 'seeded', version: SEED_VERSION });
  state.routines = [];
  state.history = [];
  state.saved = null;
  localStorage.removeItem(ACTIVE_KEY);
  state.screen = 'home';
  render();
  toast(t('settings.cleared'));
}

/* ---------------- events ---------------- */

function onClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  const index = Number(target.dataset.index);

  if (action === 'go-home') {
    if (state.runner) {
      const runner = state.runner;
      clearInterval(runner.timer);
      runner.paused = true;
      persistSession();
      voice.stop();
      state.runner = null;
      releaseWakeLock();
    }
    state.screen = 'home';
    render();
    return;
  }
  if (action === 'go-settings') { state.screen = 'settings'; render(); return; }
  if (action === 'go-library') { state.screen = 'library'; render(); return; }
  if (action === 'library-scene') {
    state.libraryScene = target.dataset.scene || 'all';
    render();
    return;
  }
  if (action === 'start-action') { startAction(target.dataset.key); return; }
  if (action === 'go-history') { state.screen = 'history'; render(); return; }
  if (action === 'go-new') { newEditor(); state.screen = 'editor'; render(); return; }

  if (action === 'start') {
    const routine = state.routines.find((item) => item.id === id);
    if (routine) startRun(routine);
    return;
  }
  if (action === 'resume-saved' && state.saved) {
    const routine = state.routines.find((item) => item.id === state.saved.routineId);
    if (routine) {
      startRun(routine, {
        stepIndex: state.saved.stepIndex,
        phase: state.saved.phase,
        remainingMs: state.saved.remainingMs,
      });
    }
    return;
  }
  if (action === 'delete-routine') {
    const routine = state.routines.find((item) => item.id === id);
    if (!routine) return;
    if (!window.confirm(t('home.deleteMsg', { name: localName(routine) }))) return;
    db.remove('routines', id).then(() => db.getAll('routines')).then((routines) => {
      state.routines = sortRoutines(routines);
      if (state.saved && state.saved.routineId === id) {
        state.saved = null;
        localStorage.removeItem(ACTIVE_KEY);
      }
      render();
    });
    return;
  }

  if (action === 'pause' && state.runner) {
    state.runner.paused = true;
    state.runner.lastTick = performance.now();
    voice.stop();
    voice.playFixed('paused');
    persistSession();
    updateRunnerUI();
    return;
  }
  if (action === 'resume' && state.runner) {
    voice.unlock();
    applyVoiceSettings();
    state.runner.paused = false;
    state.runner.lastTick = performance.now();
    voice.playFixed('resumed');
    updateRunnerUI();
    return;
  }
  if (action === 'prev' && state.runner) {
    const runner = state.runner;
    // In a rest the just-finished step restarts; otherwise step back one.
    const target = runner.phase === 'rest' ? runner.stepIndex : runner.stepIndex - 1;
    if (target < 0) return;
    startStepAt(target);
    return;
  }
  if (action === 'add10' && state.runner) {
    // Runtime extension only applies to the action phase, like the original.
    if (state.runner.phase !== 'step') return;
    state.runner.remainingMs += 10000;
    state.runner.spokenTen = state.runner.remainingMs <= 10000;
    persistSession();
    updateRunnerUI();
    return;
  }
  if (action === 'skip' && state.runner) {
    voice.stop();
    skipPhase();
    return;
  }
  if (action === 'end' && state.runner) {
    if (!window.confirm(t('runner.endMsg'))) return;
    finish(false);
    return;
  }

  if (action === 'add-step' && state.editor) {
    state.editor.steps.push({ name: '', seconds: 30 });
    render();
    return;
  }
  if (action === 'remove-step' && state.editor) {
    state.editor.steps.splice(index, 1);
    if (!state.editor.steps.length) state.editor.steps.push({ name: '', seconds: 30 });
    render();
    return;
  }
  if (action === 'save-routine') { saveRoutine(); return; }

  if (action === 'export') { exportBackup(); return; }
  if (action === 'preview-voice') {
    voice.unlock();
    applyVoiceSettings();
    voice.playSequence(['first', 'action-neck-side-bend']);
    return;
  }
  if (action === 'import') {
    const input = document.getElementById('import-file');
    if (input) input.click();
    return;
  }
  if (action === 'clear-data') { clearAllData(); return; }
  if (action === 'clear-history') {
    if (!window.confirm(t('history.clearMsg'))) return;
    db.clear('history').then(() => {
      state.history = [];
      render();
      toast(t('history.deleted'));
    });
    return;
  }
  if (action === 'install') {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => {
      installPrompt = null;
      state.canInstall = false;
      render();
    });
    return;
  }
}

function onInput(event) {
  const el = event.target;
  if (el.dataset.setting === 'rate') {
    state.rate = Number(el.value) || 0.95;
    voice.setRate(state.rate);
    const output = document.getElementById('rate-value');
    if (output) output.textContent = t('settings.rateValue', { value: state.rate.toFixed(2) });
    saveSettings();
    return;
  }
  if (!state.editor) return;
  if (el.dataset.field === 'routine-name') {
    state.editor.name = el.value;
  } else if (el.dataset.field === 'step-name') {
    state.editor.steps[Number(el.dataset.index)].name = el.value;
  } else if (el.dataset.field === 'step-seconds') {
    state.editor.steps[Number(el.dataset.index)].seconds = Number(el.value) || 30;
  }
}

function onChange(event) {
  const el = event.target;
  if (el.name === 'lang') {
    state.languageSetting = el.value;
    state.lang = resolveLanguage(state.languageSetting);
    applyVoiceSettings();
    applyManifestLanguage(state.lang);
    saveSettings();
    render();
    return;
  }
  if (el.name === 'zhVoice') {
    state.zhVoice = el.value;
    applyVoiceSettings();
    saveSettings();
    return;
  }
  if (el.name === 'enVoice') {
    state.enVoice = el.value;
    applyVoiceSettings();
    saveSettings();
    return;
  }
  if (el.dataset.setting === 'speech') {
    state.speech = !!el.checked;
    applyVoiceSettings();
    saveSettings();
    return;
  }
  if (el.id === 'import-file' && el.files && el.files[0]) {
    importBackup(el.files[0]);
    el.value = '';
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  state.canInstall = true;
  if (state.screen === 'home' || state.screen === 'settings') render();
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  state.canInstall = false;
  toast(t('install.done'));
  render();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (state.runner && !state.runner.paused) {
      state.runner.paused = true;
      persistSession();
      voice.stop();
      updateRunnerUI();
    }
    return;
  }
  if (state.runner) {
    state.runner.lastTick = performance.now();
    if (!state.runner.paused) requestWakeLock();
  }
});

appEl.addEventListener('click', onClick);
appEl.addEventListener('input', onInput);
appEl.addEventListener('change', onChange);

boot();
