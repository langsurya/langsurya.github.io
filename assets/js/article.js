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
      html.push(`<p>${inline(paragraph.join(' '))}</p>`);
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
      html.push(`<blockquote>${content}</blockquote>`);
      blockquote = [];
    };

    const flushFlow = () => {
      flushParagraph();
      closeList();
      flushBlockquote();
    };

    lines.forEach(line => {
      const fence = line.match(/^```\s*([\w-]*)\s*$/);
      if (fence) {
        if (!inCodeBlock) {
          flushFlow();
          inCodeBlock = true;
          codeLanguage = fence[1] || '';
          codeLines = [];
        } else {
          const languageClass = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : '';
          html.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
          inCodeBlock = false;
          codeLanguage = '';
          codeLines = [];
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      const quote = line.match(/^>\s?(.*)$/);
      if (quote) {
        flushParagraph();
        closeList();
        blockquote.push(quote[1]);
        return;
      }
      flushBlockquote();

      if (!line.trim()) {
        flushFlow();
        return;
      }

      if (/^\s*(---+|___+|\*\*\*+)\s*$/.test(line)) {
        flushFlow();
        html.push('<hr>');
        return;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushFlow();
        const level = heading[1].length;
        html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        return;
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
        return;
      }

      closeList();
      paragraph.push(line.trim());
    });

    if (inCodeBlock) {
      const languageClass = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : '';
      html.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    }
    flushFlow();

    return html.join('');
  }

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
    const title = metadata.title || item.title;
    const date = metadata.date || item.date;

    document.title = `${title} | Langsurya`;
    container.innerHTML = `
      <a class="back-link" href="./#daftar-artikel">← Semua panduan & catatan</a>
      <time datetime="${escapeHtml(date)}">${formatDate(date)}</time>
      ${markdownToHtml(body)}`;
    renderRelatedArticles(manifest.articles || []);
  }

  loadArticle().catch(error => {
    console.error(error);
    showNotFound();
  });
})();
