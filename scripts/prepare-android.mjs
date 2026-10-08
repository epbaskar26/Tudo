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
console.log(`Android resources copied (${n}); permissions, backup rules, signing and versioning set`);
