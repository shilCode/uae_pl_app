import { execSync } from 'child_process';

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
