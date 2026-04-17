// Updated postRoutes.ts - COMPLETE FILE

import { Router } from "express";
import {
  createNewPost,
  fetchPosts,
  fetchPostStats,
  updateExistingPost,
  publishExistingPost,
  removePost,
  scheduleExistingPost, // Add this
  createScheduledPost, // Add this
} from "@/controllers/postController.js";

import { authenticate } from "@/middleware/authMiddleware.js";

const router = Router();

// Get posts by status (published, draft, scheduled)
// Query params: status, limit, offset
router.get("/", fetchPosts);

// Get stats
router.get("/stats", authenticate, fetchPostStats);

// Create post (draft by default, or pass status: 'scheduled')
router.post("/", authenticate, createNewPost);

// Create scheduled post directly
router.post("/schedule", authenticate, createScheduledPost);

// Edit post
router.put("/:id", authenticate, updateExistingPost);

// Schedule existing post
router.patch("/:id/schedule", authenticate, scheduleExistingPost);

// Publish post (works for draft or scheduled)
router.patch("/:id/publish", authenticate, publishExistingPost);

// Delete post
router.delete("/:id", authenticate, removePost);

export default router;
