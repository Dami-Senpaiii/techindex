import { copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
// Pages dev requires the standard config filename; production settings live in the Cloudflare dashboard.
await copyFile(new URL('../wrangler.dev.jsonc', import.meta.url), new URL('../wrangler.jsonc', import.meta.url));
const child = spawn('npx', ['wrangler', 'pages', 'dev', '--ip', '127.0.0.1', '--port', '4173'], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code || 0));
