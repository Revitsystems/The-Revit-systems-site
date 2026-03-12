import { pool } from "@/config/db.js";

// ================================
// Handles creation of blog posts
// ================================

export const createPost = async ({
  authorId,
  categoryId,
  title,
  slug,
  content,
  excerpt,
  featuredImage,
}: {
  authorId: string;
  categoryId: string | null;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
}) => {
  const result = await pool.query(
    `
    INSERT INTO posts (
      author_id,
      category_id,
      title,
      slug,
      content,
      excerpt,
      featured_image,
      status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,'draft')
    RETURNING *
    `,
    [
      authorId,
      categoryId,
      title,
      slug,
      content,
      excerpt || null,
      featuredImage || null,
    ]
  );

  return result.rows[0];
};

// =============================================
// Handles getting of blog posts with pagination
// =============================================

export const getPosts = async (
  status: string,
  limit: number,
  offset: number
) => {
  const result = await pool.query(
    `
   SELECT
  posts.id,
  posts.title,
  posts.content,
  posts.excerpt,
  posts.created_at,
  posts.status,
  categories.id AS category_id,
  categories.name AS category
FROM posts
JOIN categories
  ON posts.category_id = categories.id
WHERE posts.status = $1
ORDER BY posts.created_at DESC
LIMIT $2 OFFSET $3;`,
    [status, limit, offset]
  );

  return result.rows;
};

// =============================================
// Handles getting of blog posts via ID
// =============================================

export const getPostById = async (id: string) => {
  const result = await pool.query(
    `
    SELECT *
    FROM posts
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0]; // returns undefined if not found
};

// =============================================
// Handles updating of blog posts via ID
// =============================================

export const updatePost = async (
  id: string,
  updates: {
    categoryId?: string | null;
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    featuredImage?: string;
  }
) => {
  const fields: string[] = [];
  const values: any[] = [];
  let index = 1;

  if (updates.categoryId !== undefined) {
    fields.push(`category_id = $${index++}`);
    values.push(updates.categoryId);
  }

  if (updates.title !== undefined) {
    fields.push(`title = $${index++}`);
    values.push(updates.title);
  }

  if (updates.slug !== undefined) {
    fields.push(`slug = $${index++}`);
    values.push(updates.slug);
  }

  if (updates.content !== undefined) {
    fields.push(`content = $${index++}`);
    values.push(updates.content);
  }

  if (updates.excerpt !== undefined) {
    fields.push(`excerpt = $${index++}`);
    values.push(updates.excerpt);
  }

  if (updates.featuredImage !== undefined) {
    fields.push(`featured_image = $${index++}`);
    values.push(updates.featuredImage);
  }

  if (fields.length === 0) {
    throw new Error("No fields provided for update");
  }

  // Always update timestamp
  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  const query = `
    UPDATE posts
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING *
  `;

  values.push(id);

  const result = await pool.query(query, values);

  return result.rows[0];
};

// =============================================
// Handles publishing of blog posts via ID
// =============================================

export const publishPost = async (id: string) => {
  const result = await pool.query(
    `
    UPDATE posts
    SET
      status = 'published',
      published_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
};

// =============================================
// Handles publishing of blog posts via ID
// =============================================

export const deletePost = async (id: string) => {
  await pool.query(`DELETE FROM posts WHERE id = $1`, [id]);
};
