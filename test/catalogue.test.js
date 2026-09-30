import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';
import { selectProducts } from '../assets/catalogue.js';
const { mode, products } = JSON.parse(await readFile(new URL('../data/catalogue.json', import.meta.url)));

test('all research candidates remain a non-orderable preview without retail prices', () => {
  assert.equal(mode, 'preview');
  assert.ok(products.length > 0);
  for (const product of products) {
    assert.equal(product.status, 'in_preparation');
    assert.equal(product.price, undefined);
    assert.equal(product.checkout, undefined);
    assert.ok(product.variants.length > 0);
    for (const variant of product.variants) assert.equal(new URL(variant.source).hostname, 'www.tvcmall.com');
  }
});
test('50 unique handheld variants are grouped into 19 models', () => {
  const handhelds = products.filter(p => p.category === 'handhelds');
  assert.equal(handhelds.length, 19);
  assert.equal(handhelds.flatMap(p => p.variants).length, 50);
  assert.equal(new Set(products.flatMap(p => p.variants.map(v => v.sku))).size, products.flatMap(p => p.variants).length);
});
test('search combines model and variant terms without case or accent sensitivity', () => {
  const matches = selectProducts(products, 'handhelds', 'rg35xxsp GRAU');
  assert.equal(matches.total, 1);
  assert.equal(matches.products[0].name, 'ANBERNIC RG35XXSP');
  assert.equal(selectProducts(products, 'kabel', 'rg35xxsp').total, 0);
  assert.equal(selectProducts(products, 'handhelds', '<script>').total, 0);
});
test('pagination clamps invalid pages and never duplicates models', () => {
  assert.equal(selectProducts(products, 'handhelds', '', -10).page, 1);
  assert.equal(selectProducts(products, 'handhelds', '', 999).page, 4);
  const pages = [1, 2, 3, 4].flatMap(page => selectProducts(products, 'handhelds', '', page).products);
  assert.equal(pages.length, 19);
  assert.equal(new Set(pages.map(p => p.id)).size, 19);
});
test('every referenced local product image exists', async () => {
  for (const product of products) if (product.image) await access(new URL('..' + product.image, import.meta.url));
});
