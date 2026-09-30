import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const destination = new URL('dist/', root);
await rm(destination, { recursive: true, force: true });
await mkdir(new URL('data/', destination), { recursive: true });
// Explicit public allowlist: no research, scripts, old blog, admin or secrets.
for (const path of ['index.html', 'konto.html', 'warenkorb.html', '_routes.json', '404.html', 'favicon.svg', '_headers', 'assets']) {
  await cp(new URL(path, root), new URL(path, destination), { recursive: true });
}
await cp(new URL('data/catalogue.json', root), new URL('data/catalogue.json', destination));
console.log(`Shop preview built at ${fileURLToPath(destination)}`);
