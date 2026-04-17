import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  findSessionByTokenId,
  revokeSessionByTokenId,
  createSession,
} from "@/models/sessionModel.js";

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  const parts = refreshToken.split(".");
  if (parts.length !== 2) {
    return res.status(401).json({ message: "Malformed token" });
  }

  const [tokenId, rawToken] = parts;

  const session = await findSessionByTokenId(tokenId);

  if (!session || session.is_revoked) {
    return res.status(401).json({ message: "Invalid session" });
  }

  if (new Date(session.expires_at) < new Date()) {
    await revokeSessionByTokenId(tokenId);
    return res.status(401).json({ message: "Session expired" });
  }

  const isValid = await bcrypt.compare(rawToken, session.refresh_token_hash);

  if (!isValid) {
    await revokeSessionByTokenId(tokenId);
    return res.status(401).json({ message: "Invalid session" });
  }

  // 🔥 ROTATE SESSION
  await revokeSessionByTokenId(tokenId);

  const newTokenId = crypto.randomUUID();
  const newRawToken = crypto.randomBytes(64).toString("hex");
  const newHash = await bcrypt.hash(newRawToken, 10);

  await createSession({
    userId: session.user_id,
    tokenId: newTokenId,
    refreshTokenHash: newHash,
    userAgent: session.user_agent,
    ipAddress: session.ip_address,
    expiresAt: session.expires_at,
  });

  // 🔥 NEW ACCESS TOKEN WITH SID BINDING
  const newAccessToken = jwt.sign(
    {
      id: session.user_id,
      role: session.role,
      sid: newTokenId,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "15m" }
  );

  // 🔥 SET NEW COOKIE
  res.cookie("refreshToken", `${newTokenId}.${newRawToken}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({ accessToken: newAccessToken });
};
