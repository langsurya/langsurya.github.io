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

  // Rotate the homepage introduction without repeating the current text.
  const heroDescription = document.getElementById('hero-description');
  const heroDescriptions = [
    'A personal digital garden for ideas, lessons learned, and things worth keeping. I write to document the process, connect the dots, and leave a trail that might help someone else along the way. Powered by a good cup of coffee—a quiet pause to clear the mind and see the bigger picture.',
    'A quiet corner on the internet to archive knowledge, experiences, and thoughts before they fade away. I write to make sense of what I learn and share what might be useful to others. Best explored with a warm cup of coffee—taking a step back to think clearly and embrace wider perspectives.',
    'Where raw thoughts turn into lasting notes. This is my space to document insights, revisit ideas, and share practical knowledge with curious minds. Fueled by coffee—a companion to slow down, sharpen focus, and see things from a broader lens.',
    "A space to keep knowledge, experiences, and ideas worth remembering. I write so important things don't get lost, can be revisited with clarity, and bring value to anyone who reads them. Coffee is my companion to pause for a moment, think clearly, and see the world from a wider perspective."
  ];

  if (heroDescription) {
    let descriptionIndex = 0;
    const reduceDescriptionMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.setInterval(() => {
      descriptionIndex = (descriptionIndex + 1) % heroDescriptions.length;

      if (reduceDescriptionMotion) {
        heroDescription.textContent = heroDescriptions[descriptionIndex];
        return;
      }

      heroDescription.classList.add('is-changing');
      window.setTimeout(() => {
        heroDescription.textContent = heroDescriptions[descriptionIndex];
        heroDescription.classList.remove('is-changing');
      }, 500);
    }, 25000);
  }

  // Header shadow + reading progress
  const header = document.querySelector('.site-header');
  const progress = document.getElementById('read-progress');
  const updateScrollUi = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 8);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    }
  };
  window.addEventListener('scroll', updateScrollUi, { passive: true });
  window.addEventListener('resize', updateScrollUi);
  updateScrollUi();

  // Reveal on scroll
  const revealItems = document.querySelectorAll('.reveal');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealItems.forEach(item => item.classList.add('is-in'));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealItems.forEach(item => observer.observe(item));
  }
})();
