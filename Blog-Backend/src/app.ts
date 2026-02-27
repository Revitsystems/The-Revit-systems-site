import { Router } from "express";
import {
  createPost,
  updatePost,
  deletePost,
  publishPost,
  getPosts,
} from "./controllers/postController";
import { authenticate } from "./middleware/authMiddleware";
import { authorize } from "./middleware/roleMiddleware";

const router = Router();

// Get all posts (optionally filter by status)
router.get("/", getPosts);

// Create (defaults to draft)
router.post("/", authenticate, createPost);

// Update draft or published post
router.put("/:id", authenticate, updatePost);

// Publish a draft
router.patch("/:id/publish", authenticate, publishPost);

// Delete post
router.delete("/:id", authenticate, authorize("admin"), deletePost);

export default router;
