import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { productPath } from '../assets/catalogue.js';
import { variantItem } from '../assets/commerce.js';
import { renderProductPage } from '../scripts/product-pages.mjs';
const { products } = JSON.parse(await readFile(new URL('../data/catalogue.json', import.meta.url)));
const template = await readFile(new URL('../templates/product.html', import.meta.url), 'utf8');
test('every model has a unique stable product URL and a pre-rendered product page', () => {
  assert.equal(new Set(products.map(productPath)).size, 68);
  for (const product of products) {
    assert.match(productPath(product), /^\/produkt\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/);
    const html = renderProductPage(template, product);
    assert.ok(html.includes('https://techindex.ch' + productPath(product)));
    assert.ok(html.includes(`data-product-id="${product.id}"`));
    assert.ok(html.includes('id="detail-price">CHF'));
    assert.ok(!html.includes('{{'));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(!html.includes('tvcmall.com'));
    for (const variant of product.variants) assert.equal(new URL(variantItem(product,variant).url,'https://techindex.ch').searchParams.get('sku'),variant.sku);
  }
});
test('product data is escaped before insertion into HTML and metadata', () => {
  const product = structuredClone(products[0]);
  product.name = '<img src=x onerror="alert(1)">';
  const html = renderProductPage(template,product);
  assert.ok(!html.includes(product.name));
  assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
});
