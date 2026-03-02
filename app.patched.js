
// === PATCHED DECK LOADER (Baseline 2d) ===
async function loadDecksSafe() {
  let config;
  try {
    const res = await fetch('decks.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('decks.json not found');
    config = await res.json();
  } catch (err) {
    console.error('Failed to load decks.json', err);
    alert('Deck configuration is invalid.');
    return [];
  }

  if (!Array.isArray(config.decks)) return [];

  const loadedDecks = [];
  for (const deck of config.decks) {
    try {
      const res = await fetch(deck.file, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data.cards) || data.cards.length === 0) continue;
      loadedDecks.push({ ...deck, cards: data.cards, meta: data.meta || {} });
    } catch (_) {}
  }
  return loadedDecks;
}
// === END PATCH ===
