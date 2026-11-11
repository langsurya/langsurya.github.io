const PLAYER_STATES = new Set(['idle', 'preparing', 'playing', 'paused']);
const TRANSLATION_STATES = new Set(['idle', 'loading', 'done', 'error', 'cancelled']);

const initialState = Object.freeze({
  player: Object.freeze({ status: 'idle', sessionId: 0, index: 0, queueLength: 0 }),
  translation: Object.freeze({ status: 'idle', sessionId: 0, progress: 0 }),
  settings: Object.freeze({ rate: 1, pitch: 1, volume: 1 })
});

export function createAppState(seed = initialState) {
  let state = {
    player: { ...initialState.player, ...seed.player },
    translation: { ...initialState.translation, ...seed.translation },
    settings: { ...initialState.settings, ...seed.settings }
  };
  const listeners = new Set();

  const getSnapshot = () => Object.freeze({
    player: Object.freeze({ ...state.player }),
    translation: Object.freeze({ ...state.translation }),
    settings: Object.freeze({ ...state.settings })
  });

  const notify = () => {
    const snapshot = getSnapshot();
    listeners.forEach(listener => listener(snapshot));
  };

  return Object.freeze({
    getSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    transitionPlayer(status, patch = {}) {
      if (!PLAYER_STATES.has(status)) throw new TypeError('Status player tidak valid: ' + status);
      state = { ...state, player: { ...state.player, ...patch, status } };
      notify();
    },
    transitionTranslation(status, patch = {}) {
      if (!TRANSLATION_STATES.has(status)) throw new TypeError('Status translation tidak valid: ' + status);
      state = { ...state, translation: { ...state.translation, ...patch, status } };
      notify();
    },
    updateSettings(patch) {
      state = { ...state, settings: { ...state.settings, ...patch } };
      notify();
    }
  });
}
