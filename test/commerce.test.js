import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingChoices, subtotal } from '../assets/commerce.js';

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
