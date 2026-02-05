// lib/email.ts  (or lib/email-mailersend.ts)
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY!,
});

export async function sendVerificationEmail({
  user,
  url,
}: {
  user: { email: string; name?: string };
  url: string;
}) {
  try {
    const sentFrom = new Sender(
      "test@test-65qngkdk1oolwr12.mlsender.net",
      "Rendezvous Café (Test Mode)",
    );

    const recipients = [new Recipient(user.email, user.name || "User")];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("Verify your email address").setHtml(`
        <h2>Hello ${user.name || "there"}!</h2>
        <p>Click the link below to verify your email:</p>
        <a href="${url}" style="padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Verify Email</a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      `);

    await mailerSend.email.send(emailParams);

    console.log(`✅ Verification email sent to ${user.email} via MailerSend`);
  } catch (error) {
    console.error("Failed to send email via MailerSend:", error);
    // You can log error.body for MailerSend-specific messages
    throw error;
  }
}
