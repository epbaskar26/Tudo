# Tudo

Tasks, calendar, priority matrix, focus timer, habits, alarms, a work log and a clipboard in one app.

Features: quick add (`Tmrw High New rule`), unfinished tasks move to the next day, a work log of completed tasks (kept 6 to 24 months or forever, with CSV export), alarms up to 60 days ahead, task alerts (notification or alarm), passphrase sign-in with optional authenticator app.

- Web app: hosted on Vercel from this repository (`index.html`).
- Android app: built by GitHub Actions on every push to `main` and published to
  [Releases](https://github.com/epbaskar26/Tudo/releases). The web app's `/download` page links to the latest APK.

## Repository layout

| Path | Purpose |
|---|---|
| `index.html` | The whole app (web and Android share this file) |
| `download.html` | Android download page, served at `/download` |
| `vercel.json` | Vercel build settings and security headers |
| `scripts/build-web.mjs` | Copies the web files to `dist/` for Vercel |
| `scripts/build-www.mjs` | Builds the offline Android bundle (local fonts and libraries) |
| `scripts/prepare-android.mjs` | Adds icons, splash screens, alarm sounds and alarm permissions |
| `resources/` | Android assets; `__` in a file name stands for a folder |
| `.github/workflows/android.yml` | Builds the APK and publishes a release |

## Deploying the web app

Import the repository in Vercel (Add New, Project). Vercel reads `vercel.json`, so no settings need changing.
Every push to `main` redeploys automatically.

## Signing key (required for Android builds)

Release APKs are signed with one permanent key so updates install over the existing app.
Add these repository secrets under Settings > Secrets and variables > Actions:

| Secret | Value |
|---|---|
| `TUDO_KEYSTORE_BASE64` | The keystore file, base64-encoded |
| `TUDO_KEYSTORE_PASSWORD` | Keystore password |
| `TUDO_KEY_ALIAS` | `tudo` |
| `TUDO_KEY_PASSWORD` | Key password (same as the keystore password) |

Keep a copy of the keystore and passwords in a password manager. If the key is lost, the next APK
cannot update the installed app.

To create your own key instead (needs a JDK):

```bash
keytool -genkeypair -storetype PKCS12 -keystore tudo-release.jks -alias tudo -keyalg RSA -keysize 4096 -validity 10950
base64 -w0 tudo-release.jks      # Windows PowerShell: [Convert]::ToBase64String([IO.File]::ReadAllBytes("tudo-release.jks"))
```

## Security

- Data is encrypted at rest with AES-256-GCM once sign-in is set up. The data key is random and is stored only
  wrapped with a key derived from the passphrase (PBKDF2-SHA256, 310,000 iterations) and with each recovery code.
- The Android app is a signed, non-debuggable release build. Android backups and device-to-device transfer are off.
- The Android bundle has a strict Content Security Policy and loads nothing from the network.
- Failed sign-in attempts lock sign-in for 30 seconds, doubling up to an hour, and survive app restarts.
- Every release lists the APK's SHA-256 checksum and the signing certificate fingerprint.

Known limits: "Keep me signed in for 7 days" stores the unlock key on the device. The authenticator secret is
stored unencrypted (it is useless without the passphrase). On claude.ai, Clipboard items are stored unencrypted
so they can sync and be shared.

## Building the Android app locally

Requirements: Node.js 22+, JDK 21, Android SDK 36.

```bash
npm ci
npm run android:init     # first time: generates android/
npm run android:apk      # later builds (debug APK, for testing only)
# APK: android/app/build/outputs/apk/debug/app-debug.apk
# Signed release: set TUDO_KEYSTORE, TUDO_KEYSTORE_PASSWORD, TUDO_KEY_ALIAS, TUDO_KEY_PASSWORD, then
# cd android && ./gradlew assembleRelease
```

## Notes

- Data is stored per browser (web) or per phone (Android). The two do not sync yet. Use the Work log's CSV export as a backup.
- The sign-in page is a passphrase lock with optional authenticator codes (otpauth, MIT) and recovery codes.
  Passphrases are stored only as PBKDF2-SHA256 hashes.
- On Android, alarms and task alerts are scheduled as system alarms and ring when the app is closed.
  On the web, they ring only while a Tudo tab is open.
