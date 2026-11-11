export const APP_VERSION = 'web-v2026.11.11-1123';

export const STORAGE_KEYS = Object.freeze({
  theme: 'tts:tema',
  appVersion: 'tts:app_version',
  language: 'tts:bahasa',
  languagePreference: 'tts:bahasa_preference',
  voice: 'tts:suara',
  kecepatan: 'tts:kecepatan',
  nada: 'tts:nada',
  volume: 'tts:volume',
  history: 'tts:riwayat'
});

export const SETTING_LIMITS = Object.freeze({
  kecepatan: Object.freeze({ min: 0.5, max: 2, fallback: 1 }),
  nada: Object.freeze({ min: 0, max: 2, fallback: 1 }),
  volume: Object.freeze({ min: 0, max: 1, fallback: 1 })
});

export const MAX_HISTORY_ITEMS = 8;
