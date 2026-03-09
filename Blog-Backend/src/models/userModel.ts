import { pool } from "@/config/db.js";

export const createUser = async (
  first_name: string,
  last_name: string,
  email: string,
  password_hash: string,
  role: string = "user"
) => {
  const result = await pool.query(
    "INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [first_name, last_name, email, password_hash, role]
  );

  return result.rows[0];
};

export const findUserByEmail = async (email: string) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  console.log(result.rows[0]);
  return result.rows[0];
};
