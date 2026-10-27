(() => {
  'use strict';

  const MANIFEST_URL = 'articles/index.json';
  const freshUrl = url => `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
  const list = document.getElementById('article-list');
  const count = document.getElementById('article-count');

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

  const formatDate = value => new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`));

  const articleUrl = slug => `article.html?slug=${encodeURIComponent(slug)}`;

  function renderArticle(item) {
    const url = articleUrl(item.slug);
    const title = escapeHtml(item.title);
    const category = escapeHtml(item.category || 'Catatan');
    const type = escapeHtml(item.type || 'Tulisan');
    const description = escapeHtml(item.description || '');
    const date = escapeHtml(item.date);

    return `
      <article class="article-card">
        <div class="article-meta">
          <span class="category">${category}</span>
          <span class="content-type">${type}</span>
          <time datetime="${date}">${formatDate(item.date)}</time>
        </div>
        <div class="article-copy">
          <h3><a href="${url}">${title}</a></h3>
          <p>${description}</p>
          <a class="read-more" href="${url}">Buka ${type.toLowerCase()} <span aria-hidden="true">→</span></a>
        </div>
        <a class="arrow" href="${url}" aria-label="Buka ${title}">↗</a>
      </article>`;
  }

  async function loadArticles() {
    const response = await fetch(freshUrl(MANIFEST_URL), { cache: 'no-store' });
    if (!response.ok) throw new Error('Katalog artikel tidak dapat dimuat.');

    const manifest = await response.json();
    if (!Array.isArray(manifest.articles)) throw new Error('Format katalog artikel tidak valid.');

    const articles = manifest.articles
      .filter(item => item.status === 'published')
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'id'));

    count.textContent = `${articles.length} tulisan`;
    list.innerHTML = articles.length
      ? articles.map(renderArticle).join('')
      : '<p class="empty-state">Belum ada tulisan yang dipublikasikan.</p>';
  }

  loadArticles().catch(error => {
    console.error(error);
    count.textContent = '';
    list.innerHTML = '<p class="error">Daftar artikel belum dapat dimuat. Buka situs melalui web server dan pastikan katalog artikel tersedia.</p>';
  });
})();
