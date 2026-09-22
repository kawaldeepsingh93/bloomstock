import type { AiRecommendation, Profile } from '@bloomstock/core';
import { createLogger } from '@bloomstock/shared';
import { formatMorningBrief, shouldNotify } from './format';

const log = createLogger('notifications');

export interface NotificationGateway {
  sendTelegram(chatId: string, body: string): Promise<void>;
  sendWhatsApp(to: string, body: string): Promise<void>;
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

export class HttpNotificationGateway implements NotificationGateway {
  async sendTelegram(chatId: string, body: string): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: body }),
    });
  }

  async sendWhatsApp(to: string, body: string): Promise<void> {
    const token = process.env.WHATSAPP_API_TOKEN;
    const from = process.env.WHATSAPP_FROM;
    if (!token || !from) return;
    await fetch('https://graph.facebook.com/v20.0/messages', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from, to, text: { body } }),
    });
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.ALERT_FROM_EMAIL;
    if (!key || !from) return;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text: body }),
    });
  }
}

export async function dispatchMorningAlerts(
  profile: Profile,
  picks: AiRecommendation[],
  gateway: NotificationGateway,
): Promise<void> {
  if (!shouldNotify(profile)) return;
  const body = formatMorningBrief(picks);
  if (profile.notifyTelegram && profile.telegramChatId) {
    await gateway.sendTelegram(profile.telegramChatId, body);
  }
  if (profile.notifyWhatsapp && profile.whatsappNumber) {
    await gateway.sendWhatsApp(profile.whatsappNumber, body);
  }
  if (profile.notifyEmail) {
    await gateway.sendEmail(profile.email, 'BloomStock morning brief', body);
  }
  log.info('Dispatched morning alerts', { userId: profile.id, picks: picks.length });
}
