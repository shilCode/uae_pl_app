/**
 * Quick smoke-test for the email notification service.
 * Run: npx ts-node tests/test-mail.ts
 *      — or —
 *      npx tsx tests/test-mail.ts
 */
import * as dotenv from "dotenv";
dotenv.config();

import { initMailer, sendMailNotification } from "../src/mail";

(async () => {
  console.log("=== Email Notification Test ===\n");

  await initMailer();

  const preview = await sendMailNotification(
    "🎉 TEST — Appointment Available!",
    "This is a test email from the Polish Consulate Appointment Checker.\n\nIf you can see this, email notifications are working!",
  );

  if (preview) {
    console.log(`\n✅ Success! Open this link to view the captured email:\n   ${preview}`);
  } else {
    console.log("\n✅ Email sent (no preview URL — using custom SMTP server).");
  }
})();
