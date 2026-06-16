import { Router } from "express";
import {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  changeUserStatus,
} from "@/controllers/authController.js";
import { refresh } from "@/controllers/refreshController.js";
import { logout, logoutAll } from "@/controllers/logoutController.js";
import { authenticate } from "@/middleware/authMiddleware.js";
import { authorize } from "@/middleware/roleMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

// Logout — revokes the single current session
// Frontend sends the refreshToken in the request body so the server
// can extract the tokenId and mark that session as revoked
router.post("/logout", authenticate, logout);

// Logout all — revokes every active session for the logged-in user
router.post("/logout-all", authenticate, logoutAll);

router.patch(
  "/update-status",
  authenticate,
  authorize("admin"),
  changeUserStatus
);

export default router;
