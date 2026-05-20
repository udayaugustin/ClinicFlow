// Firebase Admin SDK — server-side push notification sender
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { db } from './db';
import { deviceTokens } from '../shared/schema';
import { eq } from 'drizzle-orm';

let adminApp: App | null = null;

function getAdminApp(): App | null {
  if (adminApp) return adminApp;
  try {
    // Try both dist/server/ (production) and server/ (development) locations
    const candidates = [
      resolve(process.cwd(), 'server', 'firebase-service-account.json'),
      resolve(process.cwd(), 'dist', 'firebase-service-account.json'),
    ];
    const keyPath = candidates.find(p => existsSync(p));
    if (!keyPath) {
      console.warn('firebase-service-account.json not found — push notifications disabled');
      return null;
    }
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
    if (getApps().length === 0) {
      adminApp = initializeApp({ credential: cert(serviceAccount) });
    } else {
      adminApp = getApps()[0];
    }
    return adminApp;
  } catch {
    console.warn('Firebase Admin init failed — push notifications disabled');
    return null;
  }
}

export async function sendPushToUser(
  userId: number,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<void> {
  const app = getAdminApp();
  if (!app) return;

  try {
    const tokens = await db.select().from(deviceTokens).where(eq(deviceTokens.userId, userId));
    if (!tokens.length) return;

    const messaging = getMessaging(app);
    const response = await messaging.sendEachForMulticast({
      tokens: tokens.map(t => t.token),
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'appointments' },
      },
    });

    // Remove only tokens that are permanently invalid (not temporary failures)
    const permanentlyInvalidCodes = [
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
    ];
    const invalidTokens = response.responses
      .map((r, i) => {
        if (r.success) return null;
        const code = (r.error as any)?.code;
        return permanentlyInvalidCodes.includes(code) ? tokens[i].token : null;
      })
      .filter(Boolean) as string[];

    if (invalidTokens.length > 0) {
      for (const token of invalidTokens) {
        await db.delete(deviceTokens).where(eq(deviceTokens.token, token));
      }
    }
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
}
