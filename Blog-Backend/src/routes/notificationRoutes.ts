import { Router } from "express";
import {
  fetchMyNotifications,
  fetchUnreadCount,
  sendNotification,
  markOneAsRead,
  markAllAsRead,
  removeNotification,
  removeAllNotifications,
} from "@/controllers/notificationController.js";
import { authenticate } from "@/middleware/authMiddleware.js";
import { authorize } from "@/middleware/roleMiddleware.js";

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// GET /notifications — paginated list for logged-in user
router.get("/", fetchMyNotifications);

// GET /notifications/unread-count — badge count
router.get("/unread-count", fetchUnreadCount);

// POST /notifications — admin creates a notification for any user
router.post("/", authorize("admin"), sendNotification);

// PATCH /notifications/read-all — must come before /:id to avoid conflict
router.patch("/read-all", markAllAsRead);

// PATCH /notifications/:id/read
router.patch("/:id/read", markOneAsRead);

// DELETE /notifications — clear all for logged-in user
router.delete("/", removeAllNotifications);

// DELETE /notifications/:id
router.delete("/:id", removeNotification);

export default router;
