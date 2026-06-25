import app from "@/app.js";
import dotenv from "dotenv";
import { verifyTransporter } from "@/utils/sendEmail.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Verify SMTP credentials at boot so misconfiguration is surfaced immediately
  // in the startup logs rather than silently at the first password-reset attempt.
  verifyTransporter();
});
