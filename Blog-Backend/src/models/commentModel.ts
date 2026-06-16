import { pool } from "@/config/db.js";
import {
  Comment,
  CreateStaffCommentInput,
  CreateGuestCommentInput,
} from "@/types/comment.types.js";

/**
 * Retrieve all approved top-level comments for a post, paginated.
 * Replies (parent_id IS NOT NULL) are excluded — fetch them separately
 * via getCommentReplies.
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
 * Only approved replies are returned — pending/rejected replies
 * are not shown publicly.
 */
export const getCommentReplies = async (
  parentCommentId: string
): Promise<Comment[]> => {
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
 *
 * Joins the posts table to include post_title so the admin moderation
 * list in renderers.js shows a readable title instead of a raw UUID.
 * api.js normalises this as postTitle: c.post_title || c.post_id
 * so it degrades gracefully if a post has been deleted.
 *
 * Fixed: original used SELECT * FROM comments with no join, meaning
 * post_id (a UUID) was all the admin could see for each comment's
 * origin post in the moderation list.
 *
 * Fixed: original parameter binding was broken — used positional
 * params $1/$2 for limit/offset but then $3 for status in a
 * conditional string concatenation. When status was provided,
 * the query became:
 *   SELECT * FROM comments WHERE status = $3 ... LIMIT $1 OFFSET $2
 * with values [limit, offset, status] — $3 maps to status correctly
 * but this is fragile and hard to read. Rewritten with explicit
 * branching for clarity and correctness.
 */
export const getAllCommentsForAdmin = async (
  limit: number,
  offset: number,
  status?: string
): Promise<(Comment & { post_title: string | null })[]> => {
  const result = status
    ? await pool.query(
        `SELECT
           comments.*,
           posts.title AS post_title
         FROM comments
         LEFT JOIN posts ON comments.post_id = posts.id
         WHERE comments.status = $1
         ORDER BY comments.created_at DESC
         LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      )
    : await pool.query(
        `SELECT
           comments.*,
           posts.title AS post_title
         FROM comments
         LEFT JOIN posts ON comments.post_id = posts.id
         ORDER BY comments.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

  return result.rows;
};

/**
 * Retrieve a single comment by its UUID.
 * Used by replyToComment and removeComment in commentController.ts
 * to verify the comment exists before acting on it.
 */
export const getCommentById = async (
  id: string
): Promise<Comment | undefined> => {
  const result = await pool.query(`SELECT * FROM comments WHERE id = $1`, [id]);
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
 * Valid statuses: "approved" | "pending" | "rejected"
 * Validated upstream in commentController.ts moderateComment.
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
 * Called by replyToComment in commentController.ts after the
 * reply comment row is successfully inserted.
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
 * Child replies cascade-delete automatically via the FK constraint
 * on parent_id in the comments table.
 */
export const deleteComment = async (id: string): Promise<void> => {
  await pool.query(`DELETE FROM comments WHERE id = $1`, [id]);
};
