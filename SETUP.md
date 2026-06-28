# Vitra — Build & Deploy Guide

A connected **Vitra Dry Fruits & More** system, built from the Claude Design prototype:

| Piece | What it is | Where it runs |
|------|------------|---------------|
| `vitra-app/` | Customer mobile app (Capacitor) — pixel-identical to the design, full-screen, **works offline** | Android APK now → iOS / Play Store later |
| `admin/` | Admin dashboard as a static website (identical to the design's desktop admin) | Vercel |
| `supabase/` | Fresh database: `schema.sql` + `seed.sql` | Your Supabase project |
| `shared/` | One data layer (`vitra-data.js`) both app & admin use to talk to Supabase | — |

> **Status — be clear on what's done vs. what needs you**
> - ✅ Customer app: built, full-bleed, offline (vendored React + fonts), verified rendering Home / Shop / Product / Cart. Capacitor Android project is generated and **build-ready**.
> - ✅ Admin website: built and verified, ready to deploy to Vercel.
> - ✅ Backend: complete Supabase schema + seed + a shared data layer with RLS.
> - ⏳ **Needs you:** (1) a Supabase project + its keys, (2) compiling the APK in an open-network env (Google's Android hosts are blocked in the Claude web sandbox), (3) wiring the prototype's mock data to the live data layer (the "deep connect" phase — see §4).

---

## 1) Build the Android APK

The Capacitor project is already generated at `vitra-app/android` with everything bundled.
The Claude web sandbox **blocks Google's Android hosts** (`dl.google.com`, `maven.google.com`),
so the final compile must run where those are reachable: either **recreate this Claude Code
environment with an open network policy**, or run on your own machine / a cloud builder.

```bash
# one-time: install the Android SDK (cmdline-tools, platform 34, build-tools 34)
#   - on your machine: Android Studio installs these for you
#   - headless: sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
export ANDROID_HOME=$HOME/Android/Sdk     # adjust to your SDK path

cd vitra-app
npm install
npm run apk:debug      # -> android/app/build/outputs/apk/debug/app-debug.apk
```

Install `app-debug.apk` on your phone (enable "Install unknown apps"). That's your test build.
For Play Store: `npm run apk:release` then sign with your keystore (see §5).

**iOS later:** `npx cap add ios && npx cap open ios` (needs a Mac + Xcode).

## 2) Create the Supabase backend (2 minutes)

1. Go to <https://supabase.com> → **New project** (pick a region near your users; set a DB password).
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, **Run**.
3. New query again, paste `supabase/seed.sql`, **Run** (sample catalog so screens look populated).
4. **Project Settings → API**, copy these three values:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY` (safe in the app; RLS protects data)
   - **service_role** key → keep secret, server/admin only

Then: `cp shared/config.example.js shared/config.js` and paste your URL + anon key.

## 3) Deploy the admin to Vercel

The admin is a static site in `admin/public`.

```bash
cd admin
npx vercel deploy --prod        # or import the GitHub repo at vercel.com/new
```

`admin/vercel.json` already points the output at `public/`. After deploy you'll get a URL like
`https://vitra-admin.vercel.app`. (To make the admin write to Supabase with the service key,
put it in a Vercel **Environment Variable** and call it from a serverless function — never ship
the service key in the static bundle.)

## 4) Connect the live data (the "deep connect" phase)

The app/admin currently render the prototype's built-in sample data. The seam to go live is
`shared/vitra-data.js` — every screen's data maps onto a method there (`Vitra.products.list()`,
`Vitra.orders.place()`, …) and the schema matches those shapes 1:1. Replacing the prototype's
mock methods with these calls makes admin edits show up in the app and customer orders show up
in admin (realtime helpers included: `Vitra.onProductsChange`, `Vitra.onOrdersChange`).

## 5) Persist the work to your GitHub (do this first!)

This bundle has **no git remote**, so push it somewhere durable before recreating any environment:

```bash
git init && git add -A && git commit -m "Vitra app + admin + supabase"
gh repo create vitra --private --source=. --push     # or create a repo on github.com and push
```

Vercel and an open-network Claude environment can both build straight from that repo.

---

### Project layout
```
vitra-app/      customer app (Capacitor)         admin/        admin website (Vercel)
  www/            offline web build                public/        built static site
  android/        generated native project         build-admin.mjs
  build-www.mjs   regenerates www from prototype  supabase/     schema.sql + seed.sql
  capacitor.config.json                           shared/       vitra-data.js + config
```
Regenerate the web builds anytime with `node vitra-app/build-www.mjs` and `node admin/build-admin.mjs`.
