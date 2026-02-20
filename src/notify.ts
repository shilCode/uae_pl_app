import { execSync } from 'child_process';
import https from 'https';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

/**
 * Send a macOS desktop notification
 */
export function sendDesktopNotification(title: string, message: string): void {
  try {
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedMessage = message.replace(/"/g, '\\"');
    execSync(
      `osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}" sound name "Glass"'`
    );
    console.log(`🔔 Notification sent: ${title} - ${message}`);
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}

/**
 * Send a Telegram message via Bot API
 */
export async function sendTelegramMessage(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('⚠️  Telegram not configured (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env)');
    return;
  }

  const payload = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'HTML',
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('📱 Telegram notification sent');
          } else {
            console.error(`Telegram API error (${res.statusCode}): ${data}`);
          }
          resolve();
        });
      }
    );
    req.on('error', (err) => {
      console.error('Failed to send Telegram message:', err.message);
      resolve();
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Send ALL notifications (desktop + Telegram)
 */
export async function notifyAll(title: string, message: string): Promise<void> {
  sendDesktopNotification(title, message);
  await sendTelegramMessage(`<b>${title}</b>\n\n${message}`);
}

/**
 * Play an alert sound repeatedly to grab attention
 */
export function playAlertSound(times: number = 5): void {
  try {
    for (let i = 0; i < times; i++) {
      execSync('afplay /System/Library/Sounds/Glass.aiff');
    }
  } catch (err) {
    console.error('Failed to play sound:', err);
  }
}

/**
 * Say a message using macOS text-to-speech
 */
export function speakMessage(message: string): void {
  try {
    const escaped = message.replace(/"/g, '\\"');
    execSync(`say "${escaped}"`);
  } catch (err) {
    console.error('Failed to speak message:', err);
  }
}
