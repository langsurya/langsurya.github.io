export function createHistoryController({ storage, limit = 5, onChange = () => {} }) {
  // Riwayat versi lama disimpan sebagai string. Normalisasi agar tetap bisa
  // dibaca setelah format penyimpanan berubah menjadi objek bertanggal.
  let items = storage.getHistory().map(item =>
    typeof item === 'string'
      ? { text:item, createdAt:null }
      : item
  );
  const cloneItems = () => items.map(item => ({ ...item }));
  const emit = () => onChange(cloneItems());
  return Object.freeze({
    add(text) {
      const normalizedText = text.trim();
      if (!normalizedText) return;

      items = [
        { text:normalizedText, createdAt:new Date().toISOString() },
        ...items.filter(item => item.text !== normalizedText)
      ].slice(0, limit);
      storage.setHistory(items);
      emit();
    },
    remove(index) {
      if (index < 0 || index >= items.length) return;
      items.splice(index, 1);
      storage.setHistory(items);
      emit();
    },
    getItems:cloneItems,
    render:emit
  });
}
