export function createWakeLockService({ navigatorRef = navigator, documentRef = document, windowRef = window, secureContext = window.isSecureContext, onStatus = () => {} } = {}) {
  let lock = null;
  let wanted = false;
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
      const current = lock;
      lock = null;
      if (current) try { await current.release(); } catch {}
      onStatus('', false);
      return true;
    }
    if (!secureContext) return onStatus('Layar tidak dapat ditahan: halaman harus dibuka melalui HTTPS.', true), false;
    if (!navigatorRef.wakeLock) return onStatus('Browser ini tidak menyediakan Screen Wake Lock.', true), false;
    if (lock || documentRef.visibilityState !== 'visible') return Boolean(lock);
    try {
      lock = await navigatorRef.wakeLock.request('screen');
      onStatus('Layar ditahan tetap menyala selama pembacaan.', false);
      lock.addEventListener('release', () => {
        lock = null;
        if (wanted) onStatus('Penahan layar dilepas oleh browser atau sistem.', true);
      }, { once:true });
      return true;
    } catch (error) {
      onStatus('Screen Wake Lock ditolak oleh browser atau sistem' + (error?.name ? ' (' + error.name + ')' : '') + '.', true);
      return false;
    }
  }
  return Object.freeze({ hold, keepAudioAwake, isHeld:() => Boolean(lock) });
}
