// Vercel build: writes dist/ (the web app, the Android download page and bundled libraries).
import { mkdirSync, copyFileSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { loadConfig, transform, VENDOR } from './transform.mjs';
const cfg = loadConfig();
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/lib', { recursive: true });
for (const [name, src] of Object.entries(VENDOR)) copyFileSync(src, 'dist/lib/' + name);
writeFileSync('dist/index.html', transform(readFileSync('index.html', 'utf8'), cfg));
copyFileSync('download.html', 'dist/download.html');
console.log('dist/ ready' + (cfg.supabaseUrl ? ' (accounts on: ' + cfg.supabaseUrl + ')' : ' (accounts off: fill in tudo.config.json)'));
