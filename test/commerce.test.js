import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { availableShippingOptions, shippingForShop, shippingChoices, subtotal, variantItem } from '../assets/commerce.js';

test('cheapest and fastest shipping are selected independently, with deterministic ties', () => {
  const slow = { method:'UPS', costMinor:500, days:[8,12], dayType:'calendar' };
  const express = { method:'DHL', costMinor:2400, days:[3,7], dayType:'calendar' };
  const equalSlowerStart = { method:'UPS', costMinor:2100, days:[5,7], dayType:'calendar' };
  const business = { method:'DHL', costMinor:600, days:[3,6], dayType:'business' };
  assert.deepEqual(shippingChoices({complete:true,options:[business,equalSlowerStart,express,slow]}), {cheapest:slow,fastest:express});
  assert.equal(shippingChoices({complete:false,options:[slow]}).fastest,undefined);
});
test('unsupported services cannot set the cheapest or fastest fee, including when no allowed service exists', () => {
  const excluded = ['YunExpress', 'SUNYOU', 'Fedex', 'POST NL', 'EUB', 'DHL-CN'].map(method => ({method,costMinor:1,days:[1,2],dayType:'calendar'}));
  const dhl = { method:'DHL',costMinor:2000,days:[6,9],dayType:'calendar' };
  const ups = { method:'UPS',costMinor:3000,days:[3,7],dayType:'calendar' };
  const shipping = {complete:true,quantity:1,processingDays:[1,3],options:[...excluded,dhl,ups]};
  assert.deepEqual(availableShippingOptions(shipping), [dhl,ups]);
  assert.deepEqual(shippingChoices(shipping), {cheapest:dhl,fastest:ups});
  assert.deepEqual(shippingChoices({complete:true,options:excluded}), {cheapest:undefined,fastest:undefined});
  assert.deepEqual(shippingForShop(shipping), {...shipping,options:[dhl,ups]});
  assert.equal(shipping.options.length,8); // retain the original quote evidence
});
test('all 210 variants offer both DHL and UPS with identical fees in catalogue choices and cart metadata', async () => {
  const { products } = JSON.parse(await readFile(new URL('../data/catalogue.json', import.meta.url)));
  assert.equal(products.flatMap(product => product.variants).length,210);
  for (const product of products) for (const variant of product.variants) {
    const allowed = availableShippingOptions(variant.shipping);
    assert.deepEqual(allowed.map(option=>option.method).sort(),['DHL','UPS'],variant.sku);
    const cartShipping = variantItem(product,variant).shipping;
    assert.deepEqual(cartShipping.options,allowed);
    assert.deepEqual(shippingChoices(cartShipping),shippingChoices(variant.shipping));
    assert.equal(shippingChoices(variant.shipping).cheapest.costMinor,Math.min(...allowed.map(option=>option.costMinor)));
  }
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
