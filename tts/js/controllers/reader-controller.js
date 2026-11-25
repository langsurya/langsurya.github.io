export function chunkText(text, max = 260) {
  const source = String(text);
  const chunks = [];
  // Pencarian batas kalimat sebelumnya memotong teks pada setiap titik.
  // Akibatnya "e.g." menjadi chunk "e." dan "g.", sehingga normalisasi
  // speech-service tidak pernah menerima singkatan lengkap. Lindungi titik
  // pada rangkaian inisial tanpa mengubah panjang atau indeks teks asli.
  const protectedDot = '\uE000';
  const boundaryText = source
    // Singkatan berinisial: e.g., i.e., U.S., Ph.D.
    .replace(/(?:\b[A-Za-z]\.){2,}/g, abbreviation => abbreviation.replace(/\./g, protectedDot))
    // Angka desimal dan versi: 9.2, 22.23.4
    .replace(/(?<=\d)\.(?=\d)/g, protectedDot)
    // Gelar, sapaan, dan singkatan umum yang bukan akhir kalimat.
    // Perlindungan hanya diterapkan jika masih diikuti kata agar titik pada
    // akhir kalimat tetap dapat menjadi batas yang benar.
    .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|No|Mt|Gen|Gov|Lt|Col|Sgt|Capt|Rev|Hon|Pres|Sen|Rep|Supt|Dept|Univ|Assoc|Inc|Ltd|Co|Corp|vs|etc|approx|est)\.(?=\s+[A-Za-z])/gi, match =>
      match.replace('.', protectedDot)
    );
  const pattern = /[^.!?;:\n]+[.!?;:]*["'”’)\]]*/g;
  const whitespace = /\s/;
  let match;
  while ((match = pattern.exec(boundaryText))) {
    let start = match.index;
    let end = start + match[0].length;
    while (start < end && whitespace.test(source[start])) start++;
    while (end > start && whitespace.test(source[end - 1])) end--;
    if (end <= start) continue;
    while (end - start > max) {
      let cut = source.lastIndexOf(' ', start + max);
      if (cut <= start) cut = Math.min(end, start + max);
      chunks.push({ start, end:cut, text:source.slice(start, cut) });
      start = cut;
      while (start < end && whitespace.test(source[start])) start++;
    }
    chunks.push({ start, end, text:source.slice(start, end) });
  }

  // Gabungkan kalimat berurutan dalam paragraf yang sama selama masih berada
  // di bawah batas aman. Setiap chunk dahulu dibuat sebagai utterance
  // tersendiri, sehingga onend/speak di antara dua kalimat menimbulkan jeda
  // buatan dan kadang memotong awal kalimat berikutnya pada Google voice.
  // Tanda baca di dalam gabungan tetap memberi jeda alami dari mesin suara.
  const joined = [];
  for (const chunk of chunks) {
    const previous = joined[joined.length - 1];
    const separator = previous ? source.slice(previous.end, chunk.start) : '';
    const combinedLength = previous ? chunk.end - previous.start : 0;
    if (previous && !/\n\s*\n/.test(separator) && combinedLength <= max) {
      previous.end = chunk.end;
      previous.text = source.slice(previous.start, previous.end);
    } else {
      joined.push({ ...chunk });
    }
  }
  return joined;
}

export function createReaderController({ reader, empty, player, panel, windowRef = window, getLastUserScroll = () => 0, onSelect = () => {} }) {
  let spans = [];
  let words = [];
  const render = (source, queue) => {
    reader.innerHTML = '';
    spans = [];
    words = [];
    if (empty) empty.hidden = true;
    let position = 0;
    queue.forEach((item, index) => {
      if (item.start > position) reader.appendChild(document.createTextNode(source.slice(position, item.start)));
      const span = document.createElement('span');
      span.className = 'reader-chunk';
      span.title = 'Klik untuk membaca dari sini';
      span.onclick = () => onSelect(index);
      const chunkWords = [];
      const wordPattern = /\S+/g;
      let wordPosition = 0;
      let wordMatch;
      while ((wordMatch = wordPattern.exec(item.text))) {
        if (wordMatch.index > wordPosition) span.appendChild(document.createTextNode(item.text.slice(wordPosition, wordMatch.index)));
        const word = document.createElement('span');
        word.className = 'reader-word';
        word.textContent = wordMatch[0];
        word.dataset.start = String(wordMatch.index);
        span.appendChild(word);
        chunkWords.push(word);
        wordPosition = wordMatch.index + wordMatch[0].length;
      }
      if (wordPosition < item.text.length) span.appendChild(document.createTextNode(item.text.slice(wordPosition)));
      reader.appendChild(span);
      spans.push(span);
      words.push(chunkWords);
      position = item.end;
    });
    if (position < source.length) reader.appendChild(document.createTextNode(source.slice(position)));
    reader.hidden = false;
  };
  const mark = index => spans.forEach((span, itemIndex) => {
    span.className = 'reader-chunk ' + (itemIndex < index ? 'done' : itemIndex === index ? 'now' : '');
    const chunkWords = words[itemIndex] || [];
    for (const word of chunkWords) {
      word.classList.remove('active');
      if (itemIndex < index) word.classList.add('spoken');
      else if (itemIndex > index) word.classList.remove('spoken');
    }
  });
  const markWord = (index, charIndex) => {
    // Posisi kata dari voice online tidak selalu lengkap atau tepat waktu.
    // Gunakan kalimat sebagai unit visual yang stabil dan biarkan onend
    // menentukan perpindahan ke kalimat berikutnya.
    spans.forEach((span, itemIndex) => {
      span.classList.toggle('sentence-active', itemIndex === index);
    });
    words.forEach((chunkWords, itemIndex) => {
      for (const word of chunkWords) {
        word.classList.remove('active');
        if (itemIndex < index) word.classList.add('spoken');
        else word.classList.remove('spoken');
      }
    });
    const active = spans[index];
    if (!active || !panel?.hidden || Date.now() - getLastUserScroll() < 4000) return;
    const activeRect = active.getBoundingClientRect();
    const readerRect = reader.getBoundingClientRect();
    const margin = Math.min(48, readerRect.height * 0.2);
    if (activeRect.top < readerRect.top + margin || activeRect.bottom > readerRect.bottom - margin) {
      reader.scrollBy({
        top:(activeRect.top + activeRect.height / 2) - (readerRect.top + readerRect.height / 2),
        behavior:'smooth'
      });
    }
  };
  const clear = () => {
    spans.forEach(span => { span.className = 'reader-chunk'; });
    words.flat().forEach(word => word.classList.remove('spoken', 'active'));
  };
  const complete = () => {
    spans.forEach(span => { span.className = 'reader-chunk done'; });
    words.flat().forEach(word => { word.classList.remove('active'); word.classList.add('spoken'); });
  };
  const center = index => {
    const span = spans[index];
    if (!span || !panel?.hidden || Date.now() - getLastUserScroll() < 4000) return;
    const spanRect = span.getBoundingClientRect();
    if (reader.scrollHeight > reader.clientHeight + 1) {
      const readerRect = reader.getBoundingClientRect();
      reader.scrollBy({ top:(spanRect.top + spanRect.height / 2) - (readerRect.top + readerRect.height / 2), behavior:'smooth' });
      return;
    }
    const playerRect = player?.getBoundingClientRect();
    const topEdge = playerRect?.top <= 1 && playerRect.bottom > 0 ? playerRect.bottom : 0;
    const middle = topEdge + (windowRef.innerHeight - topEdge) / 2;
    windowRef.scrollBy({ top:(spanRect.top + spanRect.height / 2) - middle, behavior:'smooth' });
  };
  return Object.freeze({ render, mark, markWord, center, clear, complete, getSpans:() => [...spans] });
}
