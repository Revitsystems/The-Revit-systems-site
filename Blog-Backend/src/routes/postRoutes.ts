import { Router } from "express";
import {
  createNewPost,
  fetchPosts,
  updateExistingPost,
  publishExistingPost,
  removePost,
} from "@/controllers/postController.js";

import { authenticate } from "@/middleware/authMiddleware.js";
import { authorize } from "@/middleware/roleMiddleware.js";

const router = Router();

// Get posts (optionally filter by status)
router.get("/", fetchPosts); // works

// Create (default: draft)
router.post("/", authenticate, createNewPost); //works

// Edit draft or published post
router.put("/:id", authenticate, updateExistingPost); // works

// Publish a draft
router.patch("/:id/publish", authenticate, publishExistingPost); //works

// Delete post
router.delete(
  "/:id",
  authenticate, //authorize("admin"),
  removePost
);

export default router;
