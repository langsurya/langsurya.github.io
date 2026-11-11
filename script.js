import { APP_VERSION } from './tts/js/config/constants.js';
import { createAppState } from './tts/js/core/app-state.js';
import { createStorageService } from './tts/js/services/storage-service.js';
import { createTranslationService } from './tts/js/services/translation-service.js';
import { createSpeechService } from './tts/js/services/speech-service.js';
import { createVoiceService, normalizeLocale } from './tts/js/services/voice-service.js';
import { createWakeLockService } from './tts/js/services/wake-lock-service.js';
import { chunkText, createReaderController } from './tts/js/controllers/reader-controller.js';
import { createPlayerController } from './tts/js/controllers/player-controller.js';
import { createSettingsController } from './tts/js/controllers/settings-controller.js';
import { createHistoryController } from './tts/js/controllers/history-controller.js';

function bootTtsApp() {
  const $ = id => document.getElementById(id);
  const el = {
    teks:$('teks'), hitung:$('hitung'), bahasa:$('bahasa'), suara:$('suara'),
    kecepatan:$('kecepatan'), nada:$('nada'), volume:$('volume'),
    putar:$('putar'), berhenti:$('berhenti'), uji:$('uji'),
    player:$('player'), pLabel:$('p-label'), pCount:$('p-count'), pBar:$('p-bar'),
    mundur:$('mundur'), maju:$('maju'), pTime:$('p-time'),
    status:$('status'), notice:$('notice'), reader:$('reader'), riwayat:$('riwayat'),
    muat:$('muat'), berkas:$('berkas'), bersih:$('bersih'), tema:$('tema'),
    panel:$('panel'), atur:$('atur'), aturInfo:$('atur-info'), tutup:$('tutup'),
    modeBaca:$('mode-baca'), translateInfo:$('translate-info'),
    translateProgress:$('translate-progress'), translateProgressText:$('translate-progress-text'),
    translateProgressValue:$('translate-progress-value'), translateProgressBar:$('translate-progress-bar')
  };

  function setTranslationProgress(state, percent = 0){
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    el.translateProgress.hidden = state === 'hidden';
    el.translateProgress.dataset.state = state;
    el.translateProgressText.textContent = state === 'done' ? 'Terjemahan siap' : state === 'error' ? 'Terjemahan gagal' : 'Menerjemahkan';
    el.translateProgressValue.textContent = state === 'error' ? '!' : value + '%';
    el.translateProgressBar.style.width = value + '%';
  }

  /* ---------- panel pengaturan (buka/tutup) ---------- */
  function togglePanel(open){
    if (open === undefined) open = el.panel.hidden;
    el.panel.hidden = !open;
    el.atur.setAttribute('aria-expanded', open);
  }
  el.atur.onclick = e => { e.stopPropagation(); togglePanel(); };
  el.tutup.onclick = () => togglePanel(false);
  document.addEventListener('pointerdown', e => {
    if (!el.panel.hidden && !el.panel.contains(e.target) && !el.atur.contains(e.target)) togglePanel(false);
  });

  // Jangan tarik layar ke kalimat aktif saat pengguna sedang menggulir sendiri
  let userScrollAt = 0;
  ['wheel', 'touchmove'].forEach(ev => window.addEventListener(ev, () => { userScrollAt = Date.now(); }, { passive:true }));

  if (!('speechSynthesis' in window)) {
    el.notice.hidden = false;
    el.notice.textContent = 'Browser ini tidak mendukung Web Speech API. Gunakan Chrome, Edge, atau Safari.';
    el.putar.disabled = true; el.uji.disabled = true;
    return;
  }
  const synth = window.speechSynthesis;

  /* ---------- penyimpanan dan state aplikasi ---------- */
  const storage = createStorageService();
  const appState = createAppState({
    settings: {
      rate: storage.getSetting('kecepatan'),
      pitch: storage.getSetting('nada'),
      volume: storage.getSetting('volume')
    }
  });
  const translationService = createTranslationService();
  const store = {
    get(key, fallback) {
      const readers = {
        'tts:tema': () => storage.getTheme(),
        'tts:app_version': () => storage.getAppVersion(),
        'tts:bahasa': () => storage.getLanguage(),
        'tts:bahasa_preference': () => storage.getLanguagePreference(),
        'tts:suara': () => storage.getVoice(),
        'tts:kecepatan': () => storage.getSetting('kecepatan'),
        'tts:nada': () => storage.getSetting('nada'),
        'tts:volume': () => storage.getSetting('volume'),
        'tts:riwayat': () => storage.getHistory()
      };
      const value = readers[key]?.();
      return value === null || value === undefined ? fallback : value;
    },
    set(key, value) {
      const writers = {
        'tts:tema': () => storage.setTheme(value),
        'tts:app_version': () => storage.setAppVersion(value),
        'tts:bahasa': () => storage.setLanguage(value),
        'tts:bahasa_preference': () => storage.setLanguagePreference(value),
        'tts:suara': () => storage.setVoice(value),
        'tts:kecepatan': () => storage.setSetting('kecepatan', value),
        'tts:nada': () => storage.setSetting('nada', value),
        'tts:volume': () => storage.setSetting('volume', value),
        'tts:riwayat': () => storage.setHistory(value)
      };
      return writers[key]?.() ?? false;
    }
  };

  /* ---------- tema ---------- */
  const savedTheme = store.get('tts:tema', null);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  el.tema.onclick = () => {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const now = document.documentElement.dataset.theme || (dark ? 'dark' : 'light');
    const next = now === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('tts:tema', next);
  };

  /* ---------- versi web / cache ---------- */
  function updateAppVersionBadge(){
    const versionNode = $('app-version');
    if (!versionNode) return;
    const previous = store.get('tts:app_version', null);
    versionNode.textContent = 'Versi web: ' + APP_VERSION;
    if (previous && previous !== APP_VERSION) {
      versionNode.title = 'Versi lama terdeteksi di perangkat: ' + previous + '. Halaman baru mungkin belum ter-refresh sepenuhnya.';
    } else {
      versionNode.title = 'Versi web saat ini sudah sesuai dengan file yang dimuat.';
    }
    store.set('tts:app_version', APP_VERSION);
  }

  /* ---------- suara ---------- */
  let voices = [];
  function loadVoices(available){
    voices = available;
    // Saat halaman baru dimuat, select berisi opsi sementara
    // "Memuat daftar suara…". Nilai sementara itu tidak boleh mengalahkan
    // pilihan yang tersimpan, karena hasilnya selalu jatuh ke bahasa Indonesia.
    const savedLang = store.get('tts:bahasa', null);
    const savedVoice = store.get('tts:suara', null);
    const currentLang = el.bahasa.disabled ? null : el.bahasa.value;
    const currentVoice = el.suara.disabled ? null : el.suara.value;
    const prevLang = savedLang || currentLang;
    const prevVoice = savedVoice || currentVoice;
    el.bahasa.innerHTML = '';
    el.suara.innerHTML = '';
    if (!voices.length) {
      const option = document.createElement('option');
      option.textContent = 'Memuat daftar suara…';
      option.disabled = true;
      option.selected = true;
      el.bahasa.appendChild(option);
      el.suara.appendChild(option.cloneNode(true));
      el.bahasa.disabled = el.suara.disabled = true;
      el.notice.hidden = false;
      el.notice.textContent = 'Browser belum menyediakan daftar suara. Coba tunggu sebentar atau muat ulang halaman.';
      return;
    }
    el.bahasa.disabled = el.suara.disabled = false;

    const langList = uniqueLanguageOptions(preferredLangOrder([...new Set(voices.map(v => normalizeLocale(v.lang)))]));
    langList.forEach(lang => {
      const o = document.createElement('option');
      o.value = lang;
      o.textContent = labelForLanguage(lang);
      el.bahasa.appendChild(o);
    });

    const normalizedPrev = prevLang ? normalizeLocale(prevLang) : null;
    const defLang = langList.includes(normalizedPrev) ? normalizedPrev
      : (langList.find(l => normalizeLocale(l).startsWith('id')) ||
         langList.find(l => normalizeLocale(l).startsWith('en-us')) ||
         langList.find(l => normalizeLocale(l).startsWith('en')) ||
         langList[0]);
    el.bahasa.value = defLang;
    fillVoices(prevVoice);

    const adaID = langList.some(l => normalizeLocale(l).startsWith('id'));
    el.notice.hidden = adaID;
    if (!adaID) el.notice.textContent =
      'Suara bahasa Indonesia belum terpasang di sistem Anda. Di Windows: Settings → Time & language → Speech → Add voices. Di Chrome, suara Google online juga bisa muncul jika terhubung internet.';
    updateAppVersionBadge();
  }

  const languageLabels = {
    'id-id': 'Indonesia',
    'id': 'Indonesia',
    'en-us': 'English (US)',
    'en-gb': 'English (UK)',
    'en-au': 'English (Australia)',
    'en-ca': 'English (Canada)',
    'en': 'English',
    'de-de': 'Deutsch',
    'de': 'Deutsch',
    'fr-fr': 'Français',
    'fr': 'Français',
    'es-es': 'Español',
    'es': 'Español',
    'ja-jp': '日本語 (Nihongo)',
    'ja': '日本語 (Nihongo)',
    'ko-kr': '한국어 (Hangul)',
    'ko': '한국어 (Hangul)',
    'zh-cn': '中文 (Zhōngwén, 简体)',
    'zh-tw': '中文 (Zhōngwén, 繁體)',
    'zh-hk': '中文 (Zhōngwén, 香港)',
    'zh': '中文 (Zhōngwén)',
    'pt-br': 'Português (Brasil)',
    'pt-pt': 'Português (Portugal)',
    'pt': 'Português',
    'it-it': 'Italiano',
    'it': 'Italiano',
    'ru-ru': 'Русский (Russkiy)',
    'ru': 'Русский (Russkiy)',
    'nl-nl': 'Nederlands',
    'nl': 'Nederlands',
    'hi-in': 'हिन्दी (Hindi)',
    'hi': 'हिन्दी (Hindi)',
    'pl-pl': 'Polski (Polish)',
    'pl': 'Polski (Polish)',
    'tr-tr': 'Türkçe (Turkish)',
    'tr': 'Türkçe (Turkish)',
    'as-in': 'অসমীয়া (Assamese)',
    'bn-in': 'বাংলা (Bangla)',
    'mr-in': 'मराठी (Marathi)',
    'ta-in': 'தமிழ் (Tamil)',
    'te-in': 'తెలుగు (Telugu)',
    'gu-in': 'ગુજરાતી (Gujarati)'
  };

  function labelForLanguage(lang){
    const key = normalizeLocale(lang);
    return languageLabels[key] || languageLabels[key.split('-')[0]] || (lang || '').replace(/_/g, '-');
  }

  function preferredLangOrder(langList){
    return [...langList].sort((a, b) => {
      const order = ['id-id', 'en-us', 'en-gb', 'en-au', 'en-ca', 'de-de', 'fr-fr', 'es-es', 'it-it', 'pt-br', 'ja-jp', 'ko-kr', 'zh-cn', 'zh-tw', 'zh-hk', 'ru-ru', 'hi-in', 'pl-pl', 'tr-tr', 'nl-nl'];
      const ai = order.indexOf(normalizeLocale(a));
      const bi = order.indexOf(normalizeLocale(b));
      if (ai === -1 && bi === -1) return normalizeLocale(a).localeCompare(normalizeLocale(b));
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }

  function uniqueLanguageOptions(langList){
    const seen = new Set();
    return langList.filter(lang => {
      const key = normalizeLocale(lang);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function fillVoices(prefer){
    const lang = normalizeLocale(el.bahasa.value);
    const list = voices.filter(v => normalizeLocale(v.lang) === lang);
    el.suara.innerHTML = '';
    list.forEach(v => {
      const o = document.createElement('option');
      o.value = v.name; o.textContent = v.name + (v.localService ? '' : ' (online)');
      el.suara.appendChild(o);
    });
    if (prefer && list.some(v => v.name === prefer)) el.suara.value = prefer;
    if (!el.suara.value && list.length) el.suara.selectedIndex = 0;
  }

  function applyDetectedLanguage(){
    if (!voices.length) return;
    const detected = voiceService.detectLanguage(el.teks.value);
    if (!detected) return;
    const langList = uniqueLanguageOptions(preferredLangOrder([...new Set(voices.map(v => normalizeLocale(v.lang)))]));
    const target = langList.find(l => normalizeLocale(l).startsWith(detected)) ||
      langList.find(l => normalizeLocale(l).startsWith('id')) ||
      langList.find(l => normalizeLocale(l).startsWith('en'));
    if (!target || normalizeLocale(el.bahasa.value) === normalizeLocale(target)) return;
    el.bahasa.value = target;
    fillVoices();
    store.set('tts:bahasa', normalizeLocale(el.bahasa.value));
    store.set('tts:suara', el.suara.value);
    store.set('tts:bahasa_preference', 'detected');
    return true;
  }

  const voiceService = createVoiceService({ synth, storage, onVoicesChanged:loadVoices });
  voiceService.start();
  el.bahasa.onchange = () => {
    cancelActiveSession('Bahasa diubah.');
    fillVoices();
    voiceService.selectLanguage(el.bahasa.value, 'manual');
    voiceService.selectVoice(el.suara.value);
  };
  el.suara.onchange = () => voiceService.selectVoice(el.suara.value);

  /* ---------- kontrol kecepatan / nada / volume ---------- */
  const ctl = {
    kecepatan:{ def:1, fmt:v => (+v.toFixed(2)) + '×' },
    nada:     { def:1, fmt:v => v < 0.95 ? 'Rendah ' + v.toFixed(1) : v > 1.05 ? 'Tinggi ' + v.toFixed(1) : 'Normal' },
    volume:   { def:1, fmt:v => Math.round(v * 100) + '%' }
  };
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const settingsController = createSettingsController({
    controls:el,
    storage,
    appState,
    formatters:Object.fromEntries(Object.entries(ctl).map(([name, config]) => [name, config.fmt]))
  });

  function render(k){
    const r = el[k], v = +r.value, min = +r.min, max = +r.max;
    const txt = ctl[k].fmt(v);
    $('o-' + k).textContent = txt;
    settingsController.render(k);
    r.style.setProperty('--pct', ((v - min) / (max - min) * 100) + '%');
    document.querySelectorAll('.step[data-target="' + k + '"]').forEach(b => {
      b.disabled = b.dataset.dir === '-1' ? v <= min : v >= max;
    });
    document.querySelectorAll('.chip[data-target="' + k + '"]').forEach(c => {
      const on = near(+c.dataset.value, v);
      c.classList.toggle('on', on);
      c.setAttribute('aria-pressed', on);
    });
    const reset = document.querySelector('.reset[data-target="' + k + '"]');
    if (reset) reset.hidden = near(v, ctl[k].def);
    if (el.aturInfo) el.aturInfo.textContent =
      ctl.kecepatan.fmt(+el.kecepatan.value) + ' · ' + ctl.volume.fmt(+el.volume.value);
  }

  function setVal(k, v){
    const r = el[k], step = +r.step;
    v = Math.min(+r.max, Math.max(+r.min, Math.round(v / step) * step));
    r.value = +v.toFixed(2);
    render(k);
  }

  Object.keys(ctl).forEach(k => {
    const saved = store.get('tts:' + k, null);
    if (saved !== null) el[k].value = saved;
    el[k].addEventListener('input', () => render(k));
    render(k);
  });

  // tombol −/+ : klik sekali naik/turun satu langkah, tahan untuk mengulang
  document.querySelectorAll('.step[data-target]').forEach(b => {
    const k = b.dataset.target, dir = +b.dataset.dir;
    const bump = () => setVal(k, +el[k].value + dir * +el[k].step);
    let t1, t2;
    const stop = () => { clearTimeout(t1); clearInterval(t2); };
    b.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      bump();
      t1 = setTimeout(() => { t2 = setInterval(() => { if (b.disabled) stop(); else bump(); }, 80); }, 400);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
    b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); bump(); } });
  });

  document.querySelectorAll('.chip[data-target]').forEach(c =>
    c.addEventListener('click', () => setVal(c.dataset.target, +c.dataset.value)));
  document.querySelectorAll('.reset[data-target]').forEach(b =>
    b.addEventListener('click', () => setVal(b.dataset.target, ctl[b.dataset.target].def)));

  /* ---------- hitung karakter ---------- */
  function updateCount(){
    const t = el.teks.value;
    const w = t.trim() ? t.trim().split(/\s+/).length : 0;
    el.hitung.textContent = t.length.toLocaleString('id-ID') + ' karakter · ' + w.toLocaleString('id-ID') + ' kata';
    // Deteksi otomatis hanya dipakai sebelum pengguna pernah memilih bahasa.
    // Setelah pilihan tersimpan, refresh halaman harus mempertahankannya.
    if (store.get('tts:bahasa_preference', 'detected') !== 'manual') applyDetectedLanguage();
  }
  el.teks.addEventListener('input', () => {
    cancelActiveSession('Teks diubah.');
    updateCount();
  });
  el.teks.value = '';
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      el.teks.value = '';
      updateCount();
    }
  });
  updateCount();

  /* ---------- terjemahan ---------- */
  const readMode = () => el.modeBaca.querySelector('input[name="mode-baca"]:checked')?.value || 'original';
  const defaultModeInput = el.modeBaca.querySelector('input[value="original"]');
  if (defaultModeInput) defaultModeInput.checked = true;
  function updateTranslateMode(){
    const mode = readMode();
    el.translateInfo.hidden = mode !== 'id';
    el.modeBaca.dataset.mode = mode;
    // Bahasa pada select tetap bahasa sumber dan tidak diubah oleh mode baca.
  }
  el.modeBaca.addEventListener('change', () => {
    const wasActive = state !== 'idle';
    cancelActiveSession('Mode bacaan diubah.');
    updateTranslateMode();
    if (wasActive) start();
  });
  updateTranslateMode();

  async function translateToIndonesian(text, onProgress){
    const result = await translationService.translate(text, el.bahasa.value || 'en', (percent, sessionId) => {
      appState.transitionTranslation('loading', { progress:percent, sessionId });
      onProgress?.(percent);
    });
    return result.text;
  }

  /* ---------- pecah teks menjadi kalimat ---------- */
  // Mengembalikan potongan beserta posisi aslinya agar tampilan pembaca identik dengan teks yang ditempel
  // Koma TIDAK memecah potongan: mesin suara memberi jeda koma yang singkat,
  // jauh lebih cepat daripada jeda antar-ucapan (titik). Kalimat panjang
  // hanya dipotong bila > max, dan sebisa mungkin di koma.
  /* ---------- pemutaran ---------- */
  let queue = [], idx = 0, state = 'idle', token = 0, source = '', speechCancelled = false, chunkTimer = null, stalledRetries = 0;
  // undefined = belum ada sesi, sehingga Uji Suara mengikuti select.
  // null = sesi sengaja tidak menemukan voice khusus dan hanya memakai lang.
  let playbackVoice, playbackLang = null;

  function cancelSpeech(){
    clearTimeout(chunkTimer);
    chunkTimer = null;
    speechService.cancel();
    speechCancelled = true;
  }
  let wakeLockMessage = '';

  function setWakeLockMessage(message, warning = false){
    wakeLockMessage = message;
    el.player.dataset.wakeLock = warning ? 'warning' : message ? 'active' : 'off';
    el.player.title = message;
  }

  const wakeLockService = createWakeLockService({ onStatus:setWakeLockMessage });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state === 'playing') wakeLockService.hold(true);
  });

  // Beberapa browser Chromium turunan hanya mengizinkan permintaan Wake Lock
  // langsung dari interaksi pengguna. Coba lagi pada sentuhan saat membaca.
  document.addEventListener('pointerdown', () => {
    if (state === 'playing' && !wakeLockService.isHeld()) wakeLockService.hold(true);
  }, { passive:true });

  function setState(s){
    state = s;
    // Oscillator keep-awake membantu perangkat mobile, tetapi pada audio
    // desktop tertentu justru berebut kanal dengan speech synthesis dan
    // membuat suara patah-patah.
    wakeLockService.keepAudioAwake(s === 'playing' && matchMedia('(max-width: 600px)').matches);
    wakeLockService.hold(s === 'playing');
    el.player.dataset.state = s;
    const lbl = s === 'playing' ? 'Jeda' : s === 'paused' ? 'Lanjutkan' : s === 'preparing' ? 'Menyiapkan' : 'Putar';
    el.putar.setAttribute('aria-label', lbl);
    el.putar.title = lbl + (s === 'playing' ? '' : ' (Ctrl+Enter)');
    el.putar.disabled = s === 'preparing';
    el.berhenti.disabled = s === 'idle';
    el.uji.disabled = s !== 'idle';
    el.mundur.disabled = el.maju.disabled = s === 'idle';
    if (s === 'paused') el.pLabel.textContent = 'Dijeda';
    if (s === 'playing') startClock(); else stopClock();
    if (s === 'playing' && wakeLockMessage) el.status.textContent = wakeLockMessage;
  }
  const playerController = createPlayerController({ appState, onStateChange:setState });
  const speechService = createSpeechService({ synth, Utterance:SpeechSynthesisUtterance, matchMedia });
  const readerController = createReaderController({
    reader:el.reader,
    empty:$('reader-empty'),
    player:el.player,
    panel:el.panel,
    getLastUserScroll:() => userScrollAt,
    onSelect:index => jumpTo(index)
  });

  /* ---------- countdown sisa waktu ---------- */
  const CPS = 14; // perkiraan karakter per detik pada kecepatan 1×
  let remaining = 0, clock = null;
  const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  function estimateFrom(i){
    let chars = 0;
    for (let k = i; k < queue.length; k++) chars += queue[k].text.length;
    return chars / (CPS * (+el.kecepatan.value || 1));
  }
  function showTime(){ el.pTime.textContent = queue.length ? '-' + fmtTime(remaining) : '--:--'; }
  function startClock(){
    stopClock();
    clock = setInterval(() => { remaining = Math.max(0, remaining - 1); showTime(); }, 1000);
  }
  function stopClock(){ clearInterval(clock); clock = null; }
  el.kecepatan.addEventListener('input', () => { if (state !== 'idle'){ remaining = estimateFrom(idx); showTime(); } });

  /* ---------- skip mundur / maju (per kalimat) ---------- */
  function skip(dir){
    if (state === 'idle' || !queue.length) return;
    playerController.skip({ index:idx, queueLength:queue.length });
    jumpTo(Math.min(queue.length - 1, Math.max(0, idx + dir)));
  }
  el.mundur.onclick = () => skip(-1);
  el.maju.onclick = () => skip(1);

  function setProgress(done){
    const n = queue.length || 1;
    el.pBar.style.width = (done / n * 100) + '%';
    el.pCount.textContent = queue.length ? Math.min(idx + 1, queue.length) + ' / ' + queue.length : '';
  }

  function speechSnapshot(voice = playbackVoice, lang = playbackLang){
    return Object.freeze({
      voice,
      lang:lang || voice?.lang || el.bahasa.value || 'en-US',
      rate:+el.kecepatan.value,
      pitch:+el.nada.value,
      volume:+el.volume.value
    });
  }

  function say(text, onend, onerror, snapshot = speechSnapshot()){
    speechCancelled = false;
    return speechService.speak(text, snapshot, onend, onerror);
  }

  function jumpTo(i){
    token++; cancelSpeech();
    idx = i;
    playerController.skip({ index:idx, queueLength:queue.length });
    // Android Chrome sering membuang speak() yang dipanggil tepat setelah
    // cancel(); beri jeda singkat agar suara benar-benar keluar.
    const myToken = token;
    chunkTimer = setTimeout(() => { chunkTimer = null; next(myToken); }, 120);
  }

  function next(myToken){
    if (myToken !== token) return;
    if (idx >= queue.length){ finish('Selesai dibacakan.', true); return; }
    readerController.mark(idx);
    readerController.center(idx);
    el.pLabel.textContent = 'Membacakan…';
    setProgress(idx);
    remaining = estimateFrom(idx); showTime();
    el.status.textContent = '';
    if (myToken !== token) return;
    say(queue[idx].text, () => {
      if (myToken !== token) return;
      stalledRetries = 0;
      // Beri mesin suara online waktu singkat untuk menutup kanal kalimat
      // sebelumnya. Pemanggilan speak() langsung dari onend kadang membuat
      // awal kalimat berikutnya patah atau terdengar terbata-bata di desktop.
      const delay = matchMedia('(max-width: 600px)').matches ? 0 : 120;
      const advance = () => {
        chunkTimer = null;
        if (myToken !== token) return;
        if (state === 'paused') {
          chunkTimer = setTimeout(advance, 100);
          return;
        }
        idx++; next(myToken);
      };
      if (delay) chunkTimer = setTimeout(advance, delay);
      else advance();
    }, e => {
      if (myToken !== token) return;
      if (e.error === 'stalled' && stalledRetries < 3) {
        stalledRetries++;
        el.status.textContent = 'Suara terputus oleh Chrome. Mencoba menyambungkan kembali…';
        jumpTo(idx);
        return;
      }
      finish(e.error === 'stalled'
        ? 'Suara terhenti setelah 3 kali percobaan. Tekan Putar untuk melanjutkan.'
        : 'Terjadi kesalahan suara: ' + e.error);
    });
  }

  function finish(msg, completed){
    token++; cancelSpeech();
    translationService.cancel();
    appState.transitionTranslation('idle', { progress:0 });
    if (completed){ readerController.complete(); el.pBar.style.width = '100%'; }
    else { readerController.clear(); el.pBar.style.width = '0%'; }
    idx = 0;
    el.pCount.textContent = '';
    remaining = 0; el.pTime.textContent = completed ? '00:00' : '--:--';
    el.pLabel.textContent = completed ? 'Selesai' : 'Siap diputar';
    el.status.textContent = msg;
    playerController.stop(msg);
  }

  function cancelActiveSession(message = ''){
    const translationStatus = appState.getSnapshot().translation.status;
    if (state === 'idle' && translationStatus !== 'loading') return false;
    token++;
    cancelSpeech();
    translationService.cancel();
    appState.transitionTranslation('cancelled', { progress:0, sessionId:token });
    setTranslationProgress('hidden');
    queue = [];
    idx = 0;
    remaining = 0;
    el.pCount.textContent = '';
    el.pTime.textContent = '--:--';
    el.pBar.style.width = '0%';
    el.pLabel.textContent = 'Siap diputar';
    playerController.stop(message);
    if (message) el.status.textContent = message;
    return true;
  }

  async function start(){
    const original = el.teks.value.replace(/\r/g, '');
    if (!original.trim()){ el.status.textContent = 'Isi teks dulu sebelum memutar.'; el.teks.focus(); return; }
    if (state !== 'idle') return;
    // Mode baca menjadi prioritas utama. Deteksi ulang bahasa sumber sebelum
    // mengambil suara agar pilihan Indonesia yang tertinggal dari mode
    // terjemahan versi lama tidak dipakai untuk teks original berbahasa lain.
    applyDetectedLanguage();
    // PlayerController memiliki lifecycle sesi UI. Token lokal hanya menjaga
    // callback utterance/timer lama agar tidak dapat memajukan antrean baru.
    const startToken = ++token;
    const playerSession = playerController.prepare();
    source = original;
    playbackVoice = voices.find(x => x.name === el.suara.value) || null;
    playbackLang = el.bahasa.value || playbackVoice?.lang || 'en-US';
    if (readMode() === 'id') {
      el.status.textContent = '';
      setTranslationProgress('loading', 0);
      appState.transitionTranslation('loading', { progress:0 });
      try {
        const translated = await translateToIndonesian(original, percent => {
          if (startToken !== token) return;
          setTranslationProgress('loading', percent);
        });
        if (startToken !== token || !playerController.isCurrent(playerSession)) return;
        source = translated;
        playbackVoice = voices.find(v => normalizeLocale(v.lang).startsWith('id') && /google/i.test(v.name))
          || voices.find(v => normalizeLocale(v.lang).startsWith('id'))
          || null;
        playbackLang = playbackVoice?.lang || 'id-ID';
        const outputVoice = playbackVoice?.name || 'suara bawaan browser';
        setTranslationProgress('done', 100);
        appState.transitionTranslation('done', { progress:100 });
        el.status.textContent = 'Bahasa Indonesia · ' + outputVoice;
      } catch (error) {
        if (error.code === 'ABORTED' || startToken !== token || !playerController.isCurrent(playerSession)) return;
        setTranslationProgress('error', 0);
        appState.transitionTranslation('error', { progress:0 });
        el.status.textContent = 'Terjemahan gagal: ' + error.message + '. Silakan pilih teks original atau coba lagi.';
        playerController.stop('Terjemahan gagal.');
        return;
      }
    } else {
      setTranslationProgress('hidden');
    }
    if (startToken !== token || !playerController.isCurrent(playerSession)) return;
    if (!speechCancelled && (synth.speaking || synth.pending)) cancelSpeech();
    queue = chunkText(source); idx = 0; stalledRetries = 0;
    readerController.render(source, queue);
    playerController.play({ index:idx, queueLength:queue.length });
    historyController.add(original.trim());
    next(startToken);
  }

  // Catatan: synth.pause()/resume() tidak andal di mobile (Android Chrome sering
  // diam setelah resume dan onend tidak pernah terpanggil). Karena itu jeda =
  // hentikan ucapan, lanjut = ucapkan ulang kalimat yang sedang aktif.
  function pause(){
    token++; cancelSpeech();
    playerController.pause({ index:idx, queueLength:queue.length });
    setProgress(idx);
    remaining = estimateFrom(idx); showTime();
  }
  function resume(){
    el.pLabel.textContent = 'Membacakan…';
    playerController.resume({ index:idx, queueLength:queue.length });
    jumpTo(idx);
  }

  el.putar.onclick = () => {
    if (state === 'playing'){ pause(); return; }
    if (state === 'paused'){ resume(); return; }
    start();
  };

  el.berhenti.onclick = () => {
    if (state === 'preparing') cancelActiveSession('Dihentikan.');
    else finish('Dihentikan.');
  };

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ e.preventDefault(); el.putar.click(); }
    else if (e.key === 'Escape' && !el.panel.hidden) togglePanel(false);
    else if (e.key === 'Escape' && state !== 'idle') finish('Dihentikan.');
    else if (e.altKey && e.key === 'ArrowLeft'){ e.preventDefault(); skip(-1); }
    else if (e.altKey && e.key === 'ArrowRight'){ e.preventDefault(); skip(1); }
  });

  el.uji.onclick = () => {
    cancelSpeech();
    el.status.textContent = 'Menguji suara…';
    const selected = voiceService.snapshot(el.suara.value, el.bahasa.value);
    const snapshot = speechSnapshot(selected.voice, selected.lang);
    say('Halo, ini contoh suara yang dipilih.', () => { el.status.textContent = ''; }, () => { el.status.textContent = 'Uji suara gagal.'; }, snapshot);
  };

  window.addEventListener('beforeunload', cancelSpeech);

  /* ---------- file & bersihkan ---------- */
  el.muat.onclick = () => el.berkas.click();
  el.berkas.onchange = async () => {
    const f = el.berkas.files[0]; if (!f) return;
    el.teks.value = await f.text(); updateCount();
    el.status.textContent = 'File "' + f.name + '" dimuat.';
    el.berkas.value = '';
  };
  el.bersih.onclick = () => { el.teks.value = ''; updateCount(); el.teks.focus(); };

  /* ---------- riwayat ---------- */
  function renderHistory(history){
    el.riwayat.innerHTML = '';
    if (!history.length){
      const li = document.createElement('li');
      li.className = 'empty'; li.textContent = 'Belum ada. Teks yang pernah diputar akan muncul di sini.';
      el.riwayat.appendChild(li); return;
    }
    history.forEach((h, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      const firstLine = h.split(/\r?\n/).find(line => line.trim()) || h;
      b.className = 'txt'; b.type = 'button'; b.textContent = firstLine.trim(); b.title = h;
      b.onclick = () => { el.teks.value = h; updateCount(); el.teks.focus(); };
      const d = document.createElement('button');
      d.className = 'small'; d.type = 'button'; d.textContent = 'Hapus';
      d.setAttribute('aria-label', 'Hapus dari riwayat');
      d.onclick = () => historyController.remove(i);
      li.append(b, d); el.riwayat.appendChild(li);
    });
  }
  const historyController = createHistoryController({ storage, onChange:renderHistory });
  historyController.render();
  setState('idle');
}

bootTtsApp();
