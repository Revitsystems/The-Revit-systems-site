import { pool } from "../config/db";

export const createUser = async (
  name: string,
  email: string,
  password: string,
  role: string = "user"
) => {
  const result = await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING *",
    [name, email, password, role]
  );

  return result.rows[0];
};

export const findUserByEmail = async (email: string) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  return result.rows[0];
};
