(() => {
  const $ = id => document.getElementById(id);
  const el = {
    teks:$('teks'), hitung:$('hitung'), bahasa:$('bahasa'), suara:$('suara'),
    kecepatan:$('kecepatan'), nada:$('nada'), volume:$('volume'),
    putar:$('putar'), berhenti:$('berhenti'), uji:$('uji'),
    player:$('player'), pLabel:$('p-label'), pCount:$('p-count'), pBar:$('p-bar'),
    mundur:$('mundur'), maju:$('maju'), pTime:$('p-time'),
    status:$('status'), notice:$('notice'), reader:$('reader'), riwayat:$('riwayat'),
    muat:$('muat'), berkas:$('berkas'), bersih:$('bersih'), tema:$('tema')
  };

  if (!('speechSynthesis' in window)) {
    el.notice.hidden = false;
    el.notice.textContent = 'Browser ini tidak mendukung Web Speech API. Gunakan Chrome, Edge, atau Safari.';
    el.putar.disabled = true; el.uji.disabled = true;
    return;
  }
  const synth = window.speechSynthesis;

  /* ---------- penyimpanan (aman jika diblokir) ---------- */
  const store = {
    get(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
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

  /* ---------- suara ---------- */
  let voices = [];
  let voiceSignature = null;
  function loadVoices(){
    const available = synth.getVoices();
    const signature = available.map(v => [v.voiceURI, v.name, v.lang, v.localService].join('\0')).join('\1');
    if (signature === voiceSignature) return;
    voiceSignature = signature;
    voices = available;

    const prevLang = el.bahasa.value || store.get('tts:bahasa', null);
    const prevVoice = el.suara.value || store.get('tts:suara', null);
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
    const langs = [...new Set(voices.map(v => v.lang))].sort((a, b) => a.localeCompare(b));

    langs.forEach(l => {
      const o = document.createElement('option');
      o.value = l; o.textContent = l;
      el.bahasa.appendChild(o);
    });
    const defLang = langs.includes(prevLang) ? prevLang
      : langs.find(l => l.toLowerCase().startsWith('id')) || langs.find(l => l.toLowerCase().startsWith('en')) || langs[0];
    el.bahasa.value = defLang;
    fillVoices(prevVoice);

    const adaID = langs.some(l => l.toLowerCase().startsWith('id'));
    el.notice.hidden = adaID;
    if (!adaID) el.notice.textContent =
      'Suara bahasa Indonesia belum terpasang di sistem Anda. Di Windows: Settings → Time & language → Speech → Add voices. Di Chrome, suara Google online juga bisa muncul jika terhubung internet.';
  }
  function fillVoices(prefer){
    const lang = el.bahasa.value;
    const list = voices.filter(v => v.lang === lang);
    el.suara.innerHTML = '';
    list.forEach(v => {
      const o = document.createElement('option');
      o.value = v.name; o.textContent = v.name + (v.localService ? '' : ' (online)');
      el.suara.appendChild(o);
    });
    if (prefer && list.some(v => v.name === prefer)) el.suara.value = prefer;
  }
  synth.addEventListener('voiceschanged', loadVoices);
  loadVoices();
  let voiceRetryCount = 0;
  const voiceRetry = setInterval(() => {
    loadVoices();
    if (++voiceRetryCount >= 40) clearInterval(voiceRetry);
  }, 250);
  el.bahasa.onchange = () => { fillVoices(); store.set('tts:bahasa', el.bahasa.value); store.set('tts:suara', el.suara.value); };
  el.suara.onchange = () => store.set('tts:suara', el.suara.value);

  /* ---------- kontrol kecepatan / nada / volume ---------- */
  const ctl = {
    kecepatan:{ def:1, fmt:v => (+v.toFixed(2)) + '×' },
    nada:     { def:1, fmt:v => v < 0.95 ? 'Rendah ' + v.toFixed(1) : v > 1.05 ? 'Tinggi ' + v.toFixed(1) : 'Normal' },
    volume:   { def:1, fmt:v => Math.round(v * 100) + '%' }
  };
  const near = (a, b) => Math.abs(a - b) < 1e-6;

  function render(k){
    const r = el[k], v = +r.value, min = +r.min, max = +r.max;
    const txt = ctl[k].fmt(v);
    $('o-' + k).textContent = txt;
    r.setAttribute('aria-valuetext', txt);
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
    store.set('tts:' + k, v);
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
    store.set('tts:draf', t);
  }
  el.teks.addEventListener('input', updateCount);
  el.teks.value = store.get('tts:draf', '');
  updateCount();

  /* ---------- pecah teks menjadi kalimat ---------- */
  // Mengembalikan potongan beserta posisi aslinya agar tampilan pembaca identik dengan teks yang ditempel
  function chunk(text, max = 180){
    const out = [], re = /[^.!?;:,\n]+[.!?;:,]*["'”’)\]]*/g, ws = /\s/;
    let m;
    while ((m = re.exec(text))){
      let s = m.index, e = s + m[0].length;
      while (s < e && ws.test(text[s])) s++;
      while (e > s && ws.test(text[e - 1])) e--;
      if (e <= s) continue;
      while (e - s > max){
        let cut = text.lastIndexOf(' ', s + max);
        if (cut <= s) {
          cut = text.indexOf(' ', s + max);
          if (cut < 0 || cut >= e) break;
        }
        if (e - cut < 45) {
          const balancedCut = text.lastIndexOf(' ', s + max - 45);
          if (balancedCut > s) cut = balancedCut;
          else if (e - s <= max + 45) break;
        }
        out.push({ start:s, end:cut, text:text.slice(s, cut) });
        s = cut;
        while (s < e && ws.test(text[s])) s++;
      }
      out.push({ start:s, end:e, text:text.slice(s, e) });
    }
    return out;
  }

  /* ---------- pemutaran ---------- */
  let queue = [], idx = 0, state = 'idle', spans = [], token = 0, source = '', speechCancelled = false, chunkTimer = null;

  function cancelSpeech(){
    clearTimeout(chunkTimer);
    chunkTimer = null;
    synth.cancel();
    speechCancelled = true;
  }

  function setState(s){
    state = s;
    el.player.dataset.state = s;
    const lbl = s === 'playing' ? 'Jeda' : s === 'paused' ? 'Lanjutkan' : 'Putar';
    el.putar.setAttribute('aria-label', lbl);
    el.putar.title = lbl + (s === 'playing' ? '' : ' (Ctrl+Enter)');
    el.berhenti.disabled = s === 'idle';
    el.uji.disabled = s !== 'idle';
    el.mundur.disabled = el.maju.disabled = s === 'idle';
    if (s === 'paused') el.pLabel.textContent = 'Dijeda';
    if (s === 'playing') startClock(); else stopClock();
  }

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
    jumpTo(Math.min(queue.length - 1, Math.max(0, idx + dir)));
  }
  el.mundur.onclick = () => skip(-1);
  el.maju.onclick = () => skip(1);

  function setProgress(done){
    const n = queue.length || 1;
    el.pBar.style.width = (done / n * 100) + '%';
    el.pCount.textContent = queue.length ? Math.min(idx + 1, queue.length) + ' / ' + queue.length : '';
  }

  function say(text, onend, onerror){
    const u = new SpeechSynthesisUtterance(text);
    const v = voices.find(x => x.name === el.suara.value);
    if (v){ u.voice = v; u.lang = v.lang; } else u.lang = el.bahasa.value || 'id-ID';
    u.rate = +el.kecepatan.value; u.pitch = +el.nada.value; u.volume = +el.volume.value;
    // Di sebagian browser mobile, onend kadang tidak terpanggil sehingga
    // antrean macet (mis. tetap 1/378). Watchdog memanggil onend sekali saja
    // jika mesin suara sudah tidak berbicara.
    let ended = false, started = false, watch = null;
    const done = () => {
      if (ended) return;
      ended = true; clearInterval(watch);
      onend && onend();
    };
    u.onstart = () => { started = true; };
    u.onend = done;
    u.onerror = e => {
      ended = true; clearInterval(watch);
      if (e.error !== 'canceled' && e.error !== 'interrupted') onerror && onerror(e);
    };
    speechCancelled = false;
    synth.resume();
    synth.speak(u);
    let idle = 0;
    watch = setInterval(() => {
      if (ended || speechCancelled) { clearInterval(watch); return; }
      if (!synth.speaking && !synth.pending) {
        // beri waktu ekstra jika ucapan belum sempat mulai
        if (++idle >= (started ? 2 : 6)) done();
      } else idle = 0;
    }, 500);
    return u;
  }

  function renderReader(){
    el.reader.innerHTML = ''; spans = [];
    let pos = 0;
    queue.forEach((c, i) => {
      if (c.start > pos) el.reader.appendChild(document.createTextNode(source.slice(pos, c.start)));
      const s = document.createElement('span');
      s.textContent = c.text;
      s.title = 'Klik untuk membaca dari sini';
      s.onclick = () => jumpTo(i);
      el.reader.appendChild(s); spans.push(s);
      pos = c.end;
    });
    if (pos < source.length) el.reader.appendChild(document.createTextNode(source.slice(pos)));
    el.reader.hidden = false;
  }

  function jumpTo(i){
    token++; cancelSpeech();
    idx = i; setState('playing');
    // Android Chrome sering membuang speak() yang dipanggil tepat setelah
    // cancel(); beri jeda singkat agar suara benar-benar keluar.
    const myToken = token;
    chunkTimer = setTimeout(() => { chunkTimer = null; next(myToken); }, 120);
  }

  function next(myToken){
    if (myToken !== token) return;
    if (idx >= queue.length){ finish('Selesai dibacakan.', true); return; }
    spans.forEach((s, i) => { s.className = i < idx ? 'done' : i === idx ? 'now' : ''; });
    spans[idx].scrollIntoView({ block:'nearest', behavior:'smooth' });
    el.pLabel.textContent = 'Membacakan…';
    setProgress(idx);
    remaining = estimateFrom(idx); showTime();
    el.status.textContent = '';
    if (myToken !== token) return;
    say(queue[idx].text, () => {
      if (myToken !== token) return;
      const delay = /,[\"'”’)\]]*$/.test(queue[idx].text) ? 180 : 0;
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
      if (myToken === token) finish('Terjadi kesalahan suara: ' + e.error);
    });
  }

  function finish(msg, completed){
    token++; cancelSpeech();
    if (completed){ spans.forEach(s => s.className = 'done'); el.pBar.style.width = '100%'; }
    else { spans.forEach(s => s.className = ''); el.pBar.style.width = '0%'; }
    idx = 0;
    el.pCount.textContent = '';
    remaining = 0; el.pTime.textContent = completed ? '00:00' : '--:--';
    el.pLabel.textContent = completed ? 'Selesai' : 'Siap diputar';
    el.status.textContent = msg;
    setState('idle');
  }

  function start(){
    source = el.teks.value.replace(/\r/g, '');
    if (!source.trim()){ el.status.textContent = 'Isi teks dulu sebelum memutar.'; el.teks.focus(); return; }
    token++;
    if (!speechCancelled && (synth.speaking || synth.pending)) cancelSpeech();
    queue = chunk(source); idx = 0;
    renderReader(); setState('playing');
    addHistory(source.trim());
    next(token);
  }

  // Catatan: synth.pause()/resume() tidak andal di mobile (Android Chrome sering
  // diam setelah resume dan onend tidak pernah terpanggil). Karena itu jeda =
  // hentikan ucapan, lanjut = ucapkan ulang kalimat yang sedang aktif.
  function pause(){
    token++; cancelSpeech();
    setState('paused');
    setProgress(idx);
    remaining = estimateFrom(idx); showTime();
  }
  function resume(){
    el.pLabel.textContent = 'Membacakan…';
    jumpTo(idx);
  }

  el.putar.onclick = () => {
    if (state === 'playing'){ pause(); return; }
    if (state === 'paused'){ resume(); return; }
    start();
  };

  el.berhenti.onclick = () => finish('Dihentikan.');

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ e.preventDefault(); el.putar.click(); }
    else if (e.key === 'Escape' && state !== 'idle') finish('Dihentikan.');
    else if (e.altKey && e.key === 'ArrowLeft'){ e.preventDefault(); skip(-1); }
    else if (e.altKey && e.key === 'ArrowRight'){ e.preventDefault(); skip(1); }
  });

  el.uji.onclick = () => {
    cancelSpeech();
    el.status.textContent = 'Menguji suara…';
    say('Halo, ini contoh suara yang dipilih.', () => { el.status.textContent = ''; });
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
  let history = store.get('tts:riwayat', []);
  function addHistory(text){
    history = [text, ...history.filter(h => h !== text)].slice(0, 8);
    store.set('tts:riwayat', history); renderHistory();
  }
  function renderHistory(){
    el.riwayat.innerHTML = '';
    if (!history.length){
      const li = document.createElement('li');
      li.className = 'empty'; li.textContent = 'Belum ada. Teks yang pernah diputar akan muncul di sini.';
      el.riwayat.appendChild(li); return;
    }
    history.forEach((h, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.className = 'txt'; b.type = 'button'; b.textContent = h.replace(/\s+/g, ' '); b.title = h;
      b.onclick = () => { el.teks.value = h; updateCount(); el.teks.focus(); };
      const d = document.createElement('button');
      d.className = 'small'; d.type = 'button'; d.textContent = 'Hapus';
      d.setAttribute('aria-label', 'Hapus dari riwayat');
      d.onclick = () => { history.splice(i, 1); store.set('tts:riwayat', history); renderHistory(); };
      li.append(b, d); el.riwayat.appendChild(li);
    });
  }
  renderHistory();
  setState('idle');
})();
