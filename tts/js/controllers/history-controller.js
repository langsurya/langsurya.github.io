export function createHistoryController({ storage, limit = 8, onChange = () => {} }) {
  let items = storage.getHistory();
  const emit = () => onChange([...items]);
  return Object.freeze({
    add(text) {
      items = [text, ...items.filter(item => item !== text)].slice(0, limit);
      storage.setHistory(items);
      emit();
    },
    remove(index) {
      items.splice(index, 1);
      storage.setHistory(items);
      emit();
    },
    getItems:() => [...items],
    render:emit
  });
}
