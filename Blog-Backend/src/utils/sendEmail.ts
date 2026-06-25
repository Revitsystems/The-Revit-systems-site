import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const verifyTransporter = async (): Promise<void> => {
  if (!process.env.RESEND_API_KEY) {
    console.error("[Email] RESEND_API_KEY is not set.");
  } else {
    console.log("[Email] Resend API ready.");
  }
};

export const sendEmail = async (options: {
  email: string;
  subject: string;
  message: string;
}): Promise<void> => {
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!fromAddress) {
    throw new Error("RESEND_FROM_EMAIL env var is not set.");
  }

  const { error } = await resend.emails.send({
    from: `Revit Systems Security <${fromAddress}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  });

  if (error) {
    console.error("[Email] Resend error:", error);
    throw new Error(error.message);
  }

  console.log(`[Email] Sent to ${options.email} via Resend`);
};
