export function bootTtsApp(legacyBoot) {
  if (typeof legacyBoot !== 'function') throw new TypeError('Boot aplikasi TTS tidak tersedia.');
  return legacyBoot();
}

export function createTranslationLifecycle({ appState, translationService }) {
  let sessionId = 0;
  return Object.freeze({
    async run(text, language, onProgress) {
      const current = ++sessionId;
      appState.transitionTranslation('loading', { sessionId:current, progress:0 });
      try {
        const result = await translationService.translate(text, language, progress => {
          if (current !== sessionId) return;
          appState.transitionTranslation('loading', { sessionId:current, progress });
          onProgress?.(progress);
        });
        if (current !== sessionId) return null;
        appState.transitionTranslation('done', { sessionId:current, progress:100 });
        return result;
      } catch (error) {
        if (current !== sessionId || error?.code === 'ABORTED') return null;
        appState.transitionTranslation('error', { sessionId:current, progress:0 });
        throw error;
      }
    },
    cancel() {
      sessionId++;
      translationService.cancel();
      appState.transitionTranslation('cancelled', { sessionId, progress:0 });
    }
  });
}
