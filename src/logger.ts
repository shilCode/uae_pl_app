/**
 * Simple timestamped logger
 */
export function log(message: string): void {
  const now = new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Dubai', // UAE timezone
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  console.log(`[${now}] ${message}`);
}

export function logSuccess(message: string): void {
  log(`✅ ${message}`);
}

export function logError(message: string): void {
  log(`❌ ${message}`);
}

export function logInfo(message: string): void {
  log(`ℹ️  ${message}`);
}

export function logWarn(message: string): void {
  log(`⚠️  ${message}`);
}

export function logSeparator(): void {
  console.log('═'.repeat(60));
}
