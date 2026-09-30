import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';
import { selectProducts, selectVariant } from '../assets/catalogue.js';
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
test('115 unique handheld variants are grouped into 20 models', () => {
  const handhelds = products.filter(p => p.category === 'handhelds');
  assert.equal(handhelds.length, 20);
  assert.equal(handhelds.flatMap(p => p.variants).length, 115);
  assert.equal(new Set(products.flatMap(p => p.variants.map(v => v.sku))).size, products.flatMap(p => p.variants).length);
});
test('separate hardware and colour choices resolve every catalogue SKU without ambiguity', () => {
  for (const product of products) {
    assert.equal(new Set(product.variants.map(v => `${v.hardware}|${v.color}`)).size, product.variants.length);
    for (const variant of product.variants) {
      assert.ok(variant.hardware);
      assert.equal(selectVariant(product, variant.hardware, variant.color).sku, variant.sku);
    }
  }
});
test('hardware changes preserve an available colour and cannot create an unavailable combination', () => {
  const thor = products.find(p => p.name === 'AYN Thor');
  assert.equal(selectVariant(thor, '16 GB / 1 TB', 'Transparent Violett').sku, '6819000453D');
  assert.equal(selectVariant(thor, '8 GB / 128 GB', 'Transparent Violett').sku, '6819000454A');
  assert.equal(selectVariant(thor, 'not offered', 'Schwarz'), undefined);
  const accessory = products.find(p => p.category === 'kabel');
  assert.equal(selectVariant(accessory, 'Standard', undefined).sku, accessory.variants[0].sku);
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
  assert.equal(pages.length, 20);
  assert.equal(new Set(pages.map(p => p.id)).size, 20);
});
test('every referenced local product image exists', async () => {
  for (const product of products) {
    await access(new URL('..' + product.image, import.meta.url));
    for (const variant of product.variants) {
      assert.ok(variant.image.toLowerCase().includes(variant.sku.toLowerCase()), `Wrong colour image for ${variant.sku}`);
      await access(new URL('..' + variant.image, import.meta.url));
    }
  }
});
