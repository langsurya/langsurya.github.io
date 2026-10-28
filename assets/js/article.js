(() => {
  'use strict';

  const MANIFEST_URL = 'articles/index.json';
  const freshUrl = url => `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
  const container = document.getElementById('article');
  const relatedContainer = document.getElementById('related-articles');
  const relatedList = document.getElementById('related-list');
  const slug = new URLSearchParams(window.location.search).get('slug');

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

  const inline = value => {
    const codeTokens = [];
    let result = escapeHtml(value).replace(/`([^`]+)`/g, (_, code) => {
      const token = `@@CODE${codeTokens.length}@@`;
      codeTokens.push(`<code>${code}</code>`);
      return token;
    });

    result = result
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    codeTokens.forEach((code, index) => {
      result = result.replace(`@@CODE${index}@@`, code);
    });

    return result;
  };

  // Deteksi teks Arab (mis. ayat/hadis) agar ditampilkan kanan-ke-kiri
  const isArabic = text => {
    const letters = String(text).replace(/[\s\p{P}\d]/gu, '');
    const arabic = (letters.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
    return letters.length > 0 && arabic / letters.length > 0.5;
  };
  const arabicAttrs = ' class="arabic" dir="rtl" lang="ar"';

  const formatDate = value => new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`));

  function parseFrontMatter(markdown) {
    const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    const metadata = {};

    if (match) {
      match[1].split('\n').forEach(line => {
        const separator = line.indexOf(':');
        if (separator < 0) return;
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
        if (key) metadata[key] = value;
      });
    }

    return {
      metadata,
      body: match ? markdown.slice(match[0].length) : markdown
    };
  }

  function markdownToHtml(markdown) {
    const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
    const html = [];
    let paragraph = [];
    let codeLines = [];
    let codeLanguage = '';
    let listType = null;
    let blockquote = [];
    let inCodeBlock = false;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const text = paragraph.join(' ');
      html.push(`<p${isArabic(text) ? arabicAttrs : ''}>${inline(text)}</p>`);
      paragraph = [];
    };

    const closeList = () => {
      if (!listType) return;
      html.push(`</${listType}>`);
      listType = null;
    };

    const flushBlockquote = () => {
      if (!blockquote.length) return;
      const content = blockquote.map(line => inline(line)).join('<br>');
      html.push(`<blockquote${isArabic(blockquote.join(' ')) ? arabicAttrs : ''}>${content}</blockquote>`);
      blockquote = [];
    };

    const flushFlow = () => {
      flushParagraph();
      closeList();
      flushBlockquote();
    };

    const splitTableRow = line => {
      const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
      const cells = [];
      let cell = '';
      let escaped = false;

      for (const character of trimmed) {
        if (escaped) {
          cell += character;
          escaped = false;
        } else if (character === '\\') {
          cell += character;
          escaped = true;
        } else if (character === '|') {
          cells.push(cell.trim());
          cell = '';
        } else {
          cell += character;
        }
      }

      cells.push(cell.trim());
      return cells;
    };

    const tableSeparator = line => {
      if (!line || !line.includes('|')) return null;
      const cells = splitTableRow(line);
      if (!cells.length || !cells.every(cell => /^:?-{3,}:?$/.test(cell))) return null;
      return cells.map(cell => cell.startsWith(':') && cell.endsWith(':')
        ? 'center'
        : cell.endsWith(':')
          ? 'right'
          : 'left');
    };

    // Fence bisa ``` atau ~~~ (minimal 3). Fence penutup harus karakter yang sama
    // dan minimal sepanjang pembuka, sehingga ```` bisa membungkus contoh ```.
    let fenceMarker = '';
    const renderCodeBlock = () => {
      const lang = escapeHtml(codeLanguage);
      const languageClass = lang ? ` class="language-${lang}"` : '';
      const label = `<span class="code-lang">${lang || 'kode'}</span>`;
      html.push(`<div class="code-block"><div class="code-head">${label}<button type="button" class="code-copy">Salin</button></div><pre><code${languageClass}>${window.highlightCode ? window.highlightCode(codeLines.join('\n'), codeLanguage) : escapeHtml(codeLines.join('\n'))}</code></pre></div>`);
    };

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      if (!inCodeBlock) {
        const open = line.match(/^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]*)[^`]*$/);
        if (open) {
          flushFlow();
          inCodeBlock = true;
          fenceMarker = open[1];
          codeLanguage = open[2] || '';
          codeLines = [];
          continue;
        }
      } else {
        const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
        if (close && close[1][0] === fenceMarker[0] && close[1].length >= fenceMarker.length) {
          renderCodeBlock();
          inCodeBlock = false;
          codeLanguage = '';
          codeLines = [];
          continue;
        }
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      const quote = line.match(/^>\s?(.*)$/);
      if (quote) {
        flushParagraph();
        closeList();
        blockquote.push(quote[1]);
        continue;
      }
      flushBlockquote();

      if (!line.trim()) {
        flushFlow();
        continue;
      }

      const alignments = tableSeparator(lines[lineIndex + 1]);
      if (line.includes('|') && alignments) {
        flushFlow();
        const headers = splitTableRow(line);
        const columnCount = headers.length;
        const headerHtml = headers.map((cell, index) =>
          `<th scope="col" style="text-align:${alignments[index] || 'left'}">${inline(cell)}</th>`
        ).join('');
        const rows = [];

        lineIndex += 2;
        while (lineIndex < lines.length && lines[lineIndex].trim() && lines[lineIndex].includes('|')) {
          const cells = splitTableRow(lines[lineIndex]);
          while (cells.length < columnCount) cells.push('');
          const rowHtml = cells.slice(0, columnCount).map((cell, index) =>
            `<td style="text-align:${alignments[index] || 'left'}">${inline(cell)}</td>`
          ).join('');
          rows.push(`<tr>${rowHtml}</tr>`);
          lineIndex += 1;
        }

        lineIndex -= 1;
        html.push(`<div class="table-scroll" role="region" aria-label="Tabel artikel" tabindex="0"><table><thead><tr>${headerHtml}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`);
        continue;
      }

      if (/^\s*(---+|___+|\*\*\*+)\s*$/.test(line)) {
        flushFlow();
        html.push('<hr>');
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushFlow();
        const level = heading[1].length;
        html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        continue;
      }

      const unorderedItem = line.match(/^\s*[-*+]\s+(.+)$/);
      const orderedItem = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (unorderedItem || orderedItem) {
        flushParagraph();
        const nextListType = unorderedItem ? 'ul' : 'ol';
        if (listType !== nextListType) {
          closeList();
          listType = nextListType;
          html.push(`<${listType}>`);
        }
        html.push(`<li>${inline((unorderedItem || orderedItem)[1])}</li>`);
        continue;
      }

      closeList();
      paragraph.push(line.trim());
    }

    if (inCodeBlock) renderCodeBlock();
    flushFlow();

    return html.join('');
  }

  // Tombol salin pada blok kode
  document.addEventListener('click', event => {
    const button = event.target.closest('.code-copy');
    if (!button) return;
    const code = button.closest('.code-block')?.querySelector('code');
    if (!code || !navigator.clipboard) return;
    navigator.clipboard.writeText(code.textContent).then(() => {
      button.textContent = 'Tersalin';
      setTimeout(() => { button.textContent = 'Salin'; }, 1500);
    });
  });

  function showNotFound() {
    document.title = 'Artikel tidak ditemukan | Langsurya';
    if (relatedContainer) relatedContainer.hidden = true;
    container.innerHTML = '<a class="back-link" href="./#daftar-artikel">← Semua panduan & catatan</a><p class="error">Artikel tidak ditemukan.</p>';
  }

  function renderRelatedArticles(articles) {
    if (!relatedContainer || !relatedList) return;

    const related = articles
      .filter(article => article.status === 'published' && article.slug !== slug)
      .slice(0, 4);

    if (!related.length) {
      relatedContainer.hidden = true;
      return;
    }

    relatedList.innerHTML = related.map(article => `
      <a class="related-item" href="article.html?slug=${encodeURIComponent(article.slug)}">
        <span class="related-meta">
          <span>${escapeHtml(article.category || article.type || 'Artikel')}</span>
          <time datetime="${escapeHtml(article.date)}">${formatDate(article.date)}</time>
        </span>
        <strong>${escapeHtml(article.title)}</strong>
        <span class="related-arrow" aria-hidden="true">→</span>
      </a>`).join('');

    relatedContainer.hidden = false;
  }

  // Simpan posisi baca per artikel agar refresh kembali ke bagian yang sama.
  // Artikel dimuat lewat JavaScript, jadi pemulihan scroll bawaan browser tidak bekerja.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const scrollKey = `scroll:${slug}`;
  let scrollReady = false;
  let scrollTimer = null;

  const saveScroll = () => {
    if (!scrollReady || !slug) return;
    try {
      sessionStorage.setItem(scrollKey, String(Math.round(window.scrollY)));
    } catch (_) { /* penyimpanan tidak tersedia */ }
  };

  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(saveScroll, 150);
  }, { passive: true });
  window.addEventListener('pagehide', saveScroll);

  function restoreScroll() {
    let saved = null;
    try { saved = sessionStorage.getItem(scrollKey); } catch (_) {}
    const target = Number(saved);
    if (location.hash || !saved || !Number.isFinite(target) || target <= 0) {
      scrollReady = true;
      return;
    }
    const apply = () => window.scrollTo({ top: target, behavior: 'instant' });
    requestAnimationFrame(() => {
      apply();
      // Ulangi setelah font/gambar selesai dimuat karena tinggi halaman bisa berubah
      if (document.fonts?.ready) document.fonts.ready.then(apply);
      window.addEventListener('load', apply, { once: true });
      setTimeout(() => { apply(); scrollReady = true; }, 400);
    });
  }

  async function loadArticle() {
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      showNotFound();
      return;
    }

    const manifestResponse = await fetch(freshUrl(MANIFEST_URL), { cache: 'no-store' });
    if (!manifestResponse.ok) throw new Error('Katalog artikel tidak dapat dimuat.');

    const manifest = await manifestResponse.json();
    const item = manifest.articles?.find(article => article.slug === slug && article.status === 'published');
    if (!item || !/^[a-z0-9/_-]+\.md$/i.test(item.path)) {
      showNotFound();
      return;
    }

    const articleResponse = await fetch(freshUrl(`articles/${item.path}`), { cache: 'no-store' });
    if (!articleResponse.ok) throw new Error('Artikel tidak dapat dimuat.');

    const { metadata, body } = parseFrontMatter(await articleResponse.text());
    document.documentElement.dataset.topic = ['umum', 'agama'].includes(item.topic) ? item.topic : 'teknologi';
    const title = metadata.title || item.title;
    const date = metadata.date || item.date;

    document.title = `${title} | Langsurya`;
    container.innerHTML = `
      <a class="back-link" href="./#daftar-artikel">← Semua panduan & catatan</a>
      <time datetime="${escapeHtml(date)}">${formatDate(date)}</time>
      ${markdownToHtml(body)}`;
    renderRelatedArticles(manifest.articles || []);
    restoreScroll();
  }

  loadArticle().catch(error => {
    console.error(error);
    showNotFound();
  });
})();
