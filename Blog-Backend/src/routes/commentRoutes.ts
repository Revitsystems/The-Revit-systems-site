import { Router } from "express";
import {
  fetchApprovedComments,
  fetchCommentReplies,
  fetchAllCommentsForAdmin,
  postStaffComment,
  postGuestComment,
  moderateComment,
  replyToComment,
  removeComment,
} from "@/controllers/commentController.js";
import { authenticate } from "@/middleware/authMiddleware.js";
import { authorize } from "@/middleware/roleMiddleware.js";

// ─────────────────────────────────────────────────────────────
// Post-scoped comment routes
// Mount at: /posts/:postId/comments
// ─────────────────────────────────────────────────────────────
export const postCommentRouter = Router({ mergeParams: true });

// GET /posts/:postId/comments — public
postCommentRouter.get("/", fetchApprovedComments);

// POST /posts/:postId/comments — staff comment (authenticated)
postCommentRouter.post("/", authenticate, postStaffComment);

// POST /posts/:postId/comments/guest — guest comment (public)
postCommentRouter.post("/guest", postGuestComment);

// ─────────────────────────────────────────────────────────────
// Standalone comment routes
// Mount at: /comments
// ─────────────────────────────────────────────────────────────
export const commentRouter = Router();

// GET /comments — admin moderation list
commentRouter.get(
  "/",
  authenticate,
  authorize("admin", "editor"),
  fetchAllCommentsForAdmin
);

// GET /comments/:id/replies — public thread replies
commentRouter.get("/:id/replies", fetchCommentReplies);

// POST /comments/:id/reply — staff reply to a comment
commentRouter.post("/:id/reply", authenticate, replyToComment);

// PATCH /comments/:id/status — admin moderation
commentRouter.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "editor"),
  moderateComment
);

// DELETE /comments/:id — admin delete
commentRouter.delete("/:id", authenticate, authorize("admin"), removeComment);
