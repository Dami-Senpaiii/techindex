import { variantItem } from '../assets/commerce.js';
import catalogue from '../data/catalogue.json' with { type: 'json' };
export const variants = new Map(catalogue.products.flatMap(product => product.variants.map(variant => [variant.sku, variantItem(product, variant)])));
export function cartItems(rows) { return rows.filter(row => variants.has(row.sku)).map(row => ({ ...variants.get(row.sku), quantity: row.quantity })); }
export function validateLines(lines) {
  if (!Array.isArray(lines) || lines.length > 100) throw Object.assign(new Error('Der Warenkorb ist zu gross.'), { status: 400 });
  const seen = new Set();
  for (const line of lines) {
    if (!line || !variants.has(line.sku) || seen.has(line.sku) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw Object.assign(new Error('Bitte prüfe Artikel und Mengen im Warenkorb.'), { status: 400 });
    seen.add(line.sku);
  }
  return lines.map(({ sku, quantity }) => ({ sku, quantity }));
}
export function validateProfile(data) {
  const fields = { firstName: 80, lastName: 80, phone: 40, street: 120, addressExtra: 120, postalCode: 16, city: 100, country: 2 };
  const result = {};
  for (const [key, max] of Object.entries(fields)) {
    const value = data[key];
    if (typeof value !== 'string' || value.trim().length > max) throw Object.assign(new Error('Bitte prüfe deine Angaben.'), { status: 400 });
    result[key] = value.trim();
  }
  if (!result.firstName || !result.lastName || result.country !== 'CH' || (result.postalCode && !/^\d{4}$/.test(result.postalCode))) throw Object.assign(new Error('Vorname, Nachname und eine gültige Schweizer Postleitzahl sind erforderlich.'), { status: 400 });
  return result;
}
