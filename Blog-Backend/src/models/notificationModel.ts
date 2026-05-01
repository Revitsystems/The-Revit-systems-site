import { pool } from "@/config/db.js";
import { Notification, CreateNotificationInput } from "@/types/notification.types.js";

/**
 * Retrieve all notifications for a user, newest first, paginated.
 */
export const getNotificationsByUserId = async (
  userId: string,
  limit: number,
  offset: number
): Promise<Notification[]> => {
  const result = await pool.query(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

/**
 * Count how many unread notifications a user has.
 * Used for badge counts in frontends without fetching the full list.
 */
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return Number(result.rows[0].count);
};

/**
 * Insert a new notification for a user.
 */
export const createNotification = async (input: CreateNotificationInput): Promise<Notification> => {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, message, link)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.userId, input.type, input.message, input.link ?? null]
  );
  return result.rows[0];
};

/**
 * Mark a single notification as read.
 * Returns undefined if no row was found.
 */
export const markNotificationAsRead = async (
  id: string,
  userId: string
): Promise<Notification | undefined> => {
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  );
  return result.rows[0];
};

/**
 * Mark all of a user's notifications as read in one query.
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  await pool.query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1`,
    [userId]
  );
};

/**
 * Delete a single notification.
 * Checks ownership via user_id so users cannot delete others' notifications.
 */
export const deleteNotification = async (id: string, userId: string): Promise<void> => {
  await pool.query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
};

/**
 * Delete all notifications for a user (bulk clear).
 */
export const deleteAllNotificationsForUser = async (userId: string): Promise<void> => {
  await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
};
