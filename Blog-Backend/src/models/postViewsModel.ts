import { pool } from "@/config/db.js";
import {
  PostView,
  RecordPostViewInput,
  PostViewSummary,
  ReferrerStat,
} from "@/types/analytics.types.js";

/**
 * Insert a single post view event.
 * Called server-side on every public post fetch — not exposed as a direct client endpoint.
 */
export const recordPostView = async (input: RecordPostViewInput): Promise<PostView> => {
  const result = await pool.query(
    `INSERT INTO post_views
       (post_id, visitor_id, ip_address, user_agent, referrer, device_type, session_duration)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.postId,
      input.visitorId ?? null,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      input.referrer ?? null,
      input.deviceType ?? null,
      input.sessionDuration ?? null,
    ]
  );

  // Upsert into referrer_stats in the same call so the two writes stay in sync
  if (input.referrer) {
    await upsertReferrerStat(input.postId, input.referrer);
  }

  return result.rows[0];
};

/**
 * Retrieve paginated raw view events for a specific post (admin analytics).
 */
export const getPostViewsByPostId = async (
  postId: string,
  limit: number,
  offset: number
): Promise<PostView[]> => {
  const result = await pool.query(
    `SELECT * FROM post_views
     WHERE post_id = $1
     ORDER BY viewed_at DESC
     LIMIT $2 OFFSET $3`,
    [postId, limit, offset]
  );
  return result.rows;
};

/**
 * Return an aggregated device-type breakdown for a post.
 */
export const getPostViewSummary = async (postId: string): Promise<PostViewSummary> => {
  const result = await pool.query(
    `SELECT
       COUNT(*) AS total_views,
       COUNT(*) FILTER (WHERE device_type = 'desktop') AS desktop,
       COUNT(*) FILTER (WHERE device_type = 'mobile')  AS mobile,
       COUNT(*) FILTER (WHERE device_type = 'tablet')  AS tablet,
       COUNT(*) FILTER (WHERE device_type IS NULL)      AS unknown
     FROM post_views
     WHERE post_id = $1`,
    [postId]
  );
  return result.rows[0];
};

/**
 * Retrieve referrer stats for a specific post ordered by visit count descending.
 */
export const getReferrerStatsByPostId = async (postId: string): Promise<ReferrerStat[]> => {
  const result = await pool.query(
    `SELECT * FROM referrer_stats
     WHERE post_id = $1
     ORDER BY visit_count DESC, recorded_date DESC`,
    [postId]
  );
  return result.rows;
};

/**
 * Upsert a referrer stat row for today.
 * If a row already exists for (post_id, referrer_url, recorded_date) it increments the count.
 * This is called internally by recordPostView — not exposed as a model export.
 */
const upsertReferrerStat = async (postId: string, referrerUrl: string): Promise<void> => {
  // Derive a human-readable name from the referrer URL hostname
  let referrerName: string;
  try {
    referrerName = new URL(referrerUrl).hostname;
  } catch {
    referrerName = referrerUrl.slice(0, 100);
  }

  await pool.query(
    `INSERT INTO referrer_stats (post_id, referrer_name, referrer_url, visit_count, recorded_date)
     VALUES ($1, $2, $3, 1, CURRENT_DATE)
     ON CONFLICT (post_id, referrer_url, recorded_date)
     DO UPDATE SET visit_count = referrer_stats.visit_count + 1`,
    [postId, referrerName, referrerUrl]
  );
};
