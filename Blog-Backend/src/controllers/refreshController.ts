import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  findSessionByTokenId,
  revokeSessionByTokenId,
  createSession,
} from "@/models/sessionModel.js";
import { pool } from "@/config/db.js";

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

  try {
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
      // Token hash mismatch — possible token theft attempt.
      // Revoke the session immediately to protect the user.
      await revokeSessionByTokenId(tokenId);
      return res.status(401).json({ message: "Invalid session" });
    }

    // Fetch the user's current role and status directly from the users table.
    // The original used session.role which was whatever role was stored when
    // the session was first created — meaning a user demoted from "admin" to
    // "user" via changeUserStatus in authController.ts would continue receiving
    // admin-scoped access tokens for the full 7-day session lifetime.
    // Querying the users table here ensures role changes take effect on the
    // very next token refresh (within 15 minutes at most).
    const userResult = await pool.query(
      "SELECT role, status FROM users WHERE id = $1",
      [session.user_id]
    );
    const user = userResult.rows[0];

    // Guard against the user being deleted between sessions
    if (!user) {
      await revokeSessionByTokenId(tokenId);
      return res.status(401).json({ message: "User no longer exists" });
    }

    // Block suspended or pending users from silently refreshing tokens.
    // authMiddleware.ts checks this on every authenticated request, but
    // catching it here too prevents a new access token being issued at all.
    if (user.status === "suspended") {
      await revokeSessionByTokenId(tokenId);
      return res.status(403).json({ message: "Account suspended" });
    }

    if (user.status === "pending") {
      await revokeSessionByTokenId(tokenId);
      return res.status(403).json({ message: "Account pending approval" });
    }

    // Rotate the session — revoke the old tokenId and create a new one.
    // This means each refresh token can only be used once, limiting the
    // window in which a stolen refresh token can be exploited.
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

    // Mint the new access token using the live role from the users table,
    // not session.role which could be stale
    const newAccessToken = jwt.sign(
      {
        id: session.user_id,
        role: user.role,
        sid: newTokenId,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );

    res.cookie("refreshToken", `${newTokenId}.${newRawToken}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth/refresh",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    // Every explicit auth decision above (no token, expired session,
    // revoked session, suspended/pending user) already returns its own
    // 401/403 before this point. Anything that lands here is an
    // unexpected/infrastructure failure (e.g. a dropped DB connection) —
    // it is NOT proof the session is invalid, so it must not be a 401/500
    // that the frontend interprets as "log this user out". 503 tells the
    // frontend this is transient and safe to retry.
    console.error("refresh error:", error);
    return res
      .status(503)
      .json({ message: "Service temporarily unavailable. Please try again." });
  }
};
