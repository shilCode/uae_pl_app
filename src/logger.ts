import fs from 'fs';
import path from 'path';

// Create logs directory and log file on startup
const logsDir = path.resolve('logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const logFilePath = path.join(logsDir, `run-${timestamp}.log`);
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

console.log(`📝 Logging to: ${logFilePath}`);

function writeToFile(message: string): void {
  logStream.write(message + '\n');
}

/**
 * Simple timestamped logger — writes to both console and log file
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
  const line = `[${now}] ${message}`;
  console.log(line);
  writeToFile(line);
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
  const line = '═'.repeat(60);
  console.log(line);
  writeToFile(line);
}
