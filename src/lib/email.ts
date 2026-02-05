import Brevo from "@getbrevo/brevo";

const brevoApi = new Brevo.TransactionalEmailsApi();
brevoApi.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!,
);

export async function sendVerificationEmailBrevo({
  user,
  url,
}: {
  user: { email: string; name?: string };
  url: string;
}) {
  const senderName = "POS System";
  const senderEmail = "no-reply@yourdomain.com";

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = "Verify your email address - POS SYSTEM";
  sendSmtpEmail.sender = { name: senderName, email: senderEmail };
  sendSmtpEmail.to = [
    { email: user.email, name: user.name || user.email.split("@")[0] },
  ];
  sendSmtpEmail.htmlContent = `
    <h2>Hello ${user.name || "there"},</h2>
    <p>Thank you for signing up to POS SYSTEM!</p>
    <p>Click the button below to verify your email address:</p>
    <br>
    <a href="${url}" style="background:#0066cc;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">
      Verify Email Address
    </a>
    <br><br>
    <p>If the button doesn't work, copy-paste this link:</p>
    <p>${url}</p>
    <p>This link expires in 1 hour.</p>
    <p>— POS SYSTEM Team</p>
  `;

  try {
    await brevoApi.sendTransacEmail(sendSmtpEmail);
    console.log(`Verification email sent to ${user.email}`);
  } catch (err) {
    console.error("Failed to send verification email via Brevo:", err);
    throw err; // or handle gracefully
  }
}
