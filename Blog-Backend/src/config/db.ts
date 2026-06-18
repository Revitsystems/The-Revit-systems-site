import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  // Supabase's Session Pooler holds one dedicated backend connection per
  // client connection (closer to a direct connection than the Transaction
  // Pooler), but it — and the network path to it — can still close a
  // connection that's sat idle for a while without telling our pool.
  // Releasing idle clients a bit sooner than the old 30s reduces the window
  // where we try to reuse a connection that's already been dropped.
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 10000,
  // Send TCP keep-alive packets so NAT gateways / firewalls between this
  // machine and Supabase don't silently drop a socket that's briefly idle.
  keepAlive: true,
});

// REQUIRED by node-postgres: Pool is an EventEmitter, and if a pooled client
// emits an 'error' (e.g. the connection gets closed server-side while idle
// in our pool) and nothing is listening for it, Node treats it as an
// uncaught exception and can crash the whole process. This listener just
// logs it — pg's pool already discards the bad client and opens a fresh one
// on the next checkout, so no other action is needed here.
pool.on("error", (err) => {
  console.error("Unexpected error on idle PG client:", err);
});
