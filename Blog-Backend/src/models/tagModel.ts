import { pool } from "@/config/db.js";
import { Tag, CreateTagInput } from "@/types/tag.types.js";

/**
 * Retrieve all tags ordered alphabetically.
 */
export const getAllTags = async (): Promise<Tag[]> => {
  const result = await pool.query(`SELECT * FROM tags ORDER BY name ASC`);
  return result.rows;
};

/**
 * Retrieve a single tag by its UUID.
 */
export const getTagById = async (id: string): Promise<Tag | undefined> => {
  const result = await pool.query(`SELECT * FROM tags WHERE id = $1`, [id]);
  return result.rows[0];
};

/**
 * Retrieve all tags attached to a specific post.
 */
export const getTagsByPostId = async (postId: string): Promise<Tag[]> => {
  const result = await pool.query(
    `SELECT tags.*
     FROM tags
     JOIN post_tags ON tags.id = post_tags.tag_id
     WHERE post_tags.post_id = $1
     ORDER BY tags.name ASC`,
    [postId]
  );
  return result.rows;
};

/**
 * Insert a new tag.
 * Name must be unique — the DB constraint will throw on conflict.
 */
export const createTag = async (input: CreateTagInput): Promise<Tag> => {
  const result = await pool.query(
    `INSERT INTO tags (name) VALUES ($1) RETURNING *`,
    [input.name.trim()]
  );
  return result.rows[0];
};

/**
 * Delete a tag by ID.
 * All post_tags rows referencing this tag will cascade-delete automatically.
 */
export const deleteTag = async (id: string): Promise<void> => {
  await pool.query(`DELETE FROM tags WHERE id = $1`, [id]);
};

/**
 * Attach a set of tag IDs to a post.
 * Uses INSERT ... ON CONFLICT DO NOTHING so calling this multiple times is safe.
 */
export const attachTagsToPost = async (postId: string, tagIds: string[]): Promise<void> => {
  if (tagIds.length === 0) return;

  // Build multi-row VALUES placeholders: ($1,$2), ($1,$3), ...
  const placeholders = tagIds
    .map((_, index) => `($1, $${index + 2})`)
    .join(", ");

  await pool.query(
    `INSERT INTO post_tags (post_id, tag_id) VALUES ${placeholders}
     ON CONFLICT DO NOTHING`,
    [postId, ...tagIds]
  );
};

/**
 * Remove a specific tag from a post.
 */
export const detachTagFromPost = async (postId: string, tagId: string): Promise<void> => {
  await pool.query(
    `DELETE FROM post_tags WHERE post_id = $1 AND tag_id = $2`,
    [postId, tagId]
  );
};

/**
 * Replace all tags on a post atomically.
 * Deletes existing junctions then re-inserts the new set in one transaction.
 */
export const replacePostTags = async (postId: string, tagIds: string[]): Promise<void> => {
  await pool.query("BEGIN");

  try {
    await pool.query(`DELETE FROM post_tags WHERE post_id = $1`, [postId]);

    if (tagIds.length > 0) {
      await attachTagsToPost(postId, tagIds);
    }

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
};
