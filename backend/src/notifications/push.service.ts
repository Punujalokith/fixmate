import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { existsSync, readFileSync } from 'node:fs';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

const isExpoToken = (token: string) => /^Expo(nent)?PushToken\[.+\]$/.test(token);

/**
 * Sends push notifications to phones.
 * - Expo push tokens ("ExponentPushToken[...]") go through Expo's free push service.
 * - Raw FCM tokens go through Firebase Admin (needs FIREBASE_SERVICE_ACCOUNT_PATH).
 * - Without Firebase configured, FCM pushes are only logged (handy in development).
 * Returns the tokens that are no longer valid so the caller can delete them.
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private firebase?: App;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const path = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    if (!path) {
      this.logger.log('Firebase not configured: FCM pushes will be logged only');
      return;
    }
    if (!existsSync(path)) {
      this.logger.warn(`FIREBASE_SERVICE_ACCOUNT_PATH not found: ${path}`);
      return;
    }
    const credentials = JSON.parse(readFileSync(path, 'utf8'));
    this.firebase = getApps()[0] ?? initializeApp({ credential: cert(credentials) });
    this.logger.log('Firebase Cloud Messaging ready');
  }

  async send(tokens: string[], message: PushMessage): Promise<{ sent: number; invalidTokens: string[] }> {
    const expoTokens = tokens.filter(isExpoToken);
    const fcmTokens = tokens.filter((t) => !isExpoToken(t));
    const [expo, fcm] = await Promise.all([this.sendExpo(expoTokens, message), this.sendFcm(fcmTokens, message)]);
    return { sent: expo.sent + fcm.sent, invalidTokens: [...expo.invalidTokens, ...fcm.invalidTokens] };
  }

  private async sendFcm(tokens: string[], message: PushMessage) {
    if (!tokens.length) return { sent: 0, invalidTokens: [] };
    if (!this.firebase) {
      this.logger.log(`[dev push] to ${tokens.length} device(s): ${message.title} — ${message.body}`);
      return { sent: 0, invalidTokens: [] };
    }
    const result = await getMessaging(this.firebase).sendEachForMulticast({
      tokens,
      notification: { title: message.title, body: message.body },
      data: message.data,
      android: { priority: 'high', notification: { channelId: 'default' } },
    });
    const invalidTokens = result.responses.flatMap((r, i) =>
      !r.success &&
      ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.error?.code ?? '')
        ? [tokens[i]]
        : [],
    );
    return { sent: result.successCount, invalidTokens };
  }

  private async sendExpo(tokens: string[], message: PushMessage) {
    if (!tokens.length) return { sent: 0, invalidTokens: [] };
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        tokens.map((to) => ({ to, title: message.title, body: message.body, data: message.data, sound: 'default', channelId: 'default' })),
      ),
    });
    if (!response.ok) throw new Error(`Expo push failed with HTTP ${response.status}`);
    const { data } = (await response.json()) as { data: { status: string; details?: { error?: string } }[] };
    const invalidTokens = data.flatMap((ticket, i) =>
      ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' ? [tokens[i]] : [],
    );
    return { sent: data.filter((t) => t.status === 'ok').length, invalidTokens };
  }
}
