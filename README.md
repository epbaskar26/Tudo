# Tudo

Tasks, calendar, priority matrix, alarms, a work log and a clipboard in one app, with accounts for you and your friends.

Features: quick add (`Tmrw High New rule`), unfinished tasks move to the next day, a work log of completed tasks (kept 6 to 24 months or forever, with CSV export), alarms up to 60 days ahead, task alerts (notification or alarm), passphrase sign-in with optional authenticator app.

- Web app: hosted on Vercel from this repository (`index.html`).
- Android app: built by GitHub Actions on every push to `main` and published to
  [Releases](https://github.com/epbaskar26/Tudo/releases). The web app's `/download` page links to the latest APK.

## Repository layout

| Path | Purpose |
|---|---|
| `index.html` | The whole app (web and Android share this file) |
| `tudo.config.json` | Supabase project URL and anon key (accounts) |
| `supabase/schema.sql` | Database tables and access rules |
| `vendor/` | Bundled Supabase, otpauth and QR code libraries |
| `scripts/transform.mjs` | Shared build step: config, bundled libraries, CSP |
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

## Accounts with Supabase (one-time setup)

Without this, the app runs in device-only mode with a local passphrase. With it, people sign up and sign in,
and their tasks sync across their devices. Each person's data is encrypted on their own device before upload,
so the database (and you, as its owner) only ever see encrypted text.

1. Create a free project at supabase.com (choose a region near you, for example Mumbai).
2. SQL Editor > New query: paste `supabase/schema.sql` and click Run.
3. Project Settings > API: copy the Project URL and the anon (or publishable) key into `tudo.config.json`:
   ```json
   { "supabaseUrl": "https://abcd1234.supabase.co", "supabaseAnonKey": "eyJ...", "siteUrl": "https://your-site.vercel.app" }
   ```
   The anon key is meant to be public; row level security in `schema.sql` keeps each person's rows private.
4. Authentication > URL Configuration: set Site URL to your Vercel address and add it under Redirect URLs.
5. Email delivery: Supabase's built-in sender only delivers to your own project team (2 emails per hour).
   For friends, add a custom SMTP sender under Authentication > Emails > SMTP Settings (Resend, Brevo or
   Postmark have free tiers). Until then, sign-up confirmation and password reset emails will not reach them.
6. Optional: Authentication > Providers > Email > minimum password length 10, to match the app.
7. Commit and push. Vercel redeploys and GitHub builds a new APK with accounts turned on.

Notes:
- Forgot password works by email link. Because data is encrypted with the password, after a reset the app asks
  once for the previous password or a recovery code. Without either, the old data cannot be recovered.
- Two-step sign-in (authenticator app) is available under Settings. When it is on, the database refuses that
  person's data until the code is entered.
- Supabase pauses free projects after a week without activity; opening the app regularly keeps it awake.

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

- With Supabase configured, data syncs across devices for each account. Without it, data stays per browser or phone.
- The sign-in page is a passphrase lock with optional authenticator codes (otpauth, MIT) and recovery codes.
  Passphrases are stored only as PBKDF2-SHA256 hashes.
- On Android, alarms and task alerts are scheduled as system alarms and ring when the app is closed.
  On the web, they ring only while a Tudo tab is open.
