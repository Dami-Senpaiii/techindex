import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLines, validateProfile, cartItems, variants } from '../server/shop.js';
import { hashPassword, verifyPassword } from '../server/auth.js';
import { checkOrigin } from '../server/http.js';
const sku = [...variants.keys()][0];
test('cart rejects unknown variants, duplicate lines and invalid quantities', () => {
  for (const lines of [[{sku:'bad',quantity:1}], [{sku,quantity:0}], [{sku,quantity:1.5}], [{sku,quantity:100}], [{sku,quantity:1},{sku,quantity:2}]]) assert.throws(() => validateLines(lines));
  assert.deepEqual(validateLines([{sku,quantity:2,userId:'other',price:0}]), [{sku,quantity:2}]);
  assert.equal(cartItems([{sku,quantity:2}])[0].name, variants.get(sku).name);
});
test('profile accepts only expected fields and validates the Swiss postcode', () => {
  const profile = {firstName:' Test ',lastName:' Person ',phone:'',street:'',addressExtra:'',postalCode:'8000',city:'Zürich',country:'CH',userId:'victim'};
  const parsed = validateProfile(profile); assert.equal(parsed.firstName,'Test'); assert.equal(parsed.userId,undefined);
  assert.throws(() => validateProfile({...profile,postalCode:'12345'}));
});
test('passwords use random salts and wrong passwords fail', async () => {
  const password='A long test password!'; const first=await hashPassword(password); const second=await hashPassword(password);
  assert.notEqual(first,second); assert.equal(await verifyPassword({password,hash:first}),true); assert.equal(await verifyPassword({password:'wrong',hash:first}),false);
});
test('account writes reject foreign origins and public preview hosts', () => {
  assert.throws(() => checkOrigin(new Request('https://techindex.ch/api/shop',{method:'POST',headers:{Origin:'https://evil.example'}})));
  assert.throws(() => checkOrigin(new Request('https://abc.techindex.pages.dev/api/shop')));
  assert.doesNotThrow(() => checkOrigin(new Request('https://techindex.ch/api/shop',{method:'POST',headers:{Origin:'https://techindex.ch'}})));
});
