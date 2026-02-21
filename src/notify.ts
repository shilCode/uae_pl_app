import { execSync } from "child_process";
import https from "https";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

/**
 * Send a desktop notification (cross-platform: Windows + macOS)
 */
export function sendDesktopNotification(title: string, message: string): void {
  try {
    // Strip emojis and special unicode for PowerShell compatibility
    const sanitize = (s: string) =>
      s.replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{2B55}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
       .replace(/[\r\n]+/g, ' ')  // Replace newlines with spaces
       .replace(/'/g, "''")       // Escape single quotes for PowerShell
       .trim();

    const escapedTitle = sanitize(title);
    const escapedMessage = sanitize(message);
    if (process.platform === "win32") {
      execSync(
        `powershell -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $notify = New-Object System.Windows.Forms.NotifyIcon; $notify.Icon = [System.Drawing.SystemIcons]::Information; $notify.Visible = $true; $notify.ShowBalloonTip(5000, '${escapedTitle}', '${escapedMessage}', 'Info'); Start-Sleep -Seconds 2; $notify.Dispose()"`,
        { timeout: 10000 },
      );
    } else {
      const macTitle = title.replace(/"/g, '\\"');
      const macMessage = message.replace(/"/g, '\\"');
      execSync(
        `osascript -e 'display notification "${macMessage}" with title "${macTitle}" sound name "Glass"'`,
      );
    }
    console.log(`Notification sent: ${title}`);
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}

/**
 * Send a Telegram message via Bot API
 */
export async function sendTelegramMessage(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log(
      "⚠️  Telegram not configured (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env)",
    );
    return;
  }

  const payload = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "HTML",
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            console.log("📱 Telegram notification sent");
          } else {
            console.error(`Telegram API error (${res.statusCode}): ${data}`);
          }
          resolve();
        });
      },
    );
    req.on("error", (err) => {
      console.error("Failed to send Telegram message:", err.message);
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
 * Play an alert sound repeatedly to grab attention (cross-platform)
 */
export function playAlertSound(times: number = 5): void {
  try {
    if (process.platform === "win32") {
      for (let i = 0; i < times; i++) {
        execSync(
          'powershell -Command "[System.Media.SystemSounds]::Exclamation.Play(); Start-Sleep -Milliseconds 600"',
          { timeout: 5000 },
        );
      }
    } else {
      for (let i = 0; i < times; i++) {
        execSync("afplay /System/Library/Sounds/Glass.aiff");
      }
    }
  } catch (err) {
    console.error("Failed to play sound:", err);
  }
}

/**
 * Say a message using text-to-speech (cross-platform)
 * Say a message using text-to-speech (cross-platform)
 */
export function speakMessage(message: string): void {
  try {
    const escaped = message.replace(/'/g, "''");
    if (process.platform === "win32") {
      // Use try/catch inside PowerShell to handle missing audio device gracefully
      execSync(
        `powershell -Command "try { Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak('${escaped}') } catch { Write-Host 'Speech unavailable' }"`,
        { timeout: 30000 },
      );
    } else {
      execSync(`say "${escaped.replace(/'/g, "\\'")}"`)
    }
  } catch (err) {
    // Silently ignore speech errors (e.g. no audio device on server)
    console.warn("Speech unavailable:", (err as Error).message?.substring(0, 100) || err);
  }
}
