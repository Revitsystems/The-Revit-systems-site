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
  const { first_name, last_name, email, password_hash } = req.body;

  if (!first_name || !last_name || !email || !password_hash) {
    return res.status(400).json({ message: "Missing fields" });
  }

  // 🛡️ XSS Protection: Sanitize names
  const cleanFirstName = sanitize(first_name);
  const cleanLastName = sanitize(last_name);
  // Email usually doesn't need DOMPurify but trimming and lowering is good practice
  const cleanEmail = email.trim().toLowerCase();

  const existingUser = await findUserByEmail(cleanEmail);
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Note: We use 'password_hash' variable from body,
  // but we are hashing it AGAIN because it's actually the raw password
  const hashedPassword = await bcrypt.hash(password_hash, 10);

  const user = await createUser(
    cleanFirstName,
    cleanLastName,
    cleanEmail,
    hashedPassword
  );

  res.status(201).json({ id: user.id, email: user.email });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
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
  // In your controller:
  await createSession({
    userId: user.id,
    tokenId,
    refreshTokenHash,
    userAgent: req.headers["user-agent"] || "", // Ensure string, not undefined
    ipAddress: req.ip || "", // Ensure string
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  res.json({
    accessToken,
    refreshToken: `${tokenId}.${rawRefreshToken}`,
  });
};
