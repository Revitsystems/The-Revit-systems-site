import { pool } from "@/config/db.js";
import { Category, CreateCategoryInput, UpdateCategoryInput } from "@/types/category.types.js";

/**
 * Retrieve all categories, optionally filtered to only top-level (no parent).
 * Returns rows ordered alphabetically by name.
 */
export const getAllCategories = async (topLevelOnly = false): Promise<Category[]> => {
  const query = topLevelOnly
    ? `SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name ASC`
    : `SELECT * FROM categories ORDER BY name ASC`;

  const result = await pool.query(query);
  return result.rows;
};

/**
 * Retrieve a single category by its UUID.
 */
export const getCategoryById = async (id: string): Promise<Category | undefined> => {
  const result = await pool.query(
    `SELECT * FROM categories WHERE id = $1`,
    [id]
  );
  return result.rows[0];
};

/**
 * Retrieve a single category by its unique slug.
 */
export const getCategoryBySlug = async (slug: string): Promise<Category | undefined> => {
  const result = await pool.query(
    `SELECT * FROM categories WHERE slug = $1`,
    [slug]
  );
  return result.rows[0];
};

/**
 * Retrieve all immediate children of a given parent category.
 */
export const getChildCategories = async (parentId: string): Promise<Category[]> => {
  const result = await pool.query(
    `SELECT * FROM categories WHERE parent_id = $1 ORDER BY name ASC`,
    [parentId]
  );
  return result.rows;
};

/**
 * Insert a new category row.
 * Name and slug must be unique — the DB constraint will throw on conflict.
 */
export const createCategory = async (input: CreateCategoryInput): Promise<Category> => {
  const { name, slug, description, parentId } = input;

  const result = await pool.query(
    `INSERT INTO categories (name, slug, description, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, slug ?? null, description ?? null, parentId ?? null]
  );

  return result.rows[0];
};

/**
 * Perform a partial update on a category.
 * Only the fields present in `updates` are changed.
 */
export const updateCategory = async (
  id: string,
  updates: UpdateCategoryInput
): Promise<Category | undefined> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${index++}`);
    values.push(updates.name);
  }

  if (updates.slug !== undefined) {
    fields.push(`slug = $${index++}`);
    values.push(updates.slug);
  }

  if (updates.description !== undefined) {
    fields.push(`description = $${index++}`);
    values.push(updates.description);
  }

  if (updates.parentId !== undefined) {
    fields.push(`parent_id = $${index++}`);
    values.push(updates.parentId);
  }

  if (fields.length === 0) {
    throw new Error("No fields provided for update");
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE categories SET ${fields.join(", ")} WHERE id = $${index} RETURNING *`,
    values
  );

  return result.rows[0];
};

/**
 * Delete a category by ID.
 * Posts referencing this category will have their category_id set to NULL (ON DELETE SET NULL).
 */
export const deleteCategory = async (id: string): Promise<void> => {
  await pool.query(`DELETE FROM categories WHERE id = $1`, [id]);
};
