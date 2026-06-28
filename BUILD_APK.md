# Build the Vitra APK on your own computer (no GitHub needed)

You already have the whole project in `vitra-bundle.zip`. This turns it into an
installable Android app. Pick **Route A (easiest, recommended)**.

## Install two things first (one-time)
1. **Node.js LTS** — https://nodejs.org → download the LTS installer → next-next-finish.
2. **Android Studio** — https://developer.android.com/studio → install with default options.
   On first launch it runs a setup wizard that downloads the **Android SDK** for you — let it finish.

> Android Studio is what provides the Android build tools that the Claude sandbox couldn't
> download. With normal home internet it just works.

## Unzip the project
Unzip `vitra-bundle.zip` somewhere simple, e.g. `Desktop/vitra`. You'll see folders
`vitra-app`, `admin`, `supabase`, `shared`.

---

## Route A — Android Studio (GUI, simplest)
1. Open a terminal in the `vitra-app` folder:
   - **Windows:** open the `vitra-app` folder, click the address bar, type `cmd`, Enter.
   - **Mac:** right-click `vitra-app` → *New Terminal at Folder*.
2. Run:
   ```bash
   npm install
   npm run sync
   npx cap open android
   ```
3. Android Studio opens the project. Wait for **"Gradle sync"** to finish (bottom status bar;
   first time it downloads build files — needs internet, a few minutes).
4. Top menu → **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. When it finishes, a notification says *"APK(s) generated…"* → click **locate**.
   Your file is:
   ```
   vitra-app/android/app/build/outputs/apk/debug/app-debug.apk
   ```
6. Copy `app-debug.apk` to your phone (USB, Google Drive, or email it to yourself), tap it,
   allow "Install from unknown sources", install. Done — Vitra is on your phone. 🎉

## Route B — Command line (one command)
After `npm install`, point Capacitor at your SDK and build:
```bash
# Windows (PowerShell): setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"  (then reopen terminal)
# Mac/Linux:
export ANDROID_HOME=$HOME/Library/Android/sdk      # Mac
# export ANDROID_HOME=$HOME/Android/Sdk            # Linux

cd vitra-app
npm run apk:debug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Common snags
- **"SDK location not found"** → use Route A once (opening in Android Studio creates the
  `android/local.properties` file with your SDK path), then Route B works too.
- **Gradle sync fails / behind a proxy** → make sure you're on normal internet (the build
  fetches the Android Gradle Plugin from Google the first time).
- **Want a Play Store build** → `npm run apk:release` then sign with a keystore
  (`keytool -genkey -v -keystore vitra.jks -alias vitra -keyalg RSA -keysize 2048 -validity 10000`).

## After the app installs
- It runs fully offline with the built-in sample catalog (identical to the design).
- To make it **live** (admin edits → app updates), set up Supabase (`supabase/schema.sql`
  + `seed.sql`), put your keys in `shared/config.js`, and wire the screens through
  `shared/vitra-data.js` (see `SETUP.md §4`). I can do that part for you in an
  open-network Claude session, or guide you.
