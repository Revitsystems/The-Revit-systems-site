import { Request, Response, NextFunction } from "express"; // Use standard Request
import jwt from "jsonwebtoken";
import { findSessionByTokenId } from "@/models/sessionModel.js";

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

    // 🔥 SESSION VALIDATION (CRITICAL ADDITION)
    const session = await findSessionByTokenId(decoded.sid);

    if (!session || session.is_revoked) {
      return res.status(401).json({ message: "Session invalidated" });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
