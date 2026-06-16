import * as express from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        // User's UUID from the users table — set by authMiddleware.ts
        id: string;
        // User's role string (e.g. "admin", "editor", "user") — set by authMiddleware.ts
        role: string;
        // Session token ID (tokenId / token_id in sessions table).
        // Set by authMiddleware.ts from the decoded JWT claim "sid".
        // Used by logoutController.ts logoutAll and any code that needs
        // to identify the specific active session.
        sid: string;
      };
    }
  }
}
export {};
