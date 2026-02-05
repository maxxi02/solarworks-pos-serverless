// lib/email-gmail.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your gmail
    pass: process.env.EMAIL_PASSWORD, // app password, not regular password
  },
});

export async function sendVerificationEmailGmail({
  user,
  url,
}: {
  user: { email: string; name?: string };
  url: string;
}) {
  try {
    await transporter.sendMail({
      from: `"POS System" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: "Verify your email address",
      html: `
        <h2>Hello ${user.name || "there"}!</h2>
        <p>Click the link below to verify your email:</p>
        <a href="${url}">Verify Email</a>
      `,
    });
    console.log("✅ Email sent via Gmail");
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}
