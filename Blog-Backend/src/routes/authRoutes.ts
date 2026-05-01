import { Router } from "express";
import {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  changeUserStatus,
} from "@/controllers/authController.js";
import { refresh } from "@/controllers/refreshController.js";
import { authenticate } from "@/middleware/authMiddleware.js";

import { authorize } from "@/middleware/roleMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/forgot-password", requestPasswordReset); // The "Send Email" step
router.post("/reset-password", resetPassword); // The "Update Password" step
router.patch(
  "/update-status",
  authenticate, // Step 1: Check if token is valid
  authorize("admin"), // Step 2: Check if req.user.role === 'admin'
  changeUserStatus // Step 3: Run the controller logic
);

export default router;
