export function normalizeTextForSpeech(text) {
  return String(text)
    .replace(/\b[A-Z]{4,}\b/g, word => word.toLowerCase())
    .replace(/\s+[—–-]+\s+/g, ', ')
    .replace(/\.{3,}/g, '…')
    .replace(/\s*,\s*,+/g, ', ');
}

export function createSpeechService({ synth, Utterance, matchMedia, setIntervalImpl = setInterval, clearIntervalImpl = clearInterval } = {}) {
  let cancelled = false;

  function cancel() {
    synth.cancel();
    cancelled = true;
  }

  function speak(text, options, onend, onerror) {
    const clean = normalizeTextForSpeech(text).replace(/^[\s"'“”‘’«(\[]+/, '');
    const mobile = matchMedia('(max-width: 600px)').matches;
    const utterance = new Utterance(mobile ? '\u00a0\u00a0' + clean : clean);
    if (options.voice) {
      utterance.voice = options.voice;
      utterance.lang = options.voice.lang;
    } else {
      utterance.lang = options.lang || 'en-US';
    }
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    utterance.volume = options.volume;

    let ended = false;
    let started = false;
    let hasBoundary = false;
    let lastActivity = Date.now();
    let idle = 0;
    let watchdog = null;
    const estimatedMs = Math.max(4000, clean.length / (14 * (options.rate || 1)) * 1000);
    const hardDeadline = Date.now() + Math.max(15000, estimatedMs * 2.5 + 10000);
    const done = () => {
      if (ended) return;
      ended = true;
      clearIntervalImpl(watchdog);
      onend?.();
    };

    utterance.onstart = () => { started = true; lastActivity = Date.now(); };
    utterance.onboundary = () => { hasBoundary = true; lastActivity = Date.now(); };
    utterance.onend = done;
    utterance.onerror = event => {
      ended = true;
      clearIntervalImpl(watchdog);
      if (event.error !== 'canceled' && event.error !== 'interrupted') onerror?.(event);
    };
    cancelled = false;
    synth.speak(utterance);
    watchdog = setIntervalImpl(() => {
      if (ended || cancelled) return clearIntervalImpl(watchdog);
      const now = Date.now();
      if (!mobile && ((hasBoundary && now - lastActivity > 12000) || now > hardDeadline)) {
        ended = true;
        clearIntervalImpl(watchdog);
        onerror?.({ error:'stalled' });
        return;
      }
      if (!synth.speaking && !synth.pending) {
        const limit = mobile ? (started ? 2 : 6) : (started ? 12 : 24);
        if (++idle >= limit) {
          if (mobile) done();
          else {
            ended = true;
            clearIntervalImpl(watchdog);
            onerror?.({ error:'stalled' });
          }
        }
      } else idle = 0;
    }, 500);
    return utterance;
  }

  return Object.freeze({ cancel, speak });
}
