// Run after `npx cap add android`. Copies icons, splash screens, alarm sounds and the notification icon
// from resources/ (flat names, "__" = folder separator), then hardens the generated project:
//   - alarm permissions
//   - Android backups and device-to-device transfer turned off (task data never leaves the phone)
//   - release signing from environment variables (see README, "Signing key")
//   - versionCode/versionName from VERSION_CODE / VERSION_NAME so updates install over older builds
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

const must = (cond, what) => { if (!cond) throw new Error('Could not patch ' + what); };

// Manifest
const mf = 'android/app/src/main/AndroidManifest.xml';
let xml = readFileSync(mf, 'utf8');
if (!xml.includes('USE_EXACT_ALARM')) {
  xml = xml.replace('<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.INTERNET" />\n    <!-- Alarms ring on time on Android 13+ (alarm and calendar apps) -->\n    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />\n    <uses-permission android:name="android.permission.VIBRATE" />');
  must(xml.includes('USE_EXACT_ALARM'), 'manifest permissions');
}
if (!xml.includes('dataExtractionRules')) {
  xml = xml.replace('android:allowBackup="true"',
    'android:allowBackup="false"\n        android:fullBackupContent="false"\n        android:dataExtractionRules="@xml/data_extraction_rules"');
  must(xml.includes('android:allowBackup="false"'), 'manifest backup settings');
}
writeFileSync(mf, xml);

const domains = ['root', 'file', 'database', 'sharedpref', 'external'];
const ex = domains.map(d => `        <exclude domain="${d}" path="." />`).join('\n');
mkdirSync(join(res, 'xml'), { recursive: true });
writeFileSync(join(res, 'xml', 'data_extraction_rules.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n    <cloud-backup>\n${ex}\n    </cloud-backup>\n    <device-transfer>\n${ex}\n    </device-transfer>\n</data-extraction-rules>\n`);

// Gradle: signing + version
const gf = 'android/app/build.gradle';
let g = readFileSync(gf, 'utf8');
if (!g.includes('TUDO_KEYSTORE')) {
  g = g.replace(/versionCode \d+/, "versionCode((System.getenv('VERSION_CODE') ?: '1').toInteger())")
       .replace(/versionName "[^"]*"/, "versionName(System.getenv('VERSION_NAME') ?: '1.0')");
  must(g.includes("System.getenv('VERSION_CODE')"), 'build.gradle version');
  g = g.replace('    buildTypes {', `    signingConfigs {
        release {
            def ks = System.getenv('TUDO_KEYSTORE')
            if (ks) {
                storeFile file(ks)
                storePassword System.getenv('TUDO_KEYSTORE_PASSWORD')
                keyAlias System.getenv('TUDO_KEY_ALIAS')
                keyPassword System.getenv('TUDO_KEY_PASSWORD')
            }
        }
    }
    buildTypes {`);
  g = g.replace("        release {\n            minifyEnabled false", "        release {\n            if (System.getenv('TUDO_KEYSTORE')) signingConfig signingConfigs.release\n            debuggable false\n            minifyEnabled false");
  must(g.includes('signingConfig signingConfigs.release'), 'build.gradle signing');
  writeFileSync(gf, g);
}
// Alarm tones: render each tone defined in index.html (between /*TONES-START*/ and /*TONES-END*/) to a WAV file.
const src = readFileSync('index.html', 'utf8');
const m = src.match(/\/\*TONES-START\*\/\s*const TONES = (\{[\s\S]*?\});\s*\/\*TONES-END\*\//);
must(m, 'tone definitions in index.html');
const TONES = JSON.parse(m[1]);
const RATE = 16000, SECS = 8;
const wave = (w, ph) => w === 'square' ? (Math.sin(ph) >= 0 ? 1 : -1) : w === 'sawtooth' ? 2 * ((ph / (2 * Math.PI)) % 1) - 1 : w === 'triangle' ? 2 / Math.PI * Math.asin(Math.sin(ph)) : Math.sin(ph);
mkdirSync(join(res, 'raw'), { recursive: true });
for (const [key, t] of Object.entries(TONES)) {
  const N = RATE * SECS, buf = new Float32Array(N);
  for (let rep = 0; rep * t.len < SECS; rep++) {
    for (const [st, f, d, w, v, f2] of t.notes) {
      const s0 = Math.floor((rep * t.len + st) * RATE), len = Math.floor(d * RATE);
      let ph = 0;
      for (let i = 0; i < len && s0 + i < N; i++) {
        const tt = i / RATE, g = f2 ? Math.min(tt / (d * 0.8), 1) : 0, fr = f2 ? f * Math.pow(f2 / f, g) : f;
        ph += 2 * Math.PI * fr / RATE;
        const env = tt < 0.01 ? v * tt / 0.01 : v * Math.exp(Math.log(0.001) * (tt - 0.01) / Math.max(0.02, d - 0.01));
        buf[s0 + i] += env * wave(w, ph);
      }
    }
  }
  let peak = 0.0001; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i])); const gain = 0.85 / peak;
  const out = Buffer.alloc(44 + N * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + N * 2, 4); out.write('WAVE', 8); out.write('fmt ', 12);
  out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(RATE, 24); out.writeUInt32LE(RATE * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(N * 2, 40);
  for (let i = 0; i < N; i++) out.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * gain * 32767))), 44 + i * 2);
  writeFileSync(join(res, 'raw', 'tone_' + key + '.wav'), out);
}
console.log(`Android resources copied (${n}); ${Object.keys(TONES).length} alarm tones rendered; permissions, backup rules, signing and versioning set`);
