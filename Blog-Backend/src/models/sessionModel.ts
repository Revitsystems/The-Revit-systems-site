import { pool } from "@/config/db.js";

export const createSession = async ({
  userId,
  tokenId,
  refreshTokenHash,
  userAgent,
  ipAddress,
  expiresAt,
}: {
  userId: string;
  tokenId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}) => {
  const result = await pool.query(
    `INSERT INTO sessions 
      (user_id, token_id, refresh_token_hash, user_agent, ip_address, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
    [userId, tokenId, refreshTokenHash, userAgent, ipAddress, expiresAt]
  );

  return result.rows[0];
};

export const findSessionByTokenId = async (tokenId: string) => {
  const result = await pool.query(
    `SELECT * FROM sessions WHERE token_id = $1`,
    [tokenId]
  );

  return result.rows[0];
};

export const revokeSessionByTokenId = async (tokenId: string) => {
  await pool.query(
    `UPDATE sessions 
      SET is_revoked = true, updated_at = NOW()
      WHERE token_id = $1`,
    [tokenId]
  );
};

export const revokeAllSessions = async (userId: string) => {
  await pool.query(
    `UPDATE sessions 
     SET is_revoked = true, updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );
};
