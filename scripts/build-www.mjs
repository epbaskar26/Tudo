// Android build: creates www/ with bundled fonts and libraries so the app needs no CDN.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { loadConfig, transform, VENDOR } from './transform.mjs';
const cfg = loadConfig();
rmSync('www', { recursive: true, force: true });
mkdirSync('www/lib', { recursive: true }); mkdirSync('www/fonts', { recursive: true });
for (const [name, src] of Object.entries(VENDOR)) copyFileSync(src, 'www/lib/' + name);
const nm = p => 'node_modules/' + p;
let css = '';
for (const w of [400, 500, 600, 700, 800]) { const f = `inter-latin-${w}-normal.woff2`; copyFileSync(nm('@fontsource/inter/files/' + f), 'www/fonts/' + f); css += `@font-face{font-family:"Inter";font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${f}) format("woff2")}\n`; }
for (const w of [400, 500, 600]) { const f = `jetbrains-mono-latin-${w}-normal.woff2`; copyFileSync(nm('@fontsource/jetbrains-mono/files/' + f), 'www/fonts/' + f); css += `@font-face{font-family:"JetBrains Mono";font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${f}) format("woff2")}\n`; }
writeFileSync('www/fonts.css', css);
let html = readFileSync('index.html', 'utf8');
html = html.replace(/<link rel="preconnect"[^>]*>\s*/g, '');
if (!/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/.test(html)) throw new Error('Font link not found');
html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link href="fonts.css" rel="stylesheet">');
// Only the app's own files, plus the Supabase project when accounts are on.
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; media-src 'self' data:; connect-src 'self'{SUPABASE}; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'";
writeFileSync('www/index.html', transform(html, cfg, { csp }));
console.log('www/ ready' + (cfg.supabaseUrl ? ' (accounts on)' : ' (accounts off: fill in tudo.config.json)'));
