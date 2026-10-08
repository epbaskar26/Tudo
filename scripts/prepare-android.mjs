// Run after `npx cap add android`: copies icons, splash screens, alarm sounds and the notification icon
// from resources/ (flat names, "__" = folder separator) and adds the alarm permissions to the manifest.
import { readdirSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
const res = 'android/app/src/main/res';
let n = 0;
for (const f of readdirSync('resources')) {
  if (!f.includes('__')) continue;
  const target = join(res, ...f.split('__'));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join('resources', f), target); n++;
}
const mf = 'android/app/src/main/AndroidManifest.xml';
let xml = readFileSync(mf, 'utf8');
if (!xml.includes('USE_EXACT_ALARM')) {
  xml = xml.replace('<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.INTERNET" />\n    <!-- Alarms ring on time on Android 13+ (alarm and calendar apps) -->\n    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />\n    <uses-permission android:name="android.permission.VIBRATE" />');
  if (!xml.includes('USE_EXACT_ALARM')) throw new Error('Could not patch AndroidManifest.xml');
  writeFileSync(mf, xml);
}
console.log(`Android resources copied (${n}) and manifest patched`);
