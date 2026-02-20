import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const DEBUG = process.env.CAPTCHA_DEBUG === 'true';
const MAX_OCR_ATTEMPTS = 3; // Try refreshing CAPTCHA this many times

/**
 * Preprocess the CAPTCHA image to improve OCR accuracy:
 * 1. Convert to grayscale
 * 2. Increase contrast
 * 3. Apply threshold (binarize) to isolate text from noisy background
 * 4. Resize to make text bigger
 * 5. Invert if needed (dark text on light bg → black text on white bg)
 */
async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  // Step 1: Convert to grayscale, sharpen, and increase size
  const processed = await sharp(imageBuffer)
    .grayscale()
    .resize({ width: 400, fit: 'inside' }) // Scale up for better OCR
    .sharpen({ sigma: 2 })
    .normalize() // Auto contrast
    .threshold(140) // Binarize: pixels < 140 → black, >= 140 → white
    .negate() // Invert: we want black text on white background
    .toBuffer();

  if (DEBUG) {
    const debugDir = path.resolve('screenshots/captcha-debug');
    if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
    const debugPath = path.join(debugDir, `preprocessed-${Date.now()}.png`);
    await sharp(processed).toFile(debugPath);
    console.log(`[CAPTCHA DEBUG] Preprocessed image saved: ${debugPath}`);
  }

  return processed;
}

/**
 * Run OCR on the preprocessed image and clean up the result
 */
async function runOCR(imageBuffer: Buffer): Promise<string> {
  const result = await Tesseract.recognize(imageBuffer, 'eng', {
    ...(DEBUG ? { logger: (m: any) => console.log(`[OCR] ${m.status}: ${(m.progress * 100).toFixed(0)}%`) } : {}),
  });

  let text = result.data.text.trim();

  // Clean up common OCR issues
  text = text
    .replace(/\s+/g, '')     // Remove all whitespace
    .replace(/[^\w#+\-]/g, '') // Keep only alphanumeric, #, +, -
    .substring(0, 6);         // CAPTCHAs are typically 4 chars, allow a bit extra

  if (DEBUG) {
    console.log(`[CAPTCHA DEBUG] Raw OCR: "${result.data.text.trim()}" → Cleaned: "${text}" (confidence: ${result.data.confidence}%)`);
  }

  return text;
}

/**
 * Try multiple preprocessing strategies and pick the best result
 */
async function solveWithMultipleStrategies(imageBuffer: Buffer): Promise<string> {
  const strategies = [
    { threshold: 140, negate: true, label: 'threshold-140-neg' },
    { threshold: 120, negate: true, label: 'threshold-120-neg' },
    { threshold: 160, negate: true, label: 'threshold-160-neg' },
    { threshold: 140, negate: false, label: 'threshold-140' },
    { threshold: 100, negate: true, label: 'threshold-100-neg' },
  ];

  let bestResult = '';
  let bestConfidence = 0;

  for (const strategy of strategies) {
    try {
      let pipeline = sharp(imageBuffer)
        .grayscale()
        .resize({ width: 400, fit: 'inside' })
        .sharpen({ sigma: 2 })
        .normalize()
        .threshold(strategy.threshold);

      if (strategy.negate) {
        pipeline = pipeline.negate();
      }

      const processed = await pipeline.toBuffer();
      const result = await Tesseract.recognize(processed, 'eng');

      const text = result.data.text.trim()
        .replace(/\s+/g, '')
        .replace(/[^\w#+\-]/g, '')
        .substring(0, 6);

      const confidence = result.data.confidence;

      if (DEBUG) {
        console.log(`[CAPTCHA DEBUG] Strategy "${strategy.label}": "${text}" (confidence: ${confidence}%)`);
      }

      // Prefer results that are 4 chars (typical CAPTCHA length) and have higher confidence
      const score = (text.length >= 3 && text.length <= 5 ? 100 : 0) + confidence;

      if (score > bestConfidence && text.length >= 3) {
        bestResult = text;
        bestConfidence = score;
      }
    } catch {
      // Skip failed strategy
    }
  }

  return bestResult;
}

/**
 * Main CAPTCHA solver: takes a screenshot buffer and returns the CAPTCHA text
 */
export async function solveCaptcha(imageBuffer: Buffer): Promise<string> {
  console.log('[CAPTCHA] Attempting to solve CAPTCHA with OCR...');

  // Try multi-strategy approach
  const result = await solveWithMultipleStrategies(imageBuffer);

  if (result.length >= 3) {
    console.log(`[CAPTCHA] Solved: "${result}"`);
    return result;
  }

  // Fallback: try with simple preprocessing
  const preprocessed = await preprocessImage(imageBuffer);
  const fallback = await runOCR(preprocessed);

  if (fallback.length >= 3) {
    console.log(`[CAPTCHA] Solved (fallback): "${fallback}"`);
    return fallback;
  }

  console.log(`[CAPTCHA] Could not solve CAPTCHA reliably (got: "${result || fallback}")`);
  return result || fallback;
}
