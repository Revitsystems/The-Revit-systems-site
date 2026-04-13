import { Request, Response } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "@/config/db.js"; // Added this back for the queries
import { sanitize } from "@/utils/sanitize.js";
import { createSession } from "@/models/sessionModel.js";
import {
  createUser,
  findUserByEmail,
  updateLastLogin,
} from "@/models/userModel.js";
import { recordLogin } from "@/models/loginHistoryModel.js";

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
  const cleanEmail = email.trim().toLowerCase();

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

  res.status(201).json({ id: user.id, email: user.email, status: user.status });
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
    await recordLogin(user.id, req, false);
    return res.status(403).json({
      message:
        "Your account is pending admin approval. Please check back later.",
    });
  }

  if (user.status === "suspended") {
    await recordLogin(user.id, req, false);
    return res.status(403).json({
      message:
        "This account has been suspended. Please contact the administrator.",
    });
  }

  await recordLogin(user.id, req, true);
  await updateLastLogin(user.id);

  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "15m" }
  );

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

  res.json({
    accessToken,
    refreshToken: `${tokenId}.${rawRefreshToken}`,
  });
};

// ============================================
// 3. REQUEST PASSWORD RESET (Forgot Password)
// ============================================
export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await findUserByEmail(email?.toLowerCase().trim());

  // Security: Always return success message to prevent user enumeration
  if (!user) {
    return res.json({
      message: "If an account exists, a reset link has been sent.",
    });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
    user.id,
  ]);
  await pool.query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [user.id, tokenHash, expiresAt]
  );

  // LOG THIS LINK to your terminal so you can test it without an email service!
  const resetLink = `http://localhost:5500/reset-password.html?token=${rawToken}&id=${user.id}`;
  console.log("DEBUG - Password Reset Link:", resetLink);

  res.json({ message: "If an account exists, a reset link has been sent." });
};

// ============================================
// 4. RESET PASSWORD (Finalize)
// ============================================
export const resetPassword = async (req: Request, res: Response) => {
  const { userId, token, newPassword } = req.body;

  if (!userId || !token || !newPassword) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM password_reset_tokens WHERE user_id = $1",
      [userId]
    );
    const tokenRecord = result.rows[0];

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

    const incomingHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    if (incomingHash !== tokenRecord.token_hash) {
      return res.status(400).json({ message: "Invalid reset token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query("BEGIN");
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      hashedPassword,
      userId,
    ]);
    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
      userId,
    ]);
    await pool.query("COMMIT");

    res.json({ message: "Password updated successfully! You can now log in." });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
