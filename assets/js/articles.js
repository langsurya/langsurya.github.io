(() => {
  'use strict';

  const MANIFEST_URL = 'articles/index.json';
  const freshUrl = url => `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
  const list = document.getElementById('article-list');
  const count = document.getElementById('article-count');
  const searchInput = document.getElementById('article-search');
  const filters = document.getElementById('article-filters');
  let allArticles = [];
  let activeCategory = 'Semua';

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

  // Topik besar. Artikel tanpa field "topic" dianggap teknologi.
  const TOPICS = { teknologi: 'Teknologi', umum: 'Umum', agama: 'Agama' };
  const topicOf = item => (TOPICS[item.topic] ? item.topic : 'teknologi');
  const topicTabs = document.getElementById('topic-tabs');
  let activeTopic = 'semua';

  // Pengaturan daftar
  const PAGE_SIZE = 6;
  let currentPage = 1;
  const lastUpdate = item => item.updated || item.date;
  const isPinned = item => item.pinned === true;

  // Kontainer artikel disematkan (sebelum daftar) dan nomor halaman (sesudah daftar)
  const pinnedBox = document.createElement('div');
  pinnedBox.className = 'pinned-section';
  pinnedBox.hidden = true;
  list.before(pinnedBox);
  const pager = document.createElement('nav');
  pager.className = 'pagination';
  pager.setAttribute('aria-label', 'Halaman artikel');
  list.after(pager);

  const pageFromUrl = () => Math.max(1, parseInt(new URLSearchParams(location.search).get('page'), 10) || 1);
  currentPage = pageFromUrl();

  function setPageInUrl(page) {
    const url = new URL(location.href);
    if (page > 1) url.searchParams.set('page', page); else url.searchParams.delete('page');
    history.replaceState(null, '', url);
  }

  function renderArticle(item) {
    const url = articleUrl(item.slug);
    const title = escapeHtml(item.title);
    const category = escapeHtml(item.category || 'Catatan');
    const type = escapeHtml(item.type || 'Tulisan');
    const description = escapeHtml(item.description || '');
    const date = escapeHtml(lastUpdate(item));
    const topic = topicOf(item);
    const updated = item.updated && item.updated !== item.date;
    const pinned = isPinned(item);

    return `
      <article class="article-card${pinned ? ' is-pinned' : ''}" data-topic="${topic}">
        <div class="article-meta">
          ${pinned ? '<span class="pin-badge">📌 Disematkan</span>' : ''}
          <span class="topic-badge">${TOPICS[topic]}</span>
          <span class="category">${category}</span>
          <span class="content-type">${type}</span>
          <time datetime="${date}">${updated ? 'Diperbarui ' : ''}${formatDate(lastUpdate(item))}</time>
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
      .sort((a, b) => lastUpdate(b).localeCompare(lastUpdate(a)) || a.title.localeCompare(b.title, 'id'));

    allArticles = articles;
    renderFilters();
    applyFilters();
  }

  function renderTopicTabs() {
    if (!topicTabs) return;
    const used = Object.keys(TOPICS).filter(key => allArticles.some(item => topicOf(item) === key));
    topicTabs.hidden = used.length < 2;
    if (topicTabs.hidden) return;
    topicTabs.innerHTML = ['semua', ...used].map(key =>
      `<button type="button" class="topic-tab" role="tab" data-topic="${key}" aria-selected="${key === activeTopic}">${key === 'semua' ? 'Semua' : TOPICS[key]}</button>`
    ).join('');
  }

  function inTopic(item) {
    return activeTopic === 'semua' || topicOf(item) === activeTopic;
  }

  function renderFilters() {
    renderTopicTabs();
    if (!filters) return;
    const categories = ['Semua', ...new Set(allArticles.filter(inTopic).map(item => item.category || 'Catatan'))];
    filters.innerHTML = categories.map(category =>
      `<button type="button" class="filter-chip" data-category="${escapeHtml(category)}" aria-pressed="${category === activeCategory}">${escapeHtml(category)}</button>`
    ).join('');
  }

  function setCategory(category) {
    const exists = allArticles.some(item => (item.category || 'Catatan') === category);
    activeCategory = exists ? category : 'Semua';
    filters?.querySelectorAll('.filter-chip').forEach(chip => {
      chip.setAttribute('aria-pressed', String(chip.dataset.category === activeCategory));
    });
    currentPage = 1;
    applyFilters();
  }

  function applyFilters() {
    const query = (searchInput?.value || '').trim().toLowerCase();
    const visible = allArticles.filter(item => {
      const inCategory = activeCategory === 'Semua' || (item.category || 'Catatan') === activeCategory;
      const text = `${item.title} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
      return inTopic(item) && inCategory && (!query || text.includes(query));
    });

    count.textContent = visible.length === allArticles.length
      ? `${allArticles.length} tulisan`
      : `${visible.length} dari ${allArticles.length} tulisan`;

    // Artikel disematkan tampil terpisah hanya saat tidak sedang mencari/memfilter kategori
    const browsing = !query && activeCategory === 'Semua';
    const pinnedItems = browsing ? visible.filter(isPinned) : [];
    const rest = browsing ? visible.filter(item => !isPinned(item)) : visible;

    pinnedBox.hidden = !pinnedItems.length;
    pinnedBox.innerHTML = pinnedItems.length
      ? `<p class="list-label">Disematkan</p><div class="article-list pinned-list">${pinnedItems.map(renderArticle).join('')}</div>`
      : '';

    const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    const pageItems = rest.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    if (!allArticles.length) {
      list.innerHTML = '<p class="empty-state">Belum ada tulisan yang dipublikasikan.</p>';
    } else if (!visible.length) {
      list.innerHTML = '<p class="empty-state">Tidak ada tulisan yang cocok. Coba kata kunci atau kategori lain.</p>';
    } else if (!rest.length) {
      list.innerHTML = '';
    } else {
      list.innerHTML = (pinnedItems.length ? '<p class="list-label">Terbaru</p>' : '') + pageItems.map(renderArticle).join('');
    }

    renderPager(totalPages, rest.length);
    setPageInUrl(currentPage);
  }

  function renderPager(totalPages, total) {
    if (totalPages <= 1) {
      pager.hidden = true;
      pager.innerHTML = '';
      return;
    }
    pager.hidden = false;
    // Halaman pertama, terakhir, dan sekitar halaman aktif
    const pages = [];
    for (let p = 1; p <= totalPages; p += 1) {
      if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) pages.push(p);
      else if (pages[pages.length - 1] !== '…') pages.push('…');
    }
    const from = (currentPage - 1) * PAGE_SIZE + 1;
    const to = Math.min(currentPage * PAGE_SIZE, total);
    pager.innerHTML = `
      <button type="button" class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Halaman sebelumnya">‹</button>
      ${pages.map(p => p === '…'
        ? '<span class="page-gap">…</span>'
        : `<button type="button" class="page-btn" data-page="${p}" ${p === currentPage ? 'aria-current="page"' : ''}>${p}</button>`).join('')}
      <button type="button" class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Halaman berikutnya">›</button>
      <span class="page-info">${from}–${to} dari ${total}</span>`;
  }

  pager.addEventListener('click', event => {
    const button = event.target.closest('.page-btn');
    if (!button || button.disabled) return;
    currentPage = Number(button.dataset.page);
    applyFilters();
    document.getElementById('daftar-artikel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const resetAndApply = () => { currentPage = 1; applyFilters(); };

  topicTabs?.addEventListener('click', event => {
    const tab = event.target.closest('.topic-tab');
    if (!tab) return;
    activeTopic = tab.dataset.topic;
    activeCategory = 'Semua';
    currentPage = 1;
    renderFilters();
    applyFilters();
  });
  searchInput?.addEventListener('input', resetAndApply);
  filters?.addEventListener('click', event => {
    const chip = event.target.closest('.filter-chip');
    if (chip) setCategory(chip.dataset.category);
  });
  document.querySelectorAll('.focus-card[data-filter]').forEach(card => {
    card.addEventListener('click', () => setCategory(card.dataset.filter));
  });

  loadArticles().catch(error => {
    console.error(error);
    count.textContent = '';
    list.innerHTML = '<p class="error">Daftar artikel belum dapat dimuat. Buka situs melalui web server dan pastikan katalog artikel tersedia.</p>';
  });
})();
