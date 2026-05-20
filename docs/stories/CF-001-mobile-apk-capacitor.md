# User Story: Mobile APK — Capacitor Integration for Android

**Story ID:** CF-001
**Epic:** Mobile App
**Feature:** Wrap the existing ClinicFlow React + Vite web app into a native Android APK using Capacitor, with native geolocation and Firebase Cloud Messaging push notifications
**Priority:** P1 (High)
**Effort:** 4 days (32 hours)
**Sprint:** Mobile Phase 1
**Status:** Ready for Development
**Depends On:** None

---

## Story Overview

**As a** patient
**I want** to install ClinicFlow as a native Android app
**So that** I can access appointment management, nearby clinics, and receive push notifications without opening a browser

**As a** clinic administrator
**I want** patients to receive push notifications on their phones when their token is called or appointment status changes
**So that** patients do not miss their turn and clinic flow runs smoothly

---

## Why This Feature?

### Current Gap:
- ClinicFlow is browser-only — patients must remember to keep a tab open to receive in-app notification polling
- The current `NotificationPopover` (`client/src/components/notifications/notification-popover.tsx`) polls the API on an interval; it stops working when the browser tab is closed or the phone screen locks
- The `useGeolocation` hook (`client/src/hooks/use-geolocation.tsx`) relies on `navigator.geolocation` which is less accurate and less reliable than native GPS on mobile
- There is no installable app experience — no home screen icon, no splash screen, no offline shell

### Real-World Use Case (Patient Waiting at Clinic):
A patient books token #5 at Fortis Malar Hospital and goes to sit in the car park. They close the browser. When token #4 is called, no notification reaches them. They miss their turn and have to re-queue.

- Patient books token via ClinicFlow web
- Patient closes browser / locks phone
- Token status changes on the server
- No push notification fires — patient misses turn

This cannot be done with the current browser-polling implementation.

### Solution:
Integrate Capacitor to package the existing React app as an Android APK with:
- **Native push notifications** — Firebase Cloud Messaging via `@capacitor-firebase/messaging`, wired into the existing notification system
- **Native geolocation** — `@capacitor/geolocation` plugin replaces `navigator.geolocation` for better GPS accuracy on mobile
- **Installable APK** — signed release build ready for Play Store or direct APK distribution
- **Backward compatible** — web browser experience unchanged; Capacitor plugins fall back to browser APIs on non-native platforms

---

## User Personas

### Primary: Ravi — The Waiting Patient
- **Role:** Patient with a booked appointment who leaves the waiting area
- **Goal:** Get notified the moment his token is called so he can return in time
- **Pain Point:** "I keep the browser open but my phone screen locks and I miss my token"

### Secondary: Priya — The Clinic Attender
- **Role:** Attender managing the queue at the front desk
- **Goal:** Reduce patient no-shows caused by missed turn notifications
- **Pain Point:** "Patients come back 10 minutes late because they didn't know their token was called"

---

## Detailed Sub-Stories

### Sub-Story 1: Capacitor Setup and Android Project Initialisation

**Story ID:** CF-001.1
**Points:** 3 | **Effort:** 4 hours

```gherkin
As a developer
I want Capacitor installed and an Android project generated
So that the React + Vite build can be packaged into an APK
```

Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`. Create `capacitor.config.ts` pointing `webDir` to `dist/public` (the Vite build output). Run `npx cap add android` to scaffold the Android project. Adjust `vite.config.ts` to use `base: './'` so asset paths are relative inside the WebView.

---

### Sub-Story 2: Native Geolocation Plugin

**Story ID:** CF-001.2
**Points:** 3 | **Effort:** 4 hours

```gherkin
As a patient using the Android app
I want the app to use native GPS for finding nearby clinics
So that my location is detected faster and more accurately than the browser API
```

Install `@capacitor/geolocation`. Update `client/src/hooks/use-geolocation.tsx` to detect whether the app is running natively (`Capacitor.isNativePlatform()`) and use `Geolocation.getCurrentPosition()` from Capacitor instead of `navigator.geolocation`. On web, retain the existing browser implementation unchanged.

---

### Sub-Story 3: Firebase Cloud Messaging — Token Registration

**Story ID:** CF-001.3
**Points:** 5 | **Effort:** 6 hours

```gherkin
As a patient
I want the app to register my device for push notifications on login
So that the server can send me targeted notifications when my appointment status changes
```

Install `@capacitor-firebase/messaging`. On successful login, call `FirebaseMessaging.getToken()` and POST the FCM token to a new endpoint `POST /api/notifications/register-token`. Add a `device_tokens` table (columns: `id`, `user_id`, `token`, `platform`, `created_at`) to `shared/schema.ts`. Add the route handler in `server/routes.ts`.

---

### Sub-Story 4: Push Notification Delivery and Foreground Handling

**Story ID:** CF-001.4
**Points:** 5 | **Effort:** 8 hours

```gherkin
As a patient
I want to receive a push notification when my appointment token is called or status changes
So that I am alerted even when the app is in the background or the screen is locked
```

On the server side, when an appointment status changes (existing logic in `server/storage.ts`), look up the patient's FCM tokens from `device_tokens` and send via Firebase Admin SDK. On the client, register `FirebaseMessaging.addListener('notificationReceived', ...)` to inject foreground messages into the existing `NotificationPopover` query cache. On notification tap (`pushNotificationActionPerformed`), navigate to `/appointments`.

---

### Sub-Story 5: APK Signing and Release Build

**Story ID:** CF-001.5
**Points:** 3 | **Effort:** 4 hours

```gherkin
As a developer
I want a signed release APK generated from the Capacitor Android project
So that it can be distributed via Play Store or direct APK download
```

Generate a keystore file using `keytool`. Configure `android/app/build.gradle` with signing config. Add an `npm run build:android` script that runs `vite build && npx cap sync && npx cap build android` to produce a signed APK in `android/app/build/outputs/apk/release/`.

---

### Sub-Story 6: App Icon, Splash Screen, and Play Store Metadata

**Story ID:** CF-001.6
**Points:** 2 | **Effort:** 4 hours

```gherkin
As a patient
I want to see the Clinik logo on the app icon and splash screen
So that the app feels native and branded when I install it
```

Use `@capacitor/assets` to generate all required icon and splash screen sizes from `client/public/logo.svg`. Update `android/app/src/main/res/` with generated assets. Fill in `android/app/src/main/AndroidManifest.xml` with app name, permissions (`ACCESS_FINE_LOCATION`, `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`), and deep link intent filters for `clinikapp://`.

---

## Acceptance Criteria

### AC1: Capacitor WebView renders the app correctly
```gherkin
GIVEN the Android APK is installed on a device
WHEN the app is launched
THEN the full ClinicFlow React UI renders inside the WebView
AND all routes (login, patient dashboard, appointments) are navigable
```

### AC2: Native geolocation works on Android
```gherkin
GIVEN a patient is logged in on the Android app
WHEN the patient opens the Find Healthcare page
THEN the app requests Android location permission via a native dialog
AND nearby clinics are fetched using the device's GPS coordinates
```

### AC3: Browser geolocation is unchanged on web
```gherkin
GIVEN a patient accesses ClinicFlow via a desktop browser
WHEN the nearby clinics page loads
THEN the existing navigator.geolocation flow is used
AND no Capacitor plugin code is invoked
```

### AC4: FCM token is registered on login
```gherkin
GIVEN a patient logs in on the Android app for the first time
WHEN the session is established
THEN the app calls POST /api/notifications/register-token with the FCM token and platform "android"
AND the token is stored in the device_tokens table linked to the user
```

### AC5: Push notification received when token is called
```gherkin
GIVEN a patient has a scheduled appointment with token #3
AND the app is in the background or screen is locked
WHEN the attender marks token #2 as complete
THEN the patient receives a push notification "Your turn is next — Token #3"
AND the notification appears in the Android notification tray
```

### AC6: Tapping a notification navigates to appointments
```gherkin
GIVEN a push notification has been delivered to the patient's device
WHEN the patient taps the notification
THEN the app opens and navigates to /appointments
AND the relevant appointment is visible at the top of the list
```

### AC7: Foreground notification injected into NotificationPopover
```gherkin
GIVEN a patient has the Android app open in the foreground
WHEN a push notification arrives
THEN the NotificationPopover bell icon shows an updated unread count
AND the notification appears in the popover list without a page refresh
```

### AC8: Signed APK builds successfully
```gherkin
GIVEN the keystore and signing config are in place
WHEN npm run build:android is executed
THEN a signed release APK is produced at android/app/build/outputs/apk/release/app-release.apk
AND the APK installs on an Android device without security warnings
```

### AC9: App icon and splash screen show Clinik branding
```gherkin
GIVEN the APK is installed on an Android device
WHEN the app icon is viewed on the home screen
THEN it shows the Clinik logo
AND launching the app shows the branded splash screen before the WebView loads
```

### AC10: Stale or duplicate FCM tokens are not stored
```gherkin
GIVEN a patient logs in on a device where a token is already registered
WHEN POST /api/notifications/register-token is called with the same token
THEN the existing record is updated (upsert) rather than creating a duplicate
```

---

## Technical Implementation

### Part 1: Capacitor Setup (4 hours)

#### Task 1.1: Install dependencies

**File:** `package.json`

Add to `dependencies`:

```json
"@capacitor/core": "^6.0.0",
"@capacitor/android": "^6.0.0",
"@capacitor/geolocation": "^6.0.0",
"@capacitor-firebase/messaging": "^6.0.0"
```

Add to `devDependencies`:

```json
"@capacitor/cli": "^6.0.0",
"@capacitor/assets": "^3.0.0"
```

Add to `scripts`:

```json
"build:android": "vite build && npx cap sync && npx cap build android"
```

#### Task 1.2: Create Capacitor config

**File:** `capacitor.config.ts` (NEW)

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wisright.clinikflow',
  appName: 'Clinik',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Geolocation: {
      requestPermissions: true,
    },
  },
};

export default config;
```

#### Task 1.3: Adjust Vite base path for WebView

**File:** `vite.config.ts`

```typescript
export default defineConfig({
  // ...existing config
  base: process.env.CAPACITOR_BUILD ? './' : '/',
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
  },
});
```

---

### Part 2: Native Geolocation (4 hours)

#### Task 2.1: Update useGeolocation hook

**File:** `client/src/hooks/use-geolocation.tsx`

```typescript
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// Inside useGeolocation, replace the requestLocation callback:
const requestLocation = useCallback(async () => {
  if (Capacitor.isNativePlatform()) {
    const permission = await Geolocation.requestPermissions();
    if (permission.location !== 'granted') {
      setState(prev => ({ ...prev, status: 'denied', error: 'Location permission denied' }));
      return;
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 30000,
    });
    setState(prev => ({
      ...prev,
      status: 'granted',
      position: pos as unknown as GeolocationPosition,
      bestPosition: pos as unknown as GeolocationPosition,
    }));
  } else {
    // Existing navigator.geolocation implementation unchanged
    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, geoOptions);
  }
}, []);
```

---

### Part 3: FCM Token Registration (6 hours)

#### Task 3.1: Add device_tokens table

**File:** `shared/schema.ts`

```typescript
export const deviceTokens = pgTable('device_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  platform: varchar('platform', { length: 20 }).notNull().default('android'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

#### Task 3.2: Register token endpoint

**File:** `server/routes.ts`

```typescript
app.post('/api/notifications/register-token', async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { token, platform } = req.body;
  if (!token) return res.status(400).json({ message: 'token is required' });

  await db.insert(deviceTokens)
    .values({ userId: req.user.id, token, platform: platform || 'android' })
    .onConflictDoUpdate({
      target: deviceTokens.token,
      set: { userId: req.user.id, createdAt: new Date() },
    });

  res.json({ success: true });
});
```

#### Task 3.3: Call registration on login

**File:** `client/src/lib/firebase.ts`

```typescript
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';

export async function registerFcmToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { token } = await FirebaseMessaging.getToken();
  await fetch('/api/notifications/register-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
  });
}
```

---

### Part 4: Push Notification Delivery (8 hours)

#### Task 4.1: Server-side FCM send on status change

**File:** `server/storage.ts`

When appointment status changes (existing update logic), add after the DB update:

```typescript
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

async function sendPushToPatient(userId: number, title: string, body: string) {
  const tokens = await db.select().from(deviceTokens).where(eq(deviceTokens.userId, userId));
  if (!tokens.length) return;

  const messaging = getMessaging();
  await messaging.sendEachForMulticast({
    tokens: tokens.map(t => t.token),
    notification: { title, body },
    data: { route: '/appointments' },
  });
}
```

#### Task 4.2: Foreground notification listener

**File:** `client/src/components/notifications/notification-popover.tsx`

```typescript
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';

// Inside NotificationPopover, add useEffect:
useEffect(() => {
  if (!Capacitor.isNativePlatform()) return;

  const listener = FirebaseMessaging.addListener('notificationReceived', () => {
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
  });

  const tapListener = FirebaseMessaging.addListener('pushNotificationActionPerformed', () => {
    navigate('/appointments');
  });

  return () => {
    listener.then(l => l.remove());
    tapListener.then(l => l.remove());
  };
}, [queryClient]);
```

---

### Part 5: APK Signing (4 hours)

#### Task 5.1: Keystore and build.gradle signing config

**File:** `android/app/build.gradle`

```groovy
android {
  signingConfigs {
    release {
      storeFile file(System.getenv('KEYSTORE_PATH') ?: 'clinik-release.keystore')
      storePassword System.getenv('KEYSTORE_PASSWORD')
      keyAlias System.getenv('KEY_ALIAS')
      keyPassword System.getenv('KEY_PASSWORD')
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled false
    }
  }
}
```

---

### Part 6: App Icon and Splash Screen (4 hours)

#### Task 6.1: Generate assets from logo

```bash
npx @capacitor/assets generate --iconBackgroundColor '#ffffff' --splashBackgroundColor '#ffffff'
```

Source file: `client/public/logo.svg`
Output: `android/app/src/main/res/mipmap-*/` (all density variants)

#### Task 6.2: Android permissions

**File:** `android/app/src/main/AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

---

## File Summary

| File | Action | Approximate Lines |
|------|--------|-------------------|
| `package.json` | Modify — add Capacitor deps and build script | +12 lines |
| `capacitor.config.ts` | **NEW** | ~20 lines |
| `vite.config.ts` | Modify — add conditional base path | +3 lines |
| `shared/schema.ts` | Modify — add `deviceTokens` table | +10 lines |
| `server/routes.ts` | Modify — add `POST /api/notifications/register-token` | +15 lines |
| `server/storage.ts` | Modify — add `sendPushToPatient` helper, call on status change | +30 lines |
| `client/src/hooks/use-geolocation.tsx` | Modify — add Capacitor native path | +25 lines |
| `client/src/lib/firebase.ts` | Modify — add `registerFcmToken` using FCM plugin | +20 lines |
| `client/src/components/notifications/notification-popover.tsx` | Modify — foreground + tap listeners | +20 lines |
| `android/` | **NEW** (generated by `npx cap add android`) | ~500 files (scaffolded) |
| `android/app/build.gradle` | Modify — signing config | +15 lines |
| `android/app/src/main/AndroidManifest.xml` | Modify — permissions + intent filters | +10 lines |

**Backend changes required:** `device_tokens` table (new), `POST /api/notifications/register-token` endpoint, Firebase Admin SDK for server-side push delivery.

---

## UI Test Setup

| Field | Value |
|-------|-------|
| **App URL** | http://localhost:5001 |
| **Test Route** | `/` (patient dashboard), `/map`, `/appointments` |
| **Login as** | Patient — use existing test patient credentials |
| **Test Data** | Requires at least one clinic with latitude/longitude, one scheduled appointment with token number |
| **Non-testable ACs** | AC4 (FCM token DB insert — verify via DB query), AC8 (APK build — requires Android Studio), AC10 (upsert — verify via duplicate login attempt + DB row count) |
