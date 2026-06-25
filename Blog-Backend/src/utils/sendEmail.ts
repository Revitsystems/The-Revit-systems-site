import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // e.g. "smtp.sendgrid.net"
  port: Number(process.env.EMAIL_PORT), // e.g. 587
  secure: false, // false for STARTTLS on port 587
  auth: {
    user: process.env.EMAIL_USER, // SendGrid: literal string "apikey"
    pass: process.env.EMAIL_PASSWORD, // SendGrid: your API key starting with SG.
  },
});

export const verifyTransporter = async (): Promise<void> => {
  try {
    await transporter.verify();
    console.log("[Email] SMTP transporter verified — ready to send.");
  } catch (error) {
    // Log loudly but don't crash the process; the rest of the API still works.
    console.error(
      "[Email] SMTP transporter verification FAILED. Check EMAIL_HOST / EMAIL_PORT / EMAIL_USER / EMAIL_PASSWORD env vars.",
      error
    );
  }
};

export const sendEmail = async (options: {
  email: string;
  subject: string;
  message: string;
}): Promise<void> => {
  const fromAddress = process.env.SENDGRID_FROM_EMAIL;
  if (!fromAddress) {
    throw new Error(
      "SENDGRID_FROM_EMAIL env var is not set. Add it to your .env file."
    );
  }

  const mailOptions = {
    from: `"Revit Systems Security" <${fromAddress}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(
    `[Email] Sent to ${options.email} — messageId: ${info.messageId}`
  );
};
