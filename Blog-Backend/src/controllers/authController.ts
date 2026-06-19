import { Request, Response } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "@/config/db.js";
import { sanitize } from "@/utils/sanitize.js";
import { createSession } from "@/models/sessionModel.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateLastLogin,
  updateUserStatus,
} from "@/models/userModel.js";
import { recordLogin } from "@/models/loginHistoryModel.js";
import { sendEmail } from "@/utils/sendEmail.js";

// ============================================
// 1. REGISTER NEW USER
// ============================================
export const register = async (req: Request, res: Response) => {
  const { first_name, last_name, email, password } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const cleanFirstName = sanitize(first_name);
  const cleanLastName = sanitize(last_name);
  // sanitize applied to email as well as name fields
  const cleanEmail = sanitize(email).trim().toLowerCase();

  try {
    const existingUser = await findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await createUser(
      cleanFirstName,
      cleanLastName,
      cleanEmail,
      hashedPassword,
      "user",
      "pending"
    );

    res
      .status(201)
      .json({ id: user.id, email: user.email, status: user.status });
  } catch (error) {
    console.error("register error:", error);
    res
      .status(503)
      .json({ message: "Service temporarily unavailable. Please try again." });
  }
};

// ============================================
// 2. LOGIN USER
// ============================================
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Invalid input format" });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const user = await findUserByEmail(cleanEmail);

    if (!user) {
      await recordLogin(null, req, false);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      await recordLogin(user.id, req, false);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.status === "pending") {
      return res.status(403).json({ message: "Account pending approval" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Account suspended" });
    }

    await recordLogin(user.id, req, true);
    await updateLastLogin(user.id);

    const tokenId = crypto.randomUUID();
    const rawRefreshToken = crypto.randomBytes(64).toString("hex");
    const refreshTokenHash = await bcrypt.hash(rawRefreshToken, 10);

    await createSession({
      userId: user.id,
      tokenId,
      refreshTokenHash,
      userAgent: req.headers["user-agent"] || "",
      ipAddress: req.ip || "",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        sid: tokenId,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );

    res.cookie("refreshToken", `${tokenId}.${rawRefreshToken}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth/refresh",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken });
  } catch (error) {
    // Was previously completely unguarded — a dropped DB connection here
    // (findUserByEmail, recordLogin, createSession, etc.) had nowhere to go
    // but an unhandled promise rejection, which could hang the request or
    // crash the process, and on the client surfaced as a JSON.parse error
    // ("Unexpected token...") instead of a usable error message.
    console.error("login error:", error);
    return res
      .status(503)
      .json({ message: "Service temporarily unavailable. Please try again." });
  }
};

// ============================================
// 3. REQUEST PASSWORD RESET (Forgot Password)
// ============================================
export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await findUserByEmail(email?.toLowerCase().trim());

    // Always return the same message to prevent user enumeration
    if (!user) {
      return res.json({
        message: "If an account exists, a reset link has been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
      user.id,
    ]);
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [user.id, tokenHash, expiresAt]
    );

    const resetLink = `http://localhost:5000/reset-password.html?token=${rawToken}&id=${user.id}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request - Revit Systems",
        message: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2>Password Reset</h2>
          <p>You requested a password reset for your Revit Systems account.</p>
          <p>Click the button below to set a new password. This link is valid for 1 hour.</p>
          <a href="${resetLink}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
      });

      console.log("DEBUG - Reset Link:", resetLink);

      res.json({
        message:
          "If an account exists, a reset link has been sent. Check spam folder if not found in inbox",
      });
    } catch (error) {
      console.error("Failed to send reset email:", error);
      res
        .status(500)
        .json({ message: "Error sending email. Please try again later." });
    }
  } catch (error) {
    // Covers findUserByEmail / the DELETE+INSERT pool.query calls above,
    // which were previously unguarded.
    console.error("requestPasswordReset error:", error);
    res
      .status(503)
      .json({ message: "Service temporarily unavailable. Please try again." });
  }
};

// ============================================
// 4. RESET PASSWORD (Finalize)
// ============================================
export const resetPassword = async (req: Request, res: Response) => {
  const { userId, token, newPassword } = req.body;

  if (!userId || !token || !newPassword) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Check and validate the reset token BEFORE opening a transaction —
  // no point holding a DB client while doing bcrypt work
  let tokenRecord;
  try {
    const tokenResult = await pool.query(
      "SELECT * FROM password_reset_tokens WHERE user_id = $1",
      [userId]
    );
    tokenRecord = tokenResult.rows[0];

    if (!tokenRecord) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset link." });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
        userId,
      ]);
      return res.status(400).json({ message: "Reset link has expired." });
    }
  } catch (error) {
    console.error("resetPassword lookup error:", error);
    return res
      .status(503)
      .json({ message: "Service temporarily unavailable. Please try again." });
  }

  const incomingHash = crypto.createHash("sha256").update(token).digest("hex");
  if (incomingHash !== tokenRecord.token_hash) {
    return res.status(400).json({ message: "Invalid reset token." });
  }

  // Hash the new password before checking out the client so the
  // client is held for as short a time as possible
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Check out a single dedicated client from the pool so that
  // BEGIN / all queries / COMMIT all run on the same connection.
  // Using pool.query("BEGIN") routes each call to a potentially
  // different connection, breaking atomicity entirely.
  let client;
  try {
    client = await pool.connect();
  } catch (error) {
    console.error("resetPassword connect error:", error);
    return res
      .status(503)
      .json({ message: "Service temporarily unavailable. Please try again." });
  }

  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hashedPassword, userId]
    );

    // Revoke all active sessions for this user on the same client/transaction
    await client.query(
      "UPDATE sessions SET is_revoked = true, updated_at = NOW() WHERE user_id = $1",
      [userId]
    );

    await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
      userId,
    ]);

    await client.query("COMMIT");

    res.json({ message: "Password updated successfully! You can now log in." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    // Always release the client back to the pool whether we succeed or fail
    client.release();
  }
};

// ============================================
// 5. UPDATE USER STATUS (Admin Only)
// ============================================
export const changeUserStatus = async (req: Request, res: Response) => {
  const { userId, status } = req.body;

  const validStatuses = ["active", "suspended", "pending"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status type" });
  }

  try {
    const updatedUser = await updateUserStatus(userId, status);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: `User status updated to ${status} successfully.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// 6. GET CURRENT USER  (self profile — "who am I")
// ============================================
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = await findUserById(req.user!.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user); // already safe — no password_hash in this query
  } catch (error) {
    console.error("getCurrentUser error:", error);
    res
      .status(503)
      .json({ message: "Service temporarily unavailable. Please try again." });
  }
};
