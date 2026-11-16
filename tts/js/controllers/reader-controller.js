export function chunkText(text, max = 300) {
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
    // Gelar/sapaan yang lazim bukan akhir kalimat.
    .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|No)\.(?=\s+[A-Za-z])/gi, match =>
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

  // Satu utterance untuk setiap kalimat menambahkan jeda teknis antara
  // onend dan synth.speak berikutnya, di luar jeda alami dari tanda titik.
  // Gabungkan kalimat pendek sampai batas aman agar mesin suara sendiri yang
  // mengatur intonasi titik, tetapi pertahankan potongan panjang maksimal.
  const merged = [];
  for (const chunk of chunks) {
    const previous = merged[merged.length - 1];
    if (previous && chunk.end - previous.start <= max) {
      previous.end = chunk.end;
      previous.text = source.slice(previous.start, previous.end);
    } else {
      merged.push({ ...chunk });
    }
  }
  return merged;
}

export function createReaderController({ reader, empty, player, panel, windowRef = window, getLastUserScroll = () => 0, onSelect = () => {} }) {
  let spans = [];
  const render = (source, queue) => {
    reader.innerHTML = '';
    spans = [];
    if (empty) empty.hidden = true;
    let position = 0;
    queue.forEach((item, index) => {
      if (item.start > position) reader.appendChild(document.createTextNode(source.slice(position, item.start)));
      const span = document.createElement('span');
      span.textContent = item.text;
      span.title = 'Klik untuk membaca dari sini';
      span.onclick = () => onSelect(index);
      reader.appendChild(span);
      spans.push(span);
      position = item.end;
    });
    if (position < source.length) reader.appendChild(document.createTextNode(source.slice(position)));
    reader.hidden = false;
  };
  const mark = index => spans.forEach((span, itemIndex) => { span.className = itemIndex < index ? 'done' : itemIndex === index ? 'now' : ''; });
  const clear = () => spans.forEach(span => { span.className = ''; });
  const complete = () => spans.forEach(span => { span.className = 'done'; });
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
  return Object.freeze({ render, mark, center, clear, complete, getSpans:() => [...spans] });
}
