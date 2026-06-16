import { Request, Response } from "express";
import {
  revokeSessionByTokenId,
  revokeAllSessions,
} from "@/models/sessionModel.js";

// ============================================
// POST /auth/logout
// Revokes the single session tied to the current access token.
// Requires authenticate middleware (wired in authRoutes.ts) which
// guarantees req.user is populated with id, role, and sid.
//
// The original used req.body.refreshToken to extract the tokenId —
// this was broken because the refreshToken cookie is httpOnly with
// path: "/auth/refresh" (set in authController.ts), meaning
// document.cookie cannot read it on the client, so api.js could
// never actually send it in the request body.
//
// The fix uses req.user.sid which is the tokenId embedded directly
// in the JWT by authController.ts login and refreshController.ts,
// and verified + attached to req.user by authMiddleware.ts.
// ============================================
export const logout = async (req: Request, res: Response) => {
  const sid = req.user!.sid;

  try {
    await revokeSessionByTokenId(sid);
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// POST /auth/logout-all
// Revokes every active session for the logged-in user across all devices.
// Uses req.user.id which is the user's UUID from the users table,
// passed to revokeAllSessions in sessionModel.ts which marks all
// rows in the sessions table with matching user_id as is_revoked = true.
// ============================================
export const logoutAll = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    await revokeAllSessions(userId);
    res.json({ message: "All sessions revoked" });
  } catch (error) {
    console.error("logoutAll error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
