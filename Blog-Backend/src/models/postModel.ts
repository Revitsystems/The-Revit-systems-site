import { pool } from "../config/db";

export const createPost = async (
  title: string,
  content: string,
  authorId: string
) => {
  const result = await pool.query(
    "INSERT INTO posts (title, content, author_id) VALUES ($1,$2,$3) RETURNING *",
    [title, content, authorId]
  );

  return result.rows[0];
};

export const getAllPosts = async () => {
  const result = await pool.query("SELECT * FROM posts");
  return result.rows;
};

export const deletePost = async (id: string) => {
  await pool.query("DELETE FROM posts WHERE id = $1", [id]);
};
