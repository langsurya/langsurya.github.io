export function createSessionGuard() {
  let id = 0;
  let controller = null;
  return Object.freeze({
    begin() {
      controller?.abort();
      controller = new AbortController();
      return Object.freeze({ id:++id, signal:controller.signal });
    },
    cancel() {
      controller?.abort();
      controller = null;
      id++;
      return id;
    },
    isCurrent(session) {
      return session.id === id && !session.signal.aborted;
    },
    getId() {
      return id;
    }
  });
}

export function createPlayerController({ appState, onStateChange = () => {}, onCancel = () => {} }) {
  const sessions = createSessionGuard();
  let status = 'idle';
  const transition = (next, patch = {}) => {
    status = next;
    appState.transitionPlayer(next, { sessionId:sessions.getId(), ...patch });
    onStateChange(next);
  };
  return Object.freeze({
    prepare() {
      const session = sessions.begin();
      transition('preparing');
      return session;
    },
    play(patch) { transition('playing', patch); },
    pause(patch) { transition('paused', patch); },
    resume(patch) { transition('playing', patch); },
    skip(patch) { transition('playing', patch); },
    stop(reason = '') {
      sessions.cancel();
      onCancel(reason);
      transition('idle', { index:0, queueLength:0 });
    },
    isCurrent:session => sessions.isCurrent(session),
    getStatus:() => status
  });
}
