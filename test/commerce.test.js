import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { shippingChoices, subtotal, variantItem } from '../assets/commerce.js';

test('cheapest and fastest shipping are selected independently, with deterministic ties', () => {
  const slow = { method:'Economy', costMinor:500, days:[8,12], dayType:'calendar' };
  const express = { method:'Express', costMinor:2400, days:[3,7], dayType:'calendar' };
  const equalSlowerStart = { method:'Air', costMinor:2100, days:[5,7], dayType:'calendar' };
  const business = { method:'Business', costMinor:600, days:[3,6], dayType:'business' };
  assert.deepEqual(shippingChoices({complete:true,options:[business,equalSlowerStart,express,slow]}), {cheapest:slow,fastest:express});
  assert.equal(shippingChoices({complete:false,options:[slow]}).fastest,undefined);
});
test('cart subtotal includes quantities and never adds unrelated single-SKU shipping estimates', () => {
  assert.equal(subtotal([{priceMinor:7230,quantity:2},{priceMinor:2134,quantity:3}]),20862);
  assert.equal(subtotal([]),0);
});
test('colour selections retain their own image in guest and server cart metadata', async () => {
  const { products } = JSON.parse(await readFile(new URL('../data/catalogue.json', import.meta.url)));
  const product = products.find(p => p.name === 'ANBERNIC RG35XXSP');
  const grey = product.variants.find(v => v.sku === '6819000287B');
  const blue = product.variants.find(v => v.sku === '6819000287C');
  assert.notEqual(variantItem(product, grey).image, variantItem(product, blue).image);
  assert.equal(variantItem(product, blue).image, blue.image);
  const thor = products.find(p => p.featured);
  assert.equal(thor.name, 'AYN Thor');
  assert.deepEqual([...new Set(thor.variants.map(v => v.memory))], ['8 GB / 128 GB', '12 GB / 256 GB', '16 GB / 1 TB']);
  assert.ok(thor.variants.some(v => v.sku === thor.defaultSku));
  assert.equal(thor.variants.length, 9);
});
