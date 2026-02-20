import { execSync } from 'child_process';
import https from 'https';
import os from 'os';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

const IS_WINDOWS = os.platform() === 'win32';
const IS_MAC = os.platform() === 'darwin';

/**
 * Send a desktop notification (cross-platform: macOS + Windows)
 */
export function sendDesktopNotification(title: string, message: string): void {
  try {
    if (IS_MAC) {
      const escapedTitle = title.replace(/"/g, '\\"');
      const escapedMessage = message.replace(/"/g, '\\"');
      execSync(
        `osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}" sound name "Glass"'`
      );
    } else if (IS_WINDOWS) {
      // Use PowerShell toast notification on Windows
      const escapedTitle = title.replace(/'/g, "''");
      const escapedMessage = message.replace(/'/g, "''");
      const ps = `
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null;
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null;
        $xml = '<toast><visual><binding template="ToastText02"><text id="1">${escapedTitle}</text><text id="2">${escapedMessage}</text></binding></visual><audio src="ms-winsoundevent:Notification.Default"/></toast>';
        $XmlDoc = [Windows.Data.Xml.Dom.XmlDocument]::new();
        $XmlDoc.LoadXml($xml);
        $Toast = [Windows.UI.Notifications.ToastNotification]::new($XmlDoc);
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Appointment Checker').Show($Toast);
      `.replace(/\n/g, ' ');
      execSync(`powershell -Command "${ps}"`, { timeout: 10000 });
    } else {
      // Linux fallback: notify-send
      const escapedTitle = title.replace(/"/g, '\\"');
      const escapedMessage = message.replace(/"/g, '\\"');
      execSync(`notify-send "${escapedTitle}" "${escapedMessage}"`);
    }
    console.log(`🔔 Notification sent: ${title} - ${message}`);
  } catch (err) {
    // Fallback: just log to console (notification is non-critical)
    console.log(`🔔 [NOTIFICATION] ${title}: ${message}`);
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
 * Play an alert sound repeatedly to grab attention (cross-platform)
 */
export function playAlertSound(times: number = 5): void {
  try {
    for (let i = 0; i < times; i++) {
      if (IS_MAC) {
        execSync('afplay /System/Library/Sounds/Glass.aiff');
      } else if (IS_WINDOWS) {
        // Use PowerShell to play the Windows default beep sound
        execSync(
          'powershell -Command "[System.Media.SystemSounds]::Exclamation.Play(); Start-Sleep -Milliseconds 600"',
          { timeout: 5000 }
        );
      } else {
        // Linux fallback
        execSync('paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || echo -e "\\a"');
      }
    }
  } catch (err) {
    // Non-critical — just beep via console
    console.log('\x07'); // terminal bell character
    console.error('Failed to play sound:', err);
  }
}

/**
 * Say a message using text-to-speech (cross-platform)
 */
export function speakMessage(message: string): void {
  try {
    const escaped = message.replace(/"/g, '\\"');
    if (IS_MAC) {
      execSync(`say "${escaped}"`);
    } else if (IS_WINDOWS) {
      // Use PowerShell SAPI speech synthesizer on Windows
      const psEscaped = message.replace(/'/g, "''");
      execSync(
        `powershell -Command "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak('${psEscaped}')"`,
        { timeout: 30000 }
      );
    } else {
      // Linux fallback
      execSync(`espeak "${escaped}" 2>/dev/null || echo "TTS: ${escaped}"`);
    }
  } catch (err) {
    console.log(`🗣️ [TTS] ${message}`);
  }
}
