# Local development and physical device testing

This guide walks through running the **Expo dev client**, **Metro**, and the **Cloudflare Worker** on your machine so you can test on a **real iPhone or Android phone**, not only simulators.

> **Expo Go is not enough** for this project: WatermelonDB and other native modules require a **custom dev build** (`expo-dev-client`). Use `pnpm run ios` / `pnpm run android` to install the dev client on a simulator or device.

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | v20 or newer ([package.json](../package.json) `engines`). |
| **pnpm** | v9+ recommended; install with `npm install -g pnpm` if needed. |
| **Git + repo clone** | `pnpm install` at the repository root. |
| **iOS (optional)** | macOS, Xcode, CocoaPods (Xcode usually installs the toolchain). Apple ID for device provisioning. |
| **Android (optional)** | Android Studio, SDK, platform tools (`adb` on your `PATH`). USB debugging enabled on the phone if using USB. |

## 1. Environment variables (Expo app)

1. Copy the example env file at the repo root:

   ```bash
   cp .env.example .env
   ```

2. Set at least:

   | Variable | Purpose |
   |----------|---------|
   | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk **publishable** key (Dashboard → API Keys). |
   | `EXPO_PUBLIC_API_BASE_URL` | Base URL of the Worker **as the device sees it** (see [Physical devices and `localhost`](#3-physical-devices-and-localhost) below). |

`EXPO_PUBLIC_*` values are embedded when Metro bundles the app. After you change `.env`, restart Metro; if something still looks stale, clear the cache:

```bash
npx expo start --dev-client -c
```

## 2. Cloudflare Worker (local API)

The mobile app talks to the Worker for sync (`POST /sync/pull_changes`, `POST /sync/push_changes`). For local testing you run Wrangler on your PC.

1. **Neon Postgres** — Create a project in the [Neon console](https://console.neon.tech/) and copy the **pooled** connection string.

2. **Apply the schema** (from repo root or any path; adjust the connection string):

   ```bash
   psql "postgresql://USER:PASSWORD@HOST/DB?sslmode=require" -f workers/sql/schema.sql
   ```

3. **Clerk** — In the [Clerk Dashboard](https://dashboard.clerk.com/), create an application and copy the **publishable** key (into the Expo `.env` above) and the **secret** key (into Worker dev vars below).

4. **Worker secrets for local dev** — In `workers/`:

   ```bash
   cd workers
   cp .dev.vars.example .dev.vars
   ```

   Edit `workers/.dev.vars` and set:

   - `CLERK_SECRET_KEY` — Clerk secret key.
   - `DATABASE_URL` — Neon pooled URL (same style as production Worker secrets).

5. **Install worker dependencies and start Wrangler:**

   ```bash
   cd workers
   pnpm install
   pnpm run dev
   ```

   By default the Worker listens at **`http://127.0.0.1:8787`**. That URL is correct for **simulators running on the same machine** if you point `EXPO_PUBLIC_API_BASE_URL` at `http://127.0.0.1:8787` or `http://localhost:8787`.

### Listening on your LAN (phones on Wi‑Fi)

Phones on the same Wi‑Fi network **cannot** reach `localhost` on your PC. Bind Wrangler to all interfaces:

```bash
cd workers
pnpm run dev:lan
```

(`dev:lan` is `wrangler dev --ip 0.0.0.0 --port 8787` in [workers/package.json](../workers/package.json).)

Then set `EXPO_PUBLIC_API_BASE_URL` to `http://YOUR_LAN_IP:8787` (example: `http://192.168.1.50:8787`). Find your LAN IP:

- **Windows:** `ipconfig` (IPv4 address of your active Wi‑Fi / Ethernet adapter).
- **macOS:** System Settings → Network, or `ipconfig getifaddr en0`.

Allow **inbound TCP 8787** on the host firewall if sync fails only from the phone.

## 3. Physical devices and `localhost`

| Scenario | API base URL (`EXPO_PUBLIC_API_BASE_URL`) | Worker command |
|----------|---------------------------------------------|----------------|
| iOS Simulator / Android Emulator on same PC | `http://127.0.0.1:8787` | `pnpm run dev` |
| Physical device on **Wi‑Fi** | `http://<PC_LAN_IP>:8787` | `pnpm run dev:lan` from `workers/` |
| Physical **Android** on **USB** (optional) | `http://127.0.0.1:8787` after port reverse | `pnpm run dev`, plus `adb reverse tcp:8787 tcp:8787` |

### Android USB port reverse

With the device connected over USB and USB debugging on:

```bash
adb reverse tcp:8787 tcp:8787
```

Then the phone can use `http://127.0.0.1:8787` for the Worker **without** exposing the Worker to Wi‑Fi and without relying on HTTP cleartext to a LAN IP.

### iOS and Android: HTTP to a LAN IP

The app [app.json](../app.json) enables:

- **iOS:** `NSAppTransportSecurity` / `NSAllowsLocalNetworking` so HTTP to devices on your local network is allowed (for dev).
- **Android:** `usesCleartextTraffic` so HTTP (e.g. `http://192.168.x.x:8787`) is allowed.

For **production**, point `EXPO_PUBLIC_API_BASE_URL` at your **HTTPS** Worker URL and tighten or remove these settings per your security policy.

### Clerk dashboard

Add any **sign-in redirect / allowed origins** your dev flow uses (custom dev client scheme, Expo dev URLs, or tunnel URLs). Wrong redirect URLs usually show up as auth failures after the Clerk UI, not as silent network errors.

### HTTPS tunnel (optional)

If you cannot open LAN ports or use `adb reverse`, you can expose the local Worker with a tunnel (e.g. Wrangler `--tunnel`, Cloudflare Tunnel, or ngrok) and set `EXPO_PUBLIC_API_BASE_URL` to the HTTPS URL. This repo does not ship `eas.json`; EAS-based workflows are optional for later.

## 4. Run order (typical session)

1. **Terminal A — Worker**

   ```bash
   cd workers
   pnpm run dev
   ```

   For a physical device on Wi‑Fi, use `pnpm run dev:lan` from `workers/` (see [Listening on your LAN](#listening-on-your-lan-phones-on-wi-fi)).

2. **Terminal B — Metro (repo root)**

   ```bash
   pnpm start
   ```

   This runs `expo start --dev-client` ([package.json](../package.json)).

3. **Install / open the dev client**

   - **First time** (or after native dependency changes):

     ```bash
     pnpm run ios      # Xcode simulator or connected iPhone
     pnpm run android  # emulator or connected Android device
     ```

   - **Later:** open the **SN Cert Prep (Unofficial)** dev client on the device; connect to Metro via the QR code (same LAN) or USB, per Expo’s prompts.

Ensure the device and PC share the **same network** when using LAN URLs (unless you use USB + `adb reverse` for Android).

## 5. Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| Sync or API calls fail from phone only | `EXPO_PUBLIC_API_BASE_URL` must be reachable from the **phone** (LAN IP or `127.0.0.1` + `adb reverse`), not only `localhost` on the PC. |
| Connection refused on port 8787 | Wrangler running? For Wi‑Fi phones use `pnpm run dev:lan` from `workers/`. Host firewall allowing 8787? |
| Android HTTP errors to LAN IP | Cleartext / network security — [app.json](../app.json) sets `usesCleartextTraffic` for dev; use HTTPS in production. |
| iOS HTTP errors to LAN IP | ATS — [app.json](../app.json) sets `NSAllowsLocalNetworking`. |
| Metro not loading JS on device | Same Wi‑Fi as PC; try Expo tunnel mode; on Windows, set `REACT_NATIVE_PACKAGER_HOSTNAME` to your LAN IP so the device can reach Metro ([Expo: troubleshooting connections](https://docs.expo.dev/more/expo-cli/#tunneling)). |
| Clerk errors after sign-in | Redirect URLs / authorized domains in Clerk Dashboard. |

## 6. Quick reference commands

```bash
# Repo root
pnpm install
cp .env.example .env   # then edit .env

# Worker
cd workers
pnpm install
cp .dev.vars.example .dev.vars   # then edit .dev.vars
pnpm run dev                     # http://127.0.0.1:8787 — simulators / same machine
# pnpm run dev:lan               # optional: bind 0.0.0.0 for physical device on Wi‑Fi

# Metro + dev client entry
cd ..   # back to repo root
pnpm start

# Install native dev client (pick one)
pnpm run ios
pnpm run android
```

For more architecture context, see [design.md](../design.md) and [README.md](../README.md).
