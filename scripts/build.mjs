import { renderProductPage } from './product-pages.mjs';
import { productPath } from '../assets/catalogue.js';
import { cp, mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
const catalogue = JSON.parse(await readFile(new URL('data/catalogue.json', root), 'utf8'));
const template = await readFile(new URL('templates/product.html', root), 'utf8');
const htmlPages = ['index.html', 'konto.html', 'warenkorb.html'];
await mkdir(new URL('data/products/', destination), { recursive: true });
for (const product of catalogue.products) {
  const directory = productPath(product).slice(1);
  await mkdir(new URL(directory, destination), { recursive: true });
  const page = directory + 'index.html';
  await writeFile(new URL(page, destination), renderProductPage(template, product));
  // Product pages fetch only their own variants; internal provenance stays in research.
  const { source, imageSource, researchSource, ...publicProduct } = product;
  publicProduct.variants = product.variants.map(({ source, imageSource, ...variant }) => variant);
  await writeFile(new URL(`data/products/${product.id}.json`, destination), JSON.stringify(publicProduct));
  htmlPages.push(page);
}
// Keep HTML, styles and module imports on the same version after a deployment.
const assets = (await readdir(new URL('assets/', root))).filter(path => /\.(js|css)$/.test(path)).sort();
const hash = createHash('sha256');
for (const path of assets) hash.update(await readFile(new URL('assets/' + path, root)));
const version = hash.digest('hex').slice(0, 12);
for (const path of htmlPages) {
  const file = new URL(path, destination);
  const html = await readFile(file, 'utf8');
  await writeFile(file, html.replace(/(\/assets\/[^"']+\.(?:js|css))(?=["'])/g, `$1?v=${version}`));
}
for (const path of assets.filter(path => path.endsWith('.js'))) {
  const file = new URL('assets/' + path, destination);
  const source = await readFile(file, 'utf8');
  await writeFile(file, source.replace(/(from\s+['"])(\.\/[^'"]+\.js)(['"])/g, `$1$2?v=${version}$3`));
}
console.log(`Shop preview built at ${fileURLToPath(destination)}`);
