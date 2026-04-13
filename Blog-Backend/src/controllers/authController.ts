import { Request, Response } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sanitize } from "@/utils/sanitize.js";
import { createSession } from "@/models/sessionModel.js";
import {
  createUser,
  findUserByEmail,
  updateLastLogin,
} from "@/models/userModel.js";
import { recordLogin } from "@/models/loginHistoryModel.js";

export const register = async (req: Request, res: Response) => {
  // Changed password_hash to password to reflect what the frontend sends
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

  // We add 'pending' or 'false' here for the active status
  const user = await createUser(
    cleanFirstName,
    cleanLastName,
    cleanEmail,
    hashedPassword,
    "user", // Default role
    "pending" // Default status
  );

  res.status(201).json({ id: user.id, email: user.email, status: user.status });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Basic type check to prevent crashes on non-string input
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

  // ==========================================
  // STATUS CHECK (Pending/Suspended Logic)
  // ==========================================
  if (user.status === "pending") {
    // We log this as false because the session isn't fully established
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
  // ==========================================

  // Success path starts here
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
