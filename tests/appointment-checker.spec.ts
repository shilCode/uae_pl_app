import { test, Page, expect } from '@playwright/test';
import { sendDesktopNotification, playAlertSound, speakMessage } from '../src/notify';
import { log, logSuccess, logError, logInfo, logWarn, logSeparator } from '../src/logger';
import * as dotenv from 'dotenv';

dotenv.config();

const CONSULATE_URL =
  process.env.CONSULATE_URL ||
  'https://secure.e-konsulat.gov.pl/placowki/200/wiza-krajowa/wizyty/weryfikacja-obrazkowa';

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '60000', 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '500', 10);

// ── Form selections (configurable via .env) ──
const SERVICE_TYPE = process.env.SERVICE_TYPE || 'Wiza krajowa';
const LOCATION = process.env.LOCATION || 'Abu Zabi';
const NUM_PEOPLE = process.env.NUM_PEOPLE || '1 osob';

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
  logInfo('Navigating to captcha page...');
  await page.goto(CONSULATE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  logSuccess('Captcha page loaded');
}

// ─────────────────────────────────────────────────────
// Step 2: Wait for user to solve CAPTCHA manually
// ─────────────────────────────────────────────────────
async function waitForCaptchaSolved(page: Page): Promise<void> {
  logInfo('⏳ CAPTCHA detected — please solve it manually in the browser window');
  sendDesktopNotification('CAPTCHA Required', 'Please solve the CAPTCHA in the browser window');

  // Wait for the CAPTCHA textbox to be visible
  const textbox = page.getByRole('textbox', { name: /znaki/i });
  await textbox.waitFor({ state: 'visible', timeout: 300000 });

  logInfo('Waiting for you to type the CAPTCHA and click "Dalej"...');

  // Wait until we see the booking form (comboboxes appear) or URL changes
  // The page stays on the same URL but the content changes to show the form
  await page.locator('text=Rodzaj usługi').waitFor({ state: 'visible', timeout: 300000 });

  logSuccess('CAPTCHA solved! Booking form loaded.');
}

// ─────────────────────────────────────────────────────
// Step 3: Fill out the booking form
// ─────────────────────────────────────────────────────
async function fillBookingForm(page: Page): Promise<void> {
  logInfo('Filling booking form...');
  logInfo(`  Service type: ${SERVICE_TYPE}`);
  logInfo(`  Location: ${LOCATION}`);
  logInfo(`  People: ${NUM_PEOPLE}`);

  // ── Select "Rodzaj usługi" (Service type) ──
  // Find the combobox near "Rodzaj usługi" label
  const serviceDropdown = page.locator('mat-select').first();
  await serviceDropdown.click();
  await sleep(500);
  await page.getByRole('option', { name: SERVICE_TYPE, exact: true }).click();
  await sleep(500);
  logSuccess(`Selected service: ${SERVICE_TYPE}`);

  // ── Select "Lokalizacja" (Location) ──
  const locationDropdown = page.locator('mat-select').nth(1);
  await locationDropdown.click();
  await sleep(500);
  await page.getByRole('option', { name: LOCATION }).click();
  await sleep(500);
  logSuccess(`Selected location: ${LOCATION}`);

  // ── Select "Chcę zarezerwować termin dla" (Number of people) ──
  const peopleDropdown = page.locator('mat-select').nth(2);
  await peopleDropdown.click();
  await sleep(500);
  await page.getByRole('option', { name: NUM_PEOPLE }).click();
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
  logInfo('Checking for available appointment slots...');

  // Wait a moment for the page to update after form selections
  await sleep(2000);

  // Get the full page text to analyze
  const pageText = await page.textContent('body') || '';

  // ── Check for the known "no slots" message ──
  const noSlotsPatterns = [
    /wszystkie udostępnione terminy zostały zarezerwowane/i,  // "all available dates have been booked"
    /brak wolnych termin/i,       // "no free dates"
    /brak dostępnych termin/i,    // "no available dates"
    /brak miejsc/i,               // "no places"
    /nie ma wolnych/i,            // "there are no free"
    /brak terminów/i,             // "no dates"
    /aktualnie brak/i,            // "currently none"
    /prosimy spróbować/i,         // "please try later"
  ];

  const noSlotsFound = noSlotsPatterns.some((pattern) => pattern.test(pageText));

  // ── Check if Termin dropdown is available (has options) ──
  // When slots are available, the Termin dropdown should appear with date options
  const terminDropdownVisible = await page.locator('mat-select').nth(3).isVisible().catch(() => false);
  const dalekButtonVisible = await page.getByRole('button', { name: 'Dalej' }).isVisible().catch(() => false);

  // Check if the form fields got disabled (they do when no slots)
  const serviceDisabled = await page.locator('mat-select').first().getAttribute('aria-disabled') === 'true';

  if (noSlotsFound) {
    return {
      available: false,
      message: 'No appointments available — all slots are booked',
    };
  }

  if (serviceDisabled && !terminDropdownVisible) {
    return {
      available: false,
      message: 'No appointments available — form fields disabled, no date picker shown',
    };
  }

  if (terminDropdownVisible || dalekButtonVisible) {
    // Try to get the Termin options
    let terminOptions = '';
    try {
      const terminDropdown = page.locator('mat-select').nth(3);
      await terminDropdown.click();
      await sleep(500);
      const options = page.getByRole('option');
      const count = await options.count();
      const optionTexts: string[] = [];
      for (let i = 0; i < count; i++) {
        optionTexts.push(await options.nth(i).textContent() || '');
      }
      terminOptions = optionTexts.join(', ');
      // Press Escape to close the dropdown without selecting
      await page.keyboard.press('Escape');
    } catch {
      terminOptions = '(could not read options)';
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
async function alertAppointmentFound(page: Page, message: string): Promise<void> {
  logSeparator();
  logSuccess('🎉🎉🎉 APPOINTMENT SLOT FOUND! 🎉🎉🎉');
  logSuccess(message);
  logSuccess(`Page URL: ${page.url()}`);
  logSeparator();

  // Take a screenshot
  const screenshotPath = `screenshots/appointment-found-${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  logInfo(`Screenshot saved: ${screenshotPath}`);

  // Send notifications
  sendDesktopNotification(
    '🎉 APPOINTMENT AVAILABLE!',
    'An appointment slot is available on the Polish consulate website! Go book it NOW!'
  );

  // Speak the alert
  speakMessage('Appointment available! Go to the browser now and book your appointment!');

  // Play alert sounds
  playAlertSound(10);
}

// ─────────────────────────────────────────────────────
// Step 6: Poll loop - keep checking
// ─────────────────────────────────────────────────────
async function pollForAppointments(page: Page): Promise<void> {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    logSeparator();
    logInfo(`Attempt ${attempt}/${MAX_RETRIES}`);

    try {
      // Go to the captcha page
      await navigateToCaptchaPage(page);

      // Wait for user to solve the CAPTCHA
      await waitForCaptchaSolved(page);

      // Fill the booking form automatically
      await fillBookingForm(page);

      // Check for appointments
      const result = await checkForAppointments(page);

      if (result.available) {
        await alertAppointmentFound(page, result.message);

        // PAUSE here so the user can manually book
        logInfo('Browser is paused — book your appointment now!');
        logInfo('Press "Resume" in Playwright Inspector to continue polling, or close to stop.');
        await page.pause();

        // After pause, user may continue polling
        logInfo('Resuming polling...');
      } else {
        logWarn(result.message);
        logInfo(`Next check in ${POLL_INTERVAL_MS / 1000} seconds...`);
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error: any) {
      logError(`Error during check: ${error.message}`);
      logInfo(`Retrying in ${POLL_INTERVAL_MS / 1000} seconds...`);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  logError(`Max retries (${MAX_RETRIES}) reached. Stopping.`);
}

// ==============================================
// MAIN TEST - CONTINUOUS APPOINTMENT CHECKER
// ==============================================
test('Polish Consulate Appointment Checker', async ({ page }) => {
  test.setTimeout(0); // No timeout — runs indefinitely

  logSeparator();
  logInfo('🇵🇱 Polish Consulate Appointment Checker');
  logInfo(`URL: ${CONSULATE_URL}`);
  logInfo(`Service: ${SERVICE_TYPE} | Location: ${LOCATION} | People: ${NUM_PEOPLE}`);
  logInfo(`Poll interval: ${POLL_INTERVAL_MS / 1000}s | Max retries: ${MAX_RETRIES}`);
  logSeparator();

  await pollForAppointments(page);
});

// ==============================================
// ONE-SHOT CHECK (manual captcha, single check)
// ==============================================
test('Single appointment check (manual CAPTCHA)', async ({ page }) => {
  test.setTimeout(600000); // 10 min timeout

  logSeparator();
  logInfo('🇵🇱 Single Appointment Check');
  logInfo(`Service: ${SERVICE_TYPE} | Location: ${LOCATION} | People: ${NUM_PEOPLE}`);
  logSeparator();

  await navigateToCaptchaPage(page);
  await waitForCaptchaSolved(page);
  await fillBookingForm(page);

  const result = await checkForAppointments(page);

  if (result.available) {
    await alertAppointmentFound(page, result.message);
    logInfo('Browser paused — book now!');
    await page.pause();
  } else {
    logWarn(result.message);
    await page.screenshot({ path: `screenshots/no-appointment-${Date.now()}.png`, fullPage: true });
  }
});
