import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';
import { selectProducts } from '../assets/catalogue.js';
const { mode, products } = JSON.parse(await readFile(new URL('../data/catalogue.json', import.meta.url)));

test('every purchasable variant has an exact CHF 20 markup and complete Swiss shipping quotes', async () => {
  assert.equal(mode, 'preview'); // payment setup is deliberately separate from catalogue availability
  const audit = JSON.parse(await readFile(new URL('../research/supplier-pricing.json', import.meta.url)));
  const costs = new Map(audit.map(row => [row.sku, row]));
  for (const product of products) {
    assert.equal(product.status, 'available');
    assert.ok(product.details.paragraphs.join(' ').length > 80);
    assert.ok(product.details.specifications.length >= 4);
    assert.ok(product.variants.length > 0);
    for (const variant of product.variants) {
      assert.equal(new URL(variant.source).hostname, 'www.tvcmall.com');
      assert.ok(Number.isInteger(variant.priceMinor));
      assert.equal(variant.priceMinor, costs.get(variant.sku).purchasePriceMinor + 2000);
      assert.equal(variant.shipping.country, 'CH');
      assert.equal(variant.shipping.currency, 'CHF');
      assert.equal(variant.shipping.complete, true);
      assert.ok(variant.shipping.quantity >= 1);
      assert.ok(variant.shipping.options.length >= 2);
      for (const option of variant.shipping.options) {
        assert.ok(Number.isInteger(option.costMinor) && option.costMinor >= 0);
        assert.ok(option.days[0] > 0 && option.days[1] >= option.days[0]);
        assert.ok(['calendar', 'business'].includes(option.dayType));
      }
    }
  }
});
test('the four accessory categories each contain 12 distinct models', () => {
  for (const category of ['controller', 'kabel', 'beamer', 'peripherie']) assert.equal(products.filter(p => p.category === category).length, 12);
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
