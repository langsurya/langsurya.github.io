const releaseId = new URL(import.meta.url).searchParams.get('v') || 'dev';
const releaseMatch = /^(\d{4})(\d{2})(\d{2})-(\d+)$/.exec(releaseId);

export const APP_VERSION = releaseMatch
  ? `web-v${releaseMatch[1]}.${releaseMatch[2]}.${releaseMatch[3]}-${releaseMatch[4]}`
  : `web-${releaseId}`;

export const STORAGE_KEYS = Object.freeze({
  theme: 'tts:tema',
  appVersion: 'tts:app_version',
  language: 'tts:bahasa',
  languagePreference: 'tts:bahasa_preference',
  voice: 'tts:suara',
  rate: 'tts:kecepatan',
  pitch: 'tts:nada',
  volume: 'tts:volume',
  textSize: 'tts:ukuran-teks',
  history: 'tts:riwayat'
});

export const SETTING_LIMITS = Object.freeze({
  rate: Object.freeze({ min: 0.5, max: 2, fallback: 1 }),
  pitch: Object.freeze({ min: 0, max: 2, fallback: 1 }),
  volume: Object.freeze({ min: 0, max: 1, fallback: 1 }),
  textSize: Object.freeze({ min: 0.7, max: 1.25, fallback: 1 })
});

export const MAX_HISTORY_ITEMS = 5;
