export function createWakeLockService({ navigatorRef = navigator, documentRef = document, windowRef = window, secureContext = window.isSecureContext, onStatus = () => {} } = {}) {
  let lock = null;
  let wanted = false;
  let request = null;
  let requestGeneration = 0;
  let audioContext = null;
  function keepAudioAwake(on) {
    try {
      if (on) {
        if (!audioContext) {
          const AudioContext = windowRef.AudioContext || windowRef.webkitAudioContext;
          if (!AudioContext) return false;
          audioContext = new AudioContext();
          const gain = audioContext.createGain();
          gain.gain.value = 0.0005;
          const oscillator = audioContext.createOscillator();
          oscillator.frequency.value = 30;
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.start();
        }
        if (audioContext.state === 'suspended') audioContext.resume();
      } else if (audioContext?.state === 'running') {
        audioContext.suspend();
      }
      return true;
    } catch {
      return false;
    }
  }
  async function hold(on) {
    wanted = on;
    if (!on) {
      requestGeneration++;
      const current = lock;
      lock = null;
      if (current) try { await current.release(); } catch {}
      onStatus('', false);
      return true;
    }
    if (!secureContext) return onStatus('Layar tidak dapat ditahan: halaman harus dibuka melalui HTTPS.', true), false;
    if (!navigatorRef.wakeLock) return onStatus('Browser ini tidak menyediakan Screen Wake Lock.', true), false;
    if (lock || documentRef.visibilityState !== 'visible') return Boolean(lock);
    if (request) return request;
    const generation = requestGeneration;
    try {
      request = navigatorRef.wakeLock.request('screen').then(async acquiredLock => {
        if (!wanted || generation !== requestGeneration || documentRef.visibilityState !== 'visible') {
          try { await acquiredLock.release(); } catch {}
          return false;
        }
        lock = acquiredLock;
        onStatus('Layar ditahan tetap menyala selama pembacaan.', false);
        acquiredLock.addEventListener('release', () => {
          if (lock === acquiredLock) lock = null;
          if (wanted && documentRef.visibilityState === 'visible') {
            onStatus('Penahan layar dilepas oleh browser atau sistem.', true);
          }
        }, { once:true });
        return true;
      });
      return await request;
    } catch (error) {
      onStatus('Screen Wake Lock ditolak oleh browser atau sistem' + (error?.name ? ' (' + error.name + ')' : '') + '.', true);
      return false;
    } finally {
      request = null;
    }
  }

  async function handleVisibilityChange() {
    if (documentRef.visibilityState !== 'visible') {
      const current = lock;
      lock = null;
      if (current) try { await current.release(); } catch {}
      return false;
    }
    return wanted ? hold(true) : false;
  }

  return Object.freeze({ hold, handleVisibilityChange, keepAudioAwake, isHeld:() => Boolean(lock) });
}
