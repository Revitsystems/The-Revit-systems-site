import { Request, Response } from "express";
import {
  getApprovedCommentsByPostId,
  getCommentReplies,
  getAllCommentsForAdmin,
  getCommentById,
  createStaffComment,
  createGuestComment,
  updateCommentStatus,
  markCommentAsReplied,
  deleteComment,
} from "@/models/commentModel.js";
import {
  CreateStaffCommentInput,
  CreateGuestCommentInput,
} from "@/types/comment.types.js";
import { createNotification } from "@/models/notificationModel.js";
import { pool } from "@/config/db.js";

// ── Notification helpers ───────────────────────────────────────────────────

// Notify all active users of specified roles
const notifyRoles = async (
  roles: string[],
  type: string,
  message: string,
  link?: string,
  excludeUserId?: string
): Promise<void> => {
  try {
    const placeholders = roles.map((_, i) => `$${i + 1}`).join(", ");
    const result = await pool.query(
      `SELECT id FROM users WHERE role IN (${placeholders}) AND status = 'active'`,
      roles
    );
    const targets = result.rows.filter(
      (u: { id: string }) => u.id !== excludeUserId
    );
    await Promise.all(
      targets.map((u: { id: string }) =>
        createNotification({
          userId: u.id,
          type,
          message,
          ...(link ? { link } : {}),
        })
      )
    );
  } catch (err) {
    console.error("[notifyRoles] Failed:", err);
  }
};

// Notify a single specific user
const notifyUser = async (
  userId: string,
  type: string,
  message: string,
  link?: string
): Promise<void> => {
  try {
    await createNotification({
      userId,
      type,
      message,
      ...(link ? { link } : {}),
    });
  } catch (err) {
    console.error("[notifyUser] Failed:", err);
  }
};

// ============================================
// GET /posts/:postId/comments
// ============================================
export const fetchApprovedComments = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;

  if (!postId || Array.isArray(postId)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    const comments = await getApprovedCommentsByPostId(postId, limit, offset);
    const hasMore = comments.length === limit;
    res.json({ comments, limit, offset, hasMore });
  } catch (error) {
    console.error("fetchApprovedComments error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// GET /comments/:id/replies
// ============================================
export const fetchCommentReplies = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "Invalid comment ID" });
  }

  try {
    const replies = await getCommentReplies(id);
    res.json(replies);
  } catch (error) {
    console.error("fetchCommentReplies error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// GET /comments  (admin moderation list)
// ============================================
export const fetchAllCommentsForAdmin = async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;
  const status = req.query.status as string | undefined;

  const validStatuses = ["approved", "pending", "rejected"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status filter" });
  }

  try {
    const comments = await getAllCommentsForAdmin(limit, offset, status);
    const hasMore = comments.length === limit;
    res.json({ comments, limit, offset, hasMore });
  } catch (error) {
    console.error("fetchAllCommentsForAdmin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// POST /posts/:postId/comments  (staff)
// ============================================
export const postStaffComment = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { commentText, parentId } = req.body;

  if (!postId || Array.isArray(postId)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  if (
    !commentText ||
    typeof commentText !== "string" ||
    commentText.trim().length === 0
  ) {
    return res.status(400).json({ message: "commentText is required" });
  }

  const input: CreateStaffCommentInput = {
    postId,
    commentText: commentText.trim(),
  };

  if (typeof parentId === "string" && parentId.trim().length > 0) {
    input.parentId = parentId.trim();
  }

  try {
    const comment = await createStaffComment(input, req.user!.id);
    res.status(201).json(comment);
  } catch (error) {
    console.error("postStaffComment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// POST /posts/:postId/comments/guest  (public)
// ============================================
export const postGuestComment = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { visitorName, visitorEmail, commentText, parentId } = req.body;

  if (!postId || Array.isArray(postId)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  if (
    !visitorName ||
    typeof visitorName !== "string" ||
    visitorName.trim().length === 0
  ) {
    return res.status(400).json({ message: "visitorName is required" });
  }

  if (
    !commentText ||
    typeof commentText !== "string" ||
    commentText.trim().length === 0
  ) {
    return res.status(400).json({ message: "commentText is required" });
  }

  const input: CreateGuestCommentInput = {
    postId,
    visitorName: visitorName.trim(),
    commentText: commentText.trim(),
  };

  if (typeof visitorEmail === "string" && visitorEmail.trim().length > 0) {
    input.visitorEmail = visitorEmail.trim();
  }

  if (typeof parentId === "string" && parentId.trim().length > 0) {
    input.parentId = parentId.trim();
  }

  try {
    const comment = await createGuestComment(input);

    // Notify admins + editors: new comment needs moderation
    // Authors are NOT notified — moderation is not their responsibility.
    // They get notified separately when a comment is approved (see moderateComment).
    notifyRoles(
      ["admin", "editor"],
      "comment",
      `New comment from ${input.visitorName} is pending review.`
    );

    res.status(201).json(comment);
  } catch (error) {
    console.error("postGuestComment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// PATCH /comments/:id/status  (admin only)
// ============================================
export const moderateComment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "Invalid comment ID" });
  }

  const validStatuses = ["approved", "pending", "rejected"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid status. Must be approved, pending, or rejected",
    });
  }

  try {
    const updated = await updateCommentStatus(id, status);

    if (!updated) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // When a comment is approved, notify the post author so they know
    // someone engaged with their content.
    if (status === "approved" && updated.post_id) {
      try {
        const postResult = await pool.query(
          `SELECT author_id, title FROM posts WHERE id = $1`,
          [updated.post_id]
        );
        const post = postResult.rows[0];
        if (post?.author_id) {
          notifyUser(
            post.author_id,
            "comment",
            `A comment on your post "${post.title}" has been approved and is now live.`
          );
        }
      } catch (err) {
        console.error("[moderateComment] Failed to notify author:", err);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error("moderateComment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// POST /comments/:id/reply  (staff)
// ============================================
export const replyToComment = async (req: Request, res: Response) => {
  const { id: parentId } = req.params;
  const { commentText } = req.body;

  if (!parentId || Array.isArray(parentId)) {
    return res.status(400).json({ message: "Invalid comment ID" });
  }

  if (
    !commentText ||
    typeof commentText !== "string" ||
    commentText.trim().length === 0
  ) {
    return res.status(400).json({ message: "commentText is required" });
  }

  try {
    const parentComment = await getCommentById(parentId);

    if (!parentComment) {
      return res.status(404).json({ message: "Parent comment not found" });
    }

    const reply = await createStaffComment(
      {
        postId: parentComment.post_id,
        commentText: commentText.trim(),
        parentId,
      },
      req.user!.id
    );

    await markCommentAsReplied(parentId, req.user!.id);

    res.status(201).json(reply);
  } catch (error) {
    console.error("replyToComment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// DELETE /comments/:id  (admin only)
// ============================================
export const removeComment = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "Invalid comment ID" });
  }

  try {
    const existing = await getCommentById(id);

    if (!existing) {
      return res.status(404).json({ message: "Comment not found" });
    }

    await deleteComment(id);
    res.json({ message: "Comment deleted" });
  } catch (error) {
    console.error("removeComment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
