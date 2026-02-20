import { test, Page, Browser, BrowserContext, expect } from "@playwright/test";
import {
  sendDesktopNotification,
  notifyAll,
  playAlertSound,
  speakMessage,
} from "../src/notify";
import {
  log,
  logSuccess,
  logError,
  logInfo,
  logWarn,
  logSeparator,
} from "../src/logger";
import { solveCaptcha } from "../src/captcha-solver";
import Tesseract from "tesseract.js";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const CONSULATE_URL =
  process.env.CONSULATE_URL ||
  "https://secure.e-konsulat.gov.pl/placowki/200/wiza-krajowa/wizyty/weryfikacja-obrazkowa";

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "60000", 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || "500", 10);

// ── Form selections (configurable via .env) ──
const SERVICE_TYPE = process.env.SERVICE_TYPE || "Wiza krajowa";
const LOCATION = process.env.LOCATION || "Abu Zabi";
const NUM_PEOPLE = process.env.NUM_PEOPLE || "1 osob";

// Max OCR attempts before falling back to manual CAPTCHA
const MAX_CAPTCHA_ATTEMPTS = parseInt(
  process.env.MAX_CAPTCHA_ATTEMPTS || "3",
  10,
);

// Max time (ms) to spend on CAPTCHA before giving up and retrying the whole flow
const CAPTCHA_TIMEOUT_MS = parseInt(
  process.env.CAPTCHA_TIMEOUT_MS || "60000",
  10,
);

// ─────────────────────────────────────────────────────
// Helper: wait for a duration
// ─────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────
// Step 1: Navigate to CAPTCHA page
// ─────────────────────────────────────────────────────
async function navigateToCaptchaPage(page: Page): Promise<void> {
  logInfo("Navigating to captcha page...");
  await page.goto(CONSULATE_URL, { waitUntil: "networkidle", timeout: 30000 });
  logSuccess("Captcha page loaded");
}

// ─────────────────────────────────────────────────────
// Step 2a: Auto-solve CAPTCHA using OCR
// ─────────────────────────────────────────────────────
async function autoSolveCaptcha(page: Page): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_CAPTCHA_ATTEMPTS; attempt++) {
    logInfo(`CAPTCHA OCR attempt ${attempt}/${MAX_CAPTCHA_ATTEMPTS}...`);

    try {
      // Wait for the CAPTCHA image to load
      const captchaImg = page.getByRole("img", {
        name: "Weryfikacja obrazkowa",
      });
      await captchaImg.waitFor({ state: "visible", timeout: 10000 });
      await sleep(1000); // Ensure image is fully rendered

      // Take a screenshot of the CAPTCHA image
      const imageBuffer = await captchaImg.screenshot();

      // Run OCR
      const captchaText = await solveCaptcha(imageBuffer);

      if (!captchaText || captchaText.length < 3) {
        logWarn(
          `OCR returned too short result: "${captchaText}", refreshing...`,
        );
        // Click refresh to get a new CAPTCHA
        await page.getByRole("button", { name: "Odśwież" }).click();
        await sleep(2000);
        continue;
      }

      logInfo(`OCR result: "${captchaText}" — submitting...`);

      // Type the CAPTCHA text
      const textbox = page.getByRole("textbox", { name: /znaki/i });
      await textbox.fill(captchaText);
      await sleep(300);

      // Click "Dalej"
      await page.getByRole("button", { name: "Dalej" }).click();
      await sleep(2000);

      // Check if we passed the CAPTCHA (booking form appears)
      const formVisible = await page
        .locator("text=Rodzaj usługi")
        .isVisible()
        .catch(() => false);

      if (formVisible) {
        logSuccess(`CAPTCHA solved automatically! ("${captchaText}")`);
        return true;
      }

      // Check if CAPTCHA is still visible (means we failed)
      const captchaStillVisible = await captchaImg
        .isVisible()
        .catch(() => false);
      if (captchaStillVisible) {
        logWarn(`CAPTCHA answer "${captchaText}" was incorrect, refreshing...`);
        // The CAPTCHA may auto-refresh on failure, or we click Odśwież
        const refreshBtn = page.getByRole("button", { name: "Odśwież" });
        if (await refreshBtn.isVisible()) {
          await refreshBtn.click();
          await sleep(2000);
        }
        continue;
      }

      // If neither form nor captcha is visible, something unexpected happened
      logSuccess("CAPTCHA appears to be solved (page changed)");
      return true;
    } catch (error: any) {
      logWarn(`OCR attempt ${attempt} failed: ${error.message}`);
    }
  }

  return false;
}

// ─────────────────────────────────────────────────────
// Step 2b: Manual CAPTCHA fallback
// ─────────────────────────────────────────────────────
async function waitForManualCaptcha(page: Page): Promise<void> {
  logInfo(
    "⏳ Auto-solve failed — please solve the CAPTCHA manually in the browser window",
  );
  sendDesktopNotification(
    "CAPTCHA Required",
    "Auto-solve failed. Please solve the CAPTCHA manually.",
  );
  playAlertSound(3);

  // Wait for the CAPTCHA textbox to be visible
  const textbox = page.getByRole("textbox", { name: /znaki/i });
  await textbox.waitFor({ state: "visible", timeout: 300000 });

  logInfo('Waiting for you to type the CAPTCHA and click "Dalej"...');

  // Wait until we see the booking form
  await page
    .locator("text=Rodzaj usługi")
    .waitFor({ state: "visible", timeout: 300000 });

  logSuccess("CAPTCHA solved manually! Booking form loaded.");
}

// ─────────────────────────────────────────────────────
// Step 2: Solve CAPTCHA (auto → manual fallback + timeout)
// ─────────────────────────────────────────────────────
async function solveCaptchaStep(page: Page): Promise<void> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `CAPTCHA solving timed out after ${CAPTCHA_TIMEOUT_MS / 1000}s — will retry`,
          ),
        ),
      CAPTCHA_TIMEOUT_MS,
    ),
  );

  // Race the actual solve logic against the timeout
  await Promise.race([
    (async () => {
      const autoSolved = await autoSolveCaptcha(page);
      if (!autoSolved) {
        await waitForManualCaptcha(page);
      }
    })(),
    timeoutPromise,
  ]);
}

// ─────────────────────────────────────────────────────
// Step 3: Fill out the booking form
// ─────────────────────────────────────────────────────
async function fillBookingForm(page: Page): Promise<void> {
  logInfo("Filling booking form...");
  logInfo(`  Service type: ${SERVICE_TYPE}`);
  logInfo(`  Location: ${LOCATION}`);
  logInfo(`  People: ${NUM_PEOPLE}`);

  // ── Select "Rodzaj usługi" (Service type) ──
  // Find the combobox near "Rodzaj usługi" label
  const serviceDropdown = page.locator("mat-select").first();
  await serviceDropdown.click();
  await sleep(500);
  await page.getByRole("option", { name: SERVICE_TYPE, exact: true }).click();
  await sleep(500);
  logSuccess(`Selected service: ${SERVICE_TYPE}`);

  // ── Select "Lokalizacja" (Location) ──
  const locationDropdown = page.locator("mat-select").nth(1);
  await locationDropdown.click();
  await sleep(500);
  await page.getByRole("option", { name: LOCATION }).click();
  await sleep(500);
  logSuccess(`Selected location: ${LOCATION}`);

  // ── Select "Chcę zarezerwować termin dla" (Number of people) ──
  const peopleDropdown = page.locator("mat-select").nth(2);
  await peopleDropdown.click();
  await sleep(500);
  await page.getByRole("option", { name: NUM_PEOPLE }).click();
  await sleep(1000); // Wait for the page to process and show result
  logSuccess(`Selected people: ${NUM_PEOPLE}`);
}

// ─────────────────────────────────────────────────────
// Step 4: Check for available appointment slots
// ─────────────────────────────────────────────────────
async function checkForAppointments(page: Page): Promise<{
  available: boolean;
  message: string;
}> {
  logInfo("Checking for available appointment slots...");

  // Wait a moment for the page to update after form selections
  await sleep(2000);

  // Get the full page text to analyze
  const pageText = (await page.textContent("body")) || "";

  // ── Check for the known "no slots" message ──
  const noSlotsPatterns = [
    /wszystkie udostępnione terminy zostały zarezerwowane/i, // "all available dates have been booked"
    /brak wolnych termin/i, // "no free dates"
    /brak dostępnych termin/i, // "no available dates"
    /brak miejsc/i, // "no places"
    /nie ma wolnych/i, // "there are no free"
    /brak terminów/i, // "no dates"
    /aktualnie brak/i, // "currently none"
    /prosimy spróbować/i, // "please try later"
  ];

  const noSlotsFound = noSlotsPatterns.some((pattern) =>
    pattern.test(pageText),
  );

  // ── Check if Termin dropdown is available (has options) ──
  // When slots are available, the Termin dropdown should appear with date options
  const terminDropdownVisible = await page
    .locator("mat-select")
    .nth(3)
    .isVisible()
    .catch(() => false);
  const dalekButtonVisible = await page
    .getByRole("button", { name: "Dalej" })
    .isVisible()
    .catch(() => false);

  // Check if the form fields got disabled (they do when no slots)
  const serviceDisabled =
    (await page.locator("mat-select").first().getAttribute("aria-disabled")) ===
    "true";

  if (noSlotsFound) {
    return {
      available: false,
      message: "No appointments available — all slots are booked",
    };
  }

  if (serviceDisabled && !terminDropdownVisible) {
    return {
      available: false,
      message:
        "No appointments available — form fields disabled, no date picker shown",
    };
  }

  if (terminDropdownVisible || dalekButtonVisible) {
    // Try to get the Termin options
    let terminOptions = "";
    try {
      const terminDropdown = page.locator("mat-select").nth(3);
      await terminDropdown.click();
      await sleep(500);
      const options = page.getByRole("option");
      const count = await options.count();
      const optionTexts: string[] = [];
      for (let i = 0; i < count; i++) {
        optionTexts.push((await options.nth(i).textContent()) || "");
      }
      terminOptions = optionTexts.join(", ");
      // Press Escape to close the dropdown without selecting
      await page.keyboard.press("Escape");
    } catch {
      terminOptions = "(could not read options)";
    }

    return {
      available: true,
      message: `🎉 APPOINTMENTS FOUND! Available dates: ${terminOptions}`,
    };
  }

  // Fallback: take screenshot and report
  return {
    available: false,
    message: `Unable to determine availability. Page text snippet: "${pageText.substring(0, 300).trim()}"`,
  };
}

// ─────────────────────────────────────────────────────
// Step 5: Alert user when appointment is found
// ─────────────────────────────────────────────────────
async function alertAppointmentFound(
  page: Page,
  message: string,
): Promise<void> {
  logSeparator();
  logSuccess("🎉🎉🎉 APPOINTMENT SLOT FOUND! 🎉🎉🎉");
  logSuccess(message);
  logSuccess(`Page URL: ${page.url()}`);
  logSeparator();

  // Take a screenshot
  const screenshotPath = `screenshots/appointment-found-${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  logInfo(`Screenshot saved: ${screenshotPath}`);

  // Send notifications (desktop + Telegram)
  await notifyAll(
    "🎉 APPOINTMENT AVAILABLE!",
    `An appointment slot is available on the Polish consulate website!\n\n${message}\n\nGo book it NOW!`,
  );

  // Speak the alert
  speakMessage(
    "Appointment available! Go to the browser now and book your appointment!",
  );

  // Play alert sounds
  playAlertSound(10);
}

// ─────────────────────────────────────────────────────
// Step 6: Poll loop - keep checking
// ─────────────────────────────────────────────────────
async function pollForAppointments(browser: Browser): Promise<void> {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    logSeparator();
    logInfo(`Attempt ${attempt}/${MAX_RETRIES}`);

    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      // Open a fresh browser context + page for each attempt
      context = await browser.newContext();
      page = await context.newPage();

      // Go to the captcha page
      await navigateToCaptchaPage(page);

      // Auto-solve CAPTCHA (falls back to manual if OCR fails)
      await solveCaptchaStep(page);

      // Fill the booking form automatically
      await fillBookingForm(page);

      // Check for appointments
      const result = await checkForAppointments(page);

      if (result.available) {
        await alertAppointmentFound(page, result.message);

        // PAUSE here so the user can manually book
        logInfo("Browser is paused — book your appointment now!");
        logInfo(
          'Press "Resume" in Playwright Inspector to continue polling, or close to stop.',
        );
        await page.pause();

        // After pause, close this context and continue polling
        logInfo("Resuming polling...");
        await context.close();
        context = null;
        page = null;
      } else {
        logWarn(result.message);

        // Close the browser page/context immediately
        logInfo("Closing browser...");
        await context.close();
        context = null;
        page = null;

        logInfo(`Next check in ${POLL_INTERVAL_MS / 1000} seconds...`);
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error: any) {
      logError(`Error during check: ${error.message}`);

      // Close the browser on error too
      if (context) {
        await context.close().catch(() => {});
      }

      logInfo(`Retrying in ${POLL_INTERVAL_MS / 1000} seconds...`);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  logError(`Max retries (${MAX_RETRIES}) reached. Stopping.`);
}

// ==============================================
// MAIN TEST - CONTINUOUS APPOINTMENT CHECKER
// ==============================================
test("Polish Consulate Appointment Checker", async ({ browser }) => {
  test.setTimeout(0); // No timeout — runs indefinitely

  logSeparator();
  logInfo("🇵🇱 Polish Consulate Appointment Checker");
  logInfo(`URL: ${CONSULATE_URL}`);
  logInfo(
    `Service: ${SERVICE_TYPE} | Location: ${LOCATION} | People: ${NUM_PEOPLE}`,
  );
  logInfo(
    `Poll interval: ${POLL_INTERVAL_MS / 1000}s | Max retries: ${MAX_RETRIES}`,
  );
  logInfo(`CAPTCHA timeout: ${CAPTCHA_TIMEOUT_MS / 1000}s`);
  logInfo("Browser will close between checks to save resources");
  logSeparator();

  await pollForAppointments(browser);
});

// ==============================================
// ONE-SHOT CHECK (manual captcha, single check)
// ==============================================
test("Single appointment check (manual CAPTCHA)", async ({ page }) => {
  test.setTimeout(600000); // 10 min timeout

  logSeparator();
  logInfo("🇵🇱 Single Appointment Check");
  logInfo(
    `Service: ${SERVICE_TYPE} | Location: ${LOCATION} | People: ${NUM_PEOPLE}`,
  );
  logSeparator();

  await navigateToCaptchaPage(page);
  await solveCaptchaStep(page);
  await fillBookingForm(page);

  const result = await checkForAppointments(page);

  if (result.available) {
    await alertAppointmentFound(page, result.message);
    logInfo("Browser paused — book now!");
    await page.pause();
  } else {
    logWarn(result.message);
    await page.screenshot({
      path: `screenshots/no-appointment-${Date.now()}.png`,
      fullPage: true,
    });
  }
});

// ==============================================
// CAPTCHA DEBUG TEST - solve & save screenshots
// ==============================================
test("CAPTCHA solver debug test", async ({ page }) => {
  test.setTimeout(120000); // 2 min timeout

  const debugDir = path.resolve("screenshots/captcha-debug");
  if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });

  const NUM_SAMPLES = 5;
  logSeparator();
  logInfo(
    `🔍 CAPTCHA Debug: solving ${NUM_SAMPLES} CAPTCHAs and saving screenshots`,
  );
  logSeparator();

  for (let i = 1; i <= NUM_SAMPLES; i++) {
    logInfo(`\n--- Sample ${i}/${NUM_SAMPLES} ---`);

    await page.goto(CONSULATE_URL, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(1000);

    const captchaImg = page.getByRole("img", { name: "Weryfikacja obrazkowa" });
    await captchaImg.waitFor({ state: "visible", timeout: 10000 });
    await sleep(500);

    // Save the original CAPTCHA
    const originalBuffer = await captchaImg.screenshot();
    const ts = Date.now();
    fs.writeFileSync(
      path.join(debugDir, `${i}-original-${ts}.png`),
      originalBuffer,
    );

    // Run OCR with all strategies and save preprocessed images
    const strategies = [
      { threshold: 100, negate: true },
      { threshold: 120, negate: true },
      { threshold: 140, negate: true },
      { threshold: 160, negate: true },
      { threshold: 140, negate: false },
    ];

    logInfo("Strategy results:");
    for (const strat of strategies) {
      let pipeline = sharp(originalBuffer)
        .grayscale()
        .resize({ width: 400, fit: "inside" })
        .sharpen({ sigma: 2 })
        .normalize()
        .threshold(strat.threshold);

      if (strat.negate) pipeline = pipeline.negate();

      const processed = await pipeline.toBuffer();
      const label = `t${strat.threshold}${strat.negate ? "-neg" : ""}`;
      fs.writeFileSync(
        path.join(debugDir, `${i}-${label}-${ts}.png`),
        processed,
      );

      const result = await Tesseract.recognize(processed, "eng");
      const text = result.data.text
        .trim()
        .replace(/\s+/g, "")
        .replace(/[^\w#+\-]/g, "")
        .substring(0, 6);
      logInfo(
        `  ${label}: "${text}" (confidence: ${result.data.confidence.toFixed(1)}%)`,
      );
    }

    // Also run the full solver
    const solved = await solveCaptcha(originalBuffer);
    logSuccess(`  Final answer: "${solved}"`);

    // Refresh for next sample
    if (i < NUM_SAMPLES) {
      await page.getByRole("button", { name: "Odśwież" }).click();
      await sleep(2000);
    }
  }

  logSeparator();
  logSuccess(
    `Done! Check screenshots/captcha-debug/ for ${NUM_SAMPLES} samples`,
  );
  logSeparator();
});
