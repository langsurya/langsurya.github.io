export function chunkText(text, max = 300) {
  const chunks = [];
  const pattern = /[^.!?;:\n]+[.!?;:]*["'”’)\]]*/g;
  const whitespace = /\s/;
  let match;
  while ((match = pattern.exec(text))) {
    let start = match.index;
    let end = start + match[0].length;
    while (start < end && whitespace.test(text[start])) start++;
    while (end > start && whitespace.test(text[end - 1])) end--;
    if (end <= start) continue;
    while (end - start > max) {
      let cut = text.lastIndexOf(' ', start + max);
      if (cut <= start) cut = Math.min(end, start + max);
      chunks.push({ start, end:cut, text:text.slice(start, cut) });
      start = cut;
      while (start < end && whitespace.test(text[start])) start++;
    }
    chunks.push({ start, end, text:text.slice(start, end) });
  }
  return chunks;
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
