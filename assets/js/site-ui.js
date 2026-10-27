(() => {
  'use strict';

  const themeToggle = document.getElementById('theme-toggle');
  const backToTop = document.getElementById('back-to-top');

  function setTheme(theme, persist = true) {
    const isDark = theme === 'dark';
    document.documentElement.dataset.readingTheme = isDark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
      themeToggle.title = isDark ? 'Mode terang' : 'Mode gelap';
      const icon = themeToggle.querySelector('.theme-icon');
      if (icon) icon.textContent = isDark ? '☀' : '☾';
    }

    if (persist) {
      localStorage.setItem('langsurya-reading-theme', isDark ? 'dark' : 'light');
    }
  }

  const savedTheme = localStorage.getItem('langsurya-reading-theme');
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(savedTheme || preferredTheme, false);

  themeToggle?.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.readingTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  });

  const updateBackToTop = () => {
    backToTop?.classList.toggle('is-visible', window.scrollY > 520);
  };

  window.addEventListener('scroll', updateBackToTop, { passive: true });
  updateBackToTop();
  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
