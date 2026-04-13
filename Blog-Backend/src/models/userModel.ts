import { pool } from "@/config/db.js";

export const createUser = async (
  first_name: string,
  last_name: string,
  email: string,
  password_hash: string,
  role: string = "user",
  status: string = "pending" // Added status parameter
) => {
  const result = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, status) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING id, email, first_name, last_name, status`,
    [first_name, last_name, email, password_hash, role, status]
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

export const updateLastLogin = async (userId: string) => {
  const result = await pool.query(
    "UPDATE users SET last_login = NOW() WHERE id = $1",
    [userId]
  );

  return result;
};
