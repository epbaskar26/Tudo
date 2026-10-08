// Shared by the web (Vercel) and Android builds.
// Reads tudo.config.json (or SUPABASE_URL / SUPABASE_ANON_KEY / SITE_URL environment variables),
// switches CDN scripts to the bundled copies in lib/, and turns on Supabase accounts when configured.
import { readFileSync } from 'node:fs';

export function loadConfig() {
  let file = {};
  try { file = JSON.parse(readFileSync('tudo.config.json', 'utf8')); } catch (e) {}
  const cfg = {
    supabaseUrl: (process.env.SUPABASE_URL || file.supabaseUrl || '').trim().replace(/\/+$/, ''),
    supabaseAnonKey: (process.env.SUPABASE_ANON_KEY || file.supabaseAnonKey || '').trim(),
    siteUrl: (process.env.SITE_URL || file.siteUrl || '').trim().replace(/\/+$/, ''),
  };
  if (cfg.supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.supabaseUrl)) throw new Error('supabaseUrl must look like https://<project>.supabase.co');
  return cfg;
}

export const VENDOR = { 'otpauth.umd.min.js': 'vendor/otpauth.umd.min.js', 'qrcode.js': 'vendor/qrcode.js', 'supabase.js': 'vendor/supabase.js' };

export function transform(html, cfg, { csp } = {}) {
  const swap = (re, rep) => { if (!re.test(html)) throw new Error('Pattern not found: ' + re); html = html.replace(re, rep); };
  swap(/https:\/\/cdn\.jsdelivr\.net\/npm\/otpauth@[^"]+/, 'lib/otpauth.umd.min.js');
  swap(/https:\/\/cdn\.jsdelivr\.net\/npm\/qrcode-generator@[^"]+/, 'lib/qrcode.js');
  const sb = cfg.supabaseUrl && cfg.supabaseAnonKey;
  const inject = (sb ? '<script src="lib/supabase.js"></script>\n' : '') +
    '<script>window.TUDO_CONFIG = ' + JSON.stringify(sb ? cfg : {}).replace(/</g, '\\u003c') + ';</script>\n';
  swap(/<script src="lib\/qrcode\.js"><\/script>\n/, m => m + inject);
  if (csp) {
    const host = sb ? ' ' + cfg.supabaseUrl + ' ' + cfg.supabaseUrl.replace('https://', 'wss://') : '';
    const policy = csp.replace('{SUPABASE}', host);
    swap(/<meta charset="utf-8">/, m => m + '\n<meta http-equiv="Content-Security-Policy" content="' + policy + '">');
  }
  return html;
}
