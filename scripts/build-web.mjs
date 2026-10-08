// Vercel build: copies the web app and the Android download page into dist/ (only these files are served).
import { mkdirSync, copyFileSync, rmSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
copyFileSync('index.html', 'dist/index.html');
copyFileSync('download.html', 'dist/download.html');
console.log('dist/ ready');
