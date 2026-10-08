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

## Building the Android app locally

Requirements: Node.js 22+, JDK 21, Android SDK 36.

```bash
npm ci
npm run android:init     # first time: generates android/
npm run android:apk      # later builds
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

## Notes

- Data is stored per browser (web) or per phone (Android). The two do not sync yet. Use the Work log's CSV export as a backup.
- The sign-in page is a passphrase lock with optional authenticator codes (otpauth, MIT) and recovery codes.
  Passphrases are stored only as PBKDF2-SHA256 hashes.
- On Android, alarms and task alerts are scheduled as system alarms and ring when the app is closed.
  On the web, they ring only while a Tudo tab is open.
