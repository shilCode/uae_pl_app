import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;
let previewBaseUrl: string = "";

// Recipient / sender from env (optional overrides)
const MAIL_TO = process.env.MAIL_TO || "appointment-alerts@example.com";
const MAIL_FROM = process.env.MAIL_FROM || "checker@polish-consulate.local";

/**
 * Initialise the mailer.
 *
 * - If SMTP_HOST is set in .env, those settings are used (so you can point at
 *   MailHog, MailPit, or any real SMTP server later without code changes).
 * - Otherwise an **Ethereal** test account is auto-created.  Ethereal captures
 *   every email and lets you view it via a web link — no real inbox needed.
 */
export async function initMailer(): Promise<void> {
  if (transporter) return; // already initialised

  const smtpHost = process.env.SMTP_HOST;

  if (smtpHost) {
    // ── Use explicit SMTP settings from .env ──
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || "1025", 10),
      secure: false, // MailHog / MailPit / dev servers rarely use TLS
      // auth is optional — omit for local servers that don't need it
      ...(process.env.SMTP_USER
        ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" } }
        : {}),
    });
    console.log(`📧 Mail transport: ${smtpHost}:${process.env.SMTP_PORT || "1025"}`);
  } else {
    // ── Auto-create an Ethereal test account ──
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    previewBaseUrl = "https://ethereal.email";
    console.log(`📧 Ethereal test account created: ${testAccount.user}`);
    console.log(`   View captured emails at: ${previewBaseUrl}/login`);
    console.log(`   User: ${testAccount.user}  Pass: ${testAccount.pass}`);
  }
}

/**
 * Send an email notification.
 * Returns the Ethereal preview URL (if applicable) or null.
 */
export async function sendMailNotification(
  subject: string,
  body: string,
  screenshotPath?: string,
): Promise<string | null> {
  if (!transporter) {
    await initMailer();
  }

  try {
    const attachments: { filename: string; path: string; cid?: string }[] = [];
    let imgHtml = "";
    if (screenshotPath) {
      attachments.push({
        filename: "screenshot.png",
        path: screenshotPath,
        cid: "screenshot",
      });
      imgHtml = '<br/><h3>Page Screenshot</h3><img src="cid:screenshot" style="max-width:100%"/>';
    }

    const info = await transporter!.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      subject,
      text: body,
      html: `<h2>${subject}</h2><pre>${body}</pre>${imgHtml}`,
      attachments,
    });

    console.log(`📧 Email sent: ${info.messageId}`);

    // Ethereal provides a preview URL for each message
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`   Preview: ${previewUrl}`);
    }
    return typeof previewUrl === "string" ? previewUrl : null;
  } catch (err) {
    console.error("Failed to send email:", err);
    return null;
  }
}
