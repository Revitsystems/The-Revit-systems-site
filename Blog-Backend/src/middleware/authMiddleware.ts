import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { findSessionByTokenId } from "@/models/sessionModel.js";
import { pool } from "@/config/db.js";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      role: string;
      sid: string;
    };

    // Verify the session exists and has not been revoked.
    // This is what makes logout actually work — a revoked session
    // blocks the request even if the JWT itself is still within its 15m window.
    const session = await findSessionByTokenId(decoded.sid);

    if (!session || session.is_revoked) {
      return res.status(401).json({ message: "Session invalidated" });
    }

    // Re-check the user's current status on every request.
    // Without this, a suspended user whose session was not explicitly
    // revoked can keep making authenticated requests until their JWT expires.
    // changeUserStatus in authController.ts updates the users table but does
    // not call revokeAllSessions, so this check is the only safety net.
    const userResult = await pool.query(
      "SELECT status FROM users WHERE id = $1",
      [decoded.id]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Account suspended" });
    }

    if (user.status === "pending") {
      return res.status(403).json({ message: "Account pending approval" });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
