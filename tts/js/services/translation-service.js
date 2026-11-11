const DEFAULT_TIMEOUT_MS = 12000;

export class TranslationError extends Error {
  constructor(message, code = 'TRANSLATION_FAILED', cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'TranslationError';
    this.code = code;
  }
}

export function translationParts(text, max = 450) {
  const parts = [];
  let rest = text;
  while (rest.length > max) {
    let cut = Math.max(rest.lastIndexOf('\n', max), rest.lastIndexOf('. ', max));
    if (cut < max * 0.55) cut = rest.lastIndexOf(' ', max);
    if (cut < 1) cut = max;
    else if (rest.slice(cut, cut + 2) === '. ') cut++;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) parts.push(rest);
  return parts;
}

export function normalizeTranslatedHyphens(text) {
  return String(text).replace(/(\p{L})\s*-\s*(?=\p{L})/gu, '$1-');
}

function abortError(reason = 'Proses penerjemahan dibatalkan') {
  return new TranslationError(reason, 'ABORTED');
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'ABORTED';
}

export function createTranslationService({ fetchImpl = window.fetch.bind(window), timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  let activeSession = null;
  let nextSessionId = 0;

  const isActive = session => activeSession === session && !session.controller.signal.aborted;

  async function fetchWithTimeout(url, session) {
    if (!isActive(session)) throw abortError();
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
    const abortFromSession = () => timeoutController.abort();
    session.controller.signal.addEventListener('abort', abortFromSession, { once:true });
    try {
      return await fetchImpl(url, { signal:timeoutController.signal });
    } catch (error) {
      if (!isActive(session)) throw abortError();
      if (isAbortError(error)) throw new TranslationError('waktu permintaan terjemahan habis', 'TIMEOUT', error);
      throw new TranslationError('jaringan tidak tersedia', 'NETWORK', error);
    } finally {
      clearTimeout(timeout);
      session.controller.signal.removeEventListener('abort', abortFromSession);
    }
  }

  async function translatePart(content, sourceLang, session) {
    const primaryParams = new URLSearchParams({ q:content, langpair:sourceLang + '|id' });
    try {
      const response = await fetchWithTimeout('https://api.mymemory.translated.net/get?' + primaryParams, session);
      if (response.ok) {
        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          return normalizeTranslatedHyphens(data.responseData.translatedText);
        }
      }
    } catch (error) {
      if (error.code === 'ABORTED') throw error;
    }

    const fallbackParams = new URLSearchParams({ client:'gtx', sl:sourceLang, tl:'id', dt:'t', q:content });
    const fallback = await fetchWithTimeout('https://translate.googleapis.com/translate_a/single?' + fallbackParams, session);
    if (!fallback.ok) throw new TranslationError('layanan terjemahan sedang membatasi permintaan', 'PROVIDER_FAILED');
    const fallbackData = await fallback.json();
    const fallbackText = fallbackData?.[0]?.map(segment => segment?.[0] || '').join('');
    if (!fallbackText) throw new TranslationError('terjemahan tidak tersedia', 'EMPTY_RESULT');
    return normalizeTranslatedHyphens(fallbackText);
  }

  return Object.freeze({
    cancel() {
      if (!activeSession) return;
      activeSession.controller.abort();
      activeSession = null;
    },
    getActiveSessionId() {
      return activeSession?.id ?? null;
    },
    async translate(text, sourceLanguage, onProgress) {
      this.cancel();
      const session = { id:++nextSessionId, controller:new AbortController() };
      activeSession = session;
      const sourceLang = (sourceLanguage || 'en').split('-')[0].toLowerCase();
      if (sourceLang === 'id') {
        onProgress?.(100, session.id);
        activeSession = null;
        return { text, sessionId:session.id };
      }

      const translated = [];
      const parts = translationParts(text);
      try {
        for (let index = 0; index < parts.length; index++) {
          if (!isActive(session)) throw abortError();
          const part = parts[index];
          const leadingWhitespace = part.match(/^\s*/)?.[0] || '';
          const trailingWhitespace = part.match(/\s*$/)?.[0] || '';
          const contentEnd = part.length - trailingWhitespace.length;
          const content = part.slice(leadingWhitespace.length, contentEnd);
          const translatedContent = content ? await translatePart(content, sourceLang, session) : '';
          if (!isActive(session)) throw abortError();
          translated.push(leadingWhitespace + translatedContent + trailingWhitespace);
          onProgress?.(Math.round(((index + 1) / parts.length) * 100), session.id);
        }
        return { text:translated.join(''), sessionId:session.id };
      } finally {
        if (activeSession === session) activeSession = null;
      }
    }
  });
}
