import { Router } from "express";
import {
  fetchTagsForPost,
  attachPostTags,
  detachPostTag,
  replaceAllPostTags,
} from "@/controllers/tagController.js";
import { authenticate } from "@/middleware/authMiddleware.js";

// Mounted at: /posts/:postId  (mergeParams so :postId is accessible)
const router = Router({ mergeParams: true });

// GET /posts/:postId/tags — public
router.get("/tags", fetchTagsForPost);

// POST /posts/:postId/tags — attach tags (authenticated)
router.post("/tags", authenticate, attachPostTags);

// PUT /posts/:postId/tags — replace all tags atomically (authenticated)
router.put("/tags", authenticate, replaceAllPostTags);

// DELETE /posts/:postId/tags/:tagId — detach one tag (authenticated)
router.delete("/tags/:tagId", authenticate, detachPostTag);

export default router;
