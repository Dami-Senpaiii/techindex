import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const base = 'http://127.0.0.1:4173';
const suffix = randomBytes(5).toString('hex');
const password = randomBytes(20).toString('base64url');
const clients = [new Map(), new Map()]; const users = [];
async function request(path, { client = 0, method = 'GET', body, origin = base } = {}) {
  const cookie = [...clients[client]].map(([key,value]) => `${key}=${value}`).join('; ');
  const response = await fetch(base + path, { method, headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.' + (client + 10) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  for (const header of response.headers.getSetCookie()) { const pair = header.split(';')[0]; const index = pair.indexOf('='); clients[client].set(pair.slice(0,index), pair.slice(index+1)); }
  const data = await response.json(); return { response, data };
}
function sql(command) { execFileSync('npx',['wrangler','d1','execute','techindex-shop','--local','--config','wrangler.dev.jsonc','--command',command], { stdio:'pipe' }); }
try {
  assert.equal((await request('/api/shop?resource=profile')).response.status,401);
  for (let client=0; client<2; client++) {
    const result=await request('/api/auth/sign-up/email',{client,method:'POST',body:{name:'QA Test',email:`qa-${suffix}-${client}@example.test`,password}});
    assert.equal(result.response.status,200,JSON.stringify(result.data)); users.push(result.data.user.id);
    assert.ok(result.response.headers.getSetCookie().some(cookie=>cookie.includes('HttpOnly')&&cookie.includes('SameSite=Lax')));
    assert.equal((await request('/api/auth/get-session',{client})).data.user.id, users[client]);
  }
  assert.equal((await request('/api/shop?resource=cart',{method:'PUT',origin:'https://untrusted.example',body:{items:[]}})).response.status,403);
  const catalogue = await (await fetch(base+'/data/catalogue.json')).json(); const sku=catalogue.products[0].variants[0].sku;
  const cart=await request('/api/shop?resource=cart',{method:'PUT',body:{items:[{sku,quantity:3,priceMinor:1}],userId:users[1]}}); assert.equal(cart.response.status,200,JSON.stringify(cart.data));
  assert.equal(cart.data.items[0].priceMinor,catalogue.products[0].variants[0].priceMinor);
  assert.deepEqual(cart.data.items[0].shipping,catalogue.products[0].variants[0].shipping);
  assert.equal((await request('/api/shop?resource=cart',{client:1})).data.items.length,0);
  assert.equal((await request('/api/shop?resource=cart')).data.items[0].quantity,3);
  assert.equal((await request('/api/shop?resource=cart',{method:'PUT',body:{items:[{sku:'fake',quantity:2}]}})).response.status,400);
  const profile={firstName:'Prüfung',lastName:'Konto',phone:'',street:'Testweg 1',addressExtra:'',postalCode:'8000',city:'Zürich',country:'CH',userId:users[1]};
  assert.equal((await request('/api/shop?resource=profile',{method:'PUT',body:profile})).response.status,200);
  assert.equal((await request('/api/shop?resource=profile')).data.profile.city,'Zürich');
  assert.equal((await request('/api/shop?resource=profile',{client:1})).data.profile.city,'');
  assert.equal((await request('/api/auth/get-session')).data.user.name,'Prüfung Konto');
  for(const id of users) assert.match(id,/^[A-Za-z0-9_-]+$/);
  sql(`INSERT INTO shop_order(id,user_id,order_number,status,total_minor,currency,created_at,items) VALUES ('qa-${suffix}','${users[0]}','QA-${suffix}','completed',12300,'CHF','2026-09-30T10:00:00Z','[{"name":"QA product","variant":"Test","quantity":1,"unit_minor":12300}]');`);
  assert.equal((await request('/api/shop?resource=orders')).data.orders[0].order_number,'QA-'+suffix);
  assert.equal((await request('/api/shop?resource=orders',{client:1})).data.orders.length,0);
  assert.equal((await request('/api/shop?resource=orders',{method:'POST',body:{total_minor:1}})).response.status,404);
  const nextPassword=randomBytes(20).toString('base64url');
  assert.equal((await request('/api/shop?resource=email',{method:'POST',body:{newEmail:`changed-${suffix}@example.test`,password:'incorrect'}})).response.status,400);
  const email=await request('/api/shop?resource=email',{method:'POST',body:{newEmail:`changed-${suffix}@example.test`,password}}); assert.equal(email.response.status,200,JSON.stringify(email.data));
  const change=await request('/api/auth/change-password',{method:'POST',body:{currentPassword:password,newPassword:nextPassword,revokeOtherSessions:true}}); assert.equal(change.response.status,200,JSON.stringify(change.data));
  await request('/api/auth/sign-out',{method:'POST',body:{}});
  assert.equal((await request('/api/auth/get-session')).data,null);
  assert.equal((await request('/api/shop?resource=profile')).response.status,401);
  assert.equal((await request('/api/auth/sign-in/email',{method:'POST',body:{email:`changed-${suffix}@example.test`,password}})).response.status,401);
  const login=await request('/api/auth/sign-in/email',{method:'POST',body:{email:`changed-${suffix}@example.test`,password:nextPassword}}); assert.equal(login.response.status,200,JSON.stringify(login.data));
  assert.equal((await request('/api/shop?resource=cart')).data.items[0].quantity,3);
  assert.equal((await request('/api/shop?resource=orders')).response.headers.get('Cache-Control'),'private, no-store');
  console.log('PASS: real registration/login/logout, cookies, profile persistence, email/password changes, cart persistence, user isolation, order history, origin checks, invalid input and checkout guard.');
} finally {
  if(users.length) sql(`DELETE FROM shop_order WHERE id = 'qa-${suffix}'; DELETE FROM user WHERE id IN (${users.map(id=>`'${id}'`).join(',')});`);
}
