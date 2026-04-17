import { Request, Response } from "express";

import {
  revokeSessionByTokenId,
  revokeAllSessions,
} from "@/models/sessionModel.js";

export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  const [tokenId] = refreshToken.split(".");

  await revokeSessionByTokenId(tokenId);

  res.json({ message: "Logged out successfully" });
};

export const logoutAll = async (req: Request, res: Response) => {
  const userId = req.user.id;

  await revokeAllSessions(userId);

  res.json({ message: "All sessions revoked" });
};
