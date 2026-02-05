import Brevo from "@getbrevo/brevo";

const brevoApi = new Brevo.TransactionalEmailsApi();
brevoApi.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!,
);
const senderEmail = process.env.SENDER_EMAIL!;

export async function sendVerificationEmailBrevo({
  user,
  url,
}: {
  user: { email: string; name?: string };
  url: string;
}) {
  const senderName = "POS System";

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = "Verify your email address - POS SYSTEM";
  sendSmtpEmail.sender = { name: senderName, email: senderEmail };
  sendSmtpEmail.to = [
    { email: user.email, name: user.name || user.email.split("@")[0] },
  ];
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">POS System</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${user.name || "there"}!</h2>
        
        <p style="font-size: 16px; color: #555;">
          Thank you for signing up to POS System. We're excited to have you on board!
        </p>
        
        <p style="font-size: 16px; color: #555;">
          Please verify your email address by clicking the button below:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 14px 28px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: bold;
                    font-size: 16px;
                    display: inline-block;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            Verify Email Address
          </a>
        </div>
        
        <p style="font-size: 14px; color: #777; margin-top: 30px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="font-size: 13px; color: #667eea; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
          ${url}
        </p>
        
        <p style="font-size: 13px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          ⏱️ This link expires in 1 hour for security reasons.
        </p>
        
        <p style="font-size: 14px; color: #555; margin-top: 20px;">
          Best regards,<br>
          <strong>POS System Team</strong>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} POS System. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  try {
    await brevoApi.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Verification email sent to ${user.email}`);
  } catch (err: any) {
    console.error("❌ Failed to send verification email via Brevo:", err);
    console.error("Error details:", err.response?.body || err.message);
    throw err;
  }
}
