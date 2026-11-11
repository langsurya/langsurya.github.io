export function normalizeLocale(language) {
  if (!language) return language;
  const variants = new Set(['hant', 'hans', 'latn', 'cyrl', 'arab', 'jpan', 'hang', 'deva', 'thai', 'mong', 'guru', 'beng', 'gujr', 'taml', 'telu', 'knda', 'mlym', 'orya']);
  const normalized = [];
  for (const part of String(language).trim().toLowerCase().replace(/_/g, '-').replace(/#/g, '-').split('-').filter(Boolean)) {
    if (variants.has(part)) break;
    normalized.push(part);
  }
  return normalized.join('-');
}

export function detectLanguageByText(text) {
  const trimmed = String(text || '').trim();
  if (trimmed.length < 40) return null;
  const tokens = trimmed.toLowerCase().match(/[a-z]+/g) || [];
  if (tokens.length < 6) return null;
  const idWords = new Set(['yang','dan','untuk','dengan','ini','itu','adalah','akan','dari','ke','di','jika','karena','dapat','saya','kami','kamu','mereka','tidak','bisa','sudah','harus','setiap','semua','juga','dalam','oleh','lebih','apakah','benar']);
  const enWords = new Set(['the','and','for','with','this','that','from','into','your','you','are','not','can','will','have','there','their','because','when','where','what','about','please','would','could','should','more','than','then','them','they']);
  let idScore = 0;
  let enScore = 0;
  for (const token of tokens) {
    if (idWords.has(token)) idScore += 2;
    if (enWords.has(token)) enScore += 2;
    if (/ng$|ny$|kh$|sy$/.test(token)) idScore++;
    if (/ed$|ing$|tion$|ly$/.test(token)) enScore++;
  }
  if ((!idScore && !enScore) || Math.abs(idScore - enScore) < 2) return null;
  return idScore > enScore ? 'id' : 'en';
}

export function shouldApplyDetectedLanguage(preference) {
  return preference !== 'manual';
}

export function snapshotSelectedVoice(voices, selectedName, selectedLanguage) {
  const voice = voices.find(item => item.name === selectedName) || null;
  return Object.freeze({ voice, lang:voice?.lang || selectedLanguage || 'en-US' });
}

export function createVoiceService({ synth, storage, onVoicesChanged, setIntervalImpl = setInterval, clearIntervalImpl = clearInterval } = {}) {
  let voices = [];
  let signature = '';
  let retries = 0;
  let retryTimer = null;
  const load = () => {
    const next = synth.getVoices();
    const nextSignature = next.map(voice => [voice.voiceURI, voice.name, voice.lang, voice.localService].join('\u0000')).join('\u0001');
    if (nextSignature === signature) return false;
    signature = nextSignature;
    voices = next;
    onVoicesChanged?.([...voices]);
    return true;
  };
  const start = () => {
    synth.addEventListener('voiceschanged', load);
    load();
    retryTimer = setIntervalImpl(() => {
      load();
      if (++retries >= 40) clearIntervalImpl(retryTimer);
    }, 250);
  };
  const stop = () => {
    synth.removeEventListener?.('voiceschanged', load);
    clearIntervalImpl(retryTimer);
  };
  const getLanguages = () => [...new Set(voices.map(voice => normalizeLocale(voice.lang)).filter(Boolean))];
  const getVoicesForLanguage = language => voices.filter(voice => normalizeLocale(voice.lang) === normalizeLocale(language));
  const selectLanguage = (language, preference = 'manual') => {
    const normalized = normalizeLocale(language);
    storage?.setLanguage(normalized);
    storage?.setLanguagePreference(preference);
    return normalized;
  };
  const selectVoice = voiceName => {
    storage?.setVoice(voiceName);
    return snapshotSelectedVoice(voices, voiceName, storage?.getLanguage());
  };
  const detectLanguage = text => shouldApplyDetectedLanguage(storage?.getLanguagePreference()) ? detectLanguageByText(text) : null;
  return Object.freeze({ start, stop, load, getVoices:() => [...voices], getLanguages, getVoicesForLanguage, selectLanguage, selectVoice, detectLanguage, snapshot:(name, language) => snapshotSelectedVoice(voices, name, language) });
}
