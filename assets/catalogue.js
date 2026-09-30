export const CATEGORY_LABELS = {
  handhelds: { title: 'Dein nächstes Handheld.', noun: 'Handheld', description: 'Handhelds für unterwegs. Vergleiche Modelle, Ausführungen und technische Details.' },
  controller: { title: 'Alles unter Kontrolle.', noun: 'Controller', description: 'Gamepads, Arcade-Sticks und mobile Controller für dein Setup.' },
  kabel: { title: 'Die richtige Verbindung.', noun: 'Kabel', description: 'Kabel für dein Gaming-Setup.' },
  beamer: { title: 'Gaming auf grosser Fläche.', noun: 'Beamer', description: 'Kompakte Beamer für dein Setup.' },
  peripherie: { title: 'Mach dein Setup komplett.', noun: 'Peripherie', description: 'Mäuse, Tastaturen und USB-Hubs.' },
};
const normalize = (value) => String(value || '').toLocaleLowerCase('de-CH').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
export function selectProducts(products, category, query = '', page = 1, pageSize = 6) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const filtered = products.filter((product) => product.category === category && words.every((word) => normalize([product.name, ...product.variants.map((variant) => variant.name)].join(' ')).includes(word)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.max(1, Math.min(totalPages, Number.parseInt(page, 10) || 1));
  return { products: filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), total: filtered.length, page: currentPage, totalPages };
}
export function productSubtitle(product) {
  const count = product.variants.length;
  return `${CATEGORY_LABELS[product.category].noun} · ${count} ${count === 1 ? 'Ausführung' : 'Ausführungen'}`;
}
