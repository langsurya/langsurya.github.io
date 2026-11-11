const VERSION_QUERY = new URL(import.meta.url).search;
const { MAX_HISTORY_ITEMS, SETTING_LIMITS, STORAGE_KEYS } =
  await import('../config/constants.js' + VERSION_QUERY);

const isString = value => typeof value === 'string';

function readJson(storage, key) {
  try {
    const value = storage.getItem(key);
    return value === null ? undefined : JSON.parse(value);
  } catch {
    return undefined;
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function numberInRange(value, limits) {
  const number = Number(value);
  return Number.isFinite(number) && number >= limits.min && number <= limits.max
    ? number
    : limits.fallback;
}

function validHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isString)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, MAX_HISTORY_ITEMS);
}

export function createStorageService(storage = window.localStorage) {
  const getString = (key, fallback = null) => {
    const value = readJson(storage, key);
    return isString(value) ? value : fallback;
  };

  return Object.freeze({
    getTheme() {
      const theme = getString(STORAGE_KEYS.theme);
      return theme === 'light' || theme === 'dark' ? theme : null;
    },
    setTheme(theme) {
      return (theme === 'light' || theme === 'dark') && writeJson(storage, STORAGE_KEYS.theme, theme);
    },
    getAppVersion() {
      return getString(STORAGE_KEYS.appVersion);
    },
    setAppVersion(version) {
      return isString(version) && writeJson(storage, STORAGE_KEYS.appVersion, version);
    },
    getLanguage() {
      return getString(STORAGE_KEYS.language);
    },
    setLanguage(language) {
      return isString(language) && Boolean(language.trim()) && writeJson(storage, STORAGE_KEYS.language, language);
    },
    getLanguagePreference() {
      const preference = getString(STORAGE_KEYS.languagePreference);
      if (preference === 'manual' || preference === 'detected') return preference;
      return this.getLanguage() ? 'manual' : 'detected';
    },
    setLanguagePreference(preference) {
      return (preference === 'manual' || preference === 'detected') &&
        writeJson(storage, STORAGE_KEYS.languagePreference, preference);
    },
    getVoice() {
      return getString(STORAGE_KEYS.voice);
    },
    setVoice(voice) {
      return isString(voice) && writeJson(storage, STORAGE_KEYS.voice, voice);
    },
    getSetting(name) {
      const limits = SETTING_LIMITS[name];
      return limits ? numberInRange(readJson(storage, STORAGE_KEYS[name]), limits) : undefined;
    },
    setSetting(name, value) {
      const limits = SETTING_LIMITS[name];
      return Boolean(limits) && writeJson(storage, STORAGE_KEYS[name], numberInRange(value, limits));
    },
    getHistory() {
      return validHistory(readJson(storage, STORAGE_KEYS.history));
    },
    setHistory(history) {
      return writeJson(storage, STORAGE_KEYS.history, validHistory(history));
    }
  });
}
