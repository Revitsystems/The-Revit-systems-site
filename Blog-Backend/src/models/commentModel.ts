import { pool } from "@/config/db.js";
import {
  Comment,
  CreateStaffCommentInput,
  CreateGuestCommentInput,
} from "@/types/comment.types.js";

/**
 * Retrieve all approved top-level comments for a post, paginated.
 * Replies (parent_id IS NOT NULL) are excluded — fetch them separately via getCommentReplies.
 */
export const getApprovedCommentsByPostId = async (
  postId: string,
  limit: number,
  offset: number
): Promise<Comment[]> => {
  const result = await pool.query(
    `SELECT * FROM comments
     WHERE post_id = $1
       AND parent_id IS NULL
       AND status = 'approved'
     ORDER BY created_at ASC
     LIMIT $2 OFFSET $3`,
    [postId, limit, offset]
  );
  return result.rows;
};

/**
 * Retrieve all direct replies to a specific comment.
 */
export const getCommentReplies = async (parentCommentId: string): Promise<Comment[]> => {
  const result = await pool.query(
    `SELECT * FROM comments
     WHERE parent_id = $1 AND status = 'approved'
     ORDER BY created_at ASC`,
    [parentCommentId]
  );
  return result.rows;
};

/**
 * Retrieve all comments across all posts for admin moderation, paginated.
 * Includes all statuses.
 */
export const getAllCommentsForAdmin = async (
  limit: number,
  offset: number,
  status?: string
): Promise<Comment[]> => {
  const hasStatusFilter = Boolean(status);

  const result = await pool.query(
    `SELECT * FROM comments
     ${hasStatusFilter ? "WHERE status = $3" : ""}
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    hasStatusFilter ? [limit, offset, status] : [limit, offset]
  );
  return result.rows;
};

/**
 * Retrieve a single comment by its UUID.
 */
export const getCommentById = async (id: string): Promise<Comment | undefined> => {
  const result = await pool.query(
    `SELECT * FROM comments WHERE id = $1`,
    [id]
  );
  return result.rows[0];
};

/**
 * Insert a comment authored by a registered staff user.
 * Status defaults to 'approved' since staff are trusted.
 */
export const createStaffComment = async (
  input: CreateStaffCommentInput,
  authorId: string
): Promise<Comment> => {
  const result = await pool.query(
    `INSERT INTO comments (post_id, author_id, comment_text, parent_id, status)
     VALUES ($1, $2, $3, $4, 'approved')
     RETURNING *`,
    [input.postId, authorId, input.commentText, input.parentId ?? null]
  );
  return result.rows[0];
};

/**
 * Insert a comment authored by an anonymous guest visitor.
 * Status defaults to 'pending' since guest input requires moderation.
 */
export const createGuestComment = async (
  input: CreateGuestCommentInput
): Promise<Comment> => {
  const result = await pool.query(
    `INSERT INTO comments
       (post_id, visitor_name, visitor_email, comment_text, parent_id, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [
      input.postId,
      input.visitorName,
      input.visitorEmail ?? null,
      input.commentText,
      input.parentId ?? null,
    ]
  );
  return result.rows[0];
};

/**
 * Update the moderation status of a comment (admin only).
 */
export const updateCommentStatus = async (
  id: string,
  status: "approved" | "pending" | "rejected"
): Promise<Comment | undefined> => {
  const result = await pool.query(
    `UPDATE comments SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0];
};

/**
 * Record that a staff user replied to a comment.
 * Sets replied_by and replied_at on the target comment row.
 */
export const markCommentAsReplied = async (
  commentId: string,
  repliedByUserId: string
): Promise<Comment | undefined> => {
  const result = await pool.query(
    `UPDATE comments
     SET replied_by = $1, replied_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [repliedByUserId, commentId]
  );
  return result.rows[0];
};

/**
 * Delete a comment by ID.
 * Child replies will cascade-delete automatically via FK.
 */
export const deleteComment = async (id: string): Promise<void> => {
  await pool.query(`DELETE FROM comments WHERE id = $1`, [id]);
};
