import { Router } from "express";
import {
  trackPostView,
  fetchPostViews,
  fetchPostViewSummary,
  fetchReferrerStats,
} from "@/controllers/postViewsController.js";
import { authenticate } from "@/middleware/authMiddleware.js";
import { authorize } from "@/middleware/roleMiddleware.js";

// Mounted at: /posts/:postId  (mergeParams so :postId is accessible)
const router = Router({ mergeParams: true });

// POST /posts/:postId/views — public, called by the frontend on page load
router.post("/views", trackPostView);

// GET /posts/:postId/views — admin raw event list
router.get("/views", authenticate, authorize("admin", "editor"), fetchPostViews);

// GET /posts/:postId/views/summary — admin aggregated summary
router.get("/views/summary", authenticate, authorize("admin", "editor"), fetchPostViewSummary);

// GET /posts/:postId/referrers — admin referrer stats
router.get("/referrers", authenticate, authorize("admin", "editor"), fetchReferrerStats);

export default router;
