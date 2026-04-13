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
  const { refreshToken } = req.body;

  const [tokenId, rawToken] = refreshToken.split(".");

  const session = await findSessionByTokenId(tokenId);

  if (!session || session.is_revoked) {
    return res.status(401).json({ message: "Invalid session" });
  }

  if (new Date(session.expires_at) < new Date()) {
    return res.status(401).json({ message: "Session expired" });
  }

  const isValid = await bcrypt.compare(rawToken, session.refresh_token_hash);

  if (!isValid) {
    // 🚨 possible token theft → kill session immediately
    await revokeSessionByTokenId(tokenId);
    return res.status(401).json({ message: "Invalid session" });
  }

  // 🔁 ROTATE SESSION (CRITICAL)
  await revokeSessionByTokenId(tokenId);

  const newAccessToken = jwt.sign(
    { id: session.user_id, role: session.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "15m" }
  );

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

  res.json({
    accessToken: newAccessToken,
    refreshToken: `${newTokenId}.${newRawToken}`,
  });
};
