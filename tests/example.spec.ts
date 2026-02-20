import { test } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://secure.e-konsulat.gov.pl/placowki/200/wiza-krajowa/wizyty/weryfikacja-obrazkowa');

  await page.pause();
});
