export function createSettingsController({ controls, storage, appState, formatters }) {
  const render = name => {
    const control = controls[name];
    const value = Number(control.value);
    const text = formatters[name](value);
    control.setAttribute('aria-valuetext', text);
    storage.setSetting(name, value);
    const stateNames = { kecepatan:'rate', nada:'pitch', volume:'volume' };
    appState.updateSettings({ [stateNames[name]]:value });
    return text;
  };
  return Object.freeze({ render });
}
