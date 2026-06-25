import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

export const verifyTransporter = async (): Promise<void> => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("[Email] SENDGRID_API_KEY is not set.");
  } else {
    console.log("[Email] SendGrid HTTP API ready.");
  }
};

export const sendEmail = async (options: {
  email: string;
  subject: string;
  message: string;
}): Promise<void> => {
  const fromAddress = process.env.SENDGRID_FROM_EMAIL;
  if (!fromAddress) {
    throw new Error("SENDGRID_FROM_EMAIL env var is not set.");
  }

  try {
    const info = await sgMail.send({
      to: options.email,
      from: `"Revit Systems Security" <${fromAddress}>`,
      subject: options.subject,
      html: options.message,
    });
    console.log(`[Email] Sent to ${options.email} via SendGrid HTTP API`);
  } catch (error: any) {
    // Log the full error body so we can see exactly what SendGrid is saying
    console.error(
      "[Email] SendGrid error body:",
      JSON.stringify(error?.response?.body?.errors, null, 2)
    );
    throw error;
  }
};
