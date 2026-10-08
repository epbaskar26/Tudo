// Android build: creates www/ from index.html with bundled fonts and libraries so the app works offline.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
rmSync('www', { recursive: true, force: true });
mkdirSync('www/lib', { recursive: true }); mkdirSync('www/fonts', { recursive: true });
const nm = p => 'node_modules/' + p;
copyFileSync(nm('otpauth/dist/otpauth.umd.min.js'), 'www/lib/otpauth.umd.min.js');
copyFileSync(nm('qrcode-generator/dist/qrcode.js'), 'www/lib/qrcode.js');
let css = '';
for (const w of [400, 500, 600, 700, 800]) { const f = `inter-latin-${w}-normal.woff2`; copyFileSync(nm('@fontsource/inter/files/' + f), 'www/fonts/' + f); css += `@font-face{font-family:"Inter";font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${f}) format("woff2")}\n`; }
for (const w of [400, 500, 600]) { const f = `jetbrains-mono-latin-${w}-normal.woff2`; copyFileSync(nm('@fontsource/jetbrains-mono/files/' + f), 'www/fonts/' + f); css += `@font-face{font-family:"JetBrains Mono";font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${f}) format("woff2")}\n`; }
writeFileSync('www/fonts.css', css);
let html = readFileSync('index.html', 'utf8');
const swaps = [
  [/<link rel="preconnect"[^>]*>\s*/g, ''],
  [/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link href="fonts.css" rel="stylesheet">'],
  [/https:\/\/cdn\.jsdelivr\.net\/npm\/otpauth@[^"]+/, 'lib/otpauth.umd.min.js'],
  [/https:\/\/cdn\.jsdelivr\.net\/npm\/qrcode-generator@[^"]+/, 'lib/qrcode.js'],
];
for (const [re, rep] of swaps) { if (!re.test(html)) throw new Error('Pattern not found: ' + re); html = html.replace(re, rep); }
writeFileSync('www/index.html', html);
console.log('www/ ready');
