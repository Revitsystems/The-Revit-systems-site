import { pool } from "@/config/db.js";
import { Request } from "express";

export const recordLogin = async (
  userId: string | null,
  req: Request,
  success: boolean
) => {
  const query = `
    INSERT INTO login_logs (user_id, ip_address, user_agent, success)
    VALUES ($1, $2, $3, $4)
  `;

  await pool.query(query, [userId, req.ip, req.headers["user-agent"], success]);
};
