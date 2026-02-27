// server.js
import express from "express";
import pkg from "pg";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});
z;
const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Handle ES module path stuff
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "..")));

// ✅ Middlewares
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  express.static(path.join(__dirname, ".."), {
    maxAge: "7d", // Cache static files for 7 days
  })
);

// ✅ Health check
app.get("/", (req, res) => {
  res.send("🚀 Local API working perfectly!");
});

// ✅ Health check
app.get("/ping", async (req, res) => {
  try {
    // Optionally check DB or cache status
    const dbStatus = await pool.query("SELECT 1");
    res.status(200).json({
      message: "Server is alive",
      db: dbStatus ? "Connected" : "Down",
      timestamp: new Date().toISOString(),
    });
    console.log("🚀 Local API working perfectly!");
  } catch (err) {
    res.status(500).json({ message: "Ping failed", error: err.message });
  }
});

// ==========================================
// 🔐 AUTH ROUTES (SIGNUP + LOGIN)
// ==========================================

// === SIGNUP ===
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, phone_number, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );
    if (existingUser.rows.length > 0) {
      console.log(res.status(409).json({ message: "User already exists" }));
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (username, email, phone_number, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, email, role, account_type, created_at`,
      [username, email, phone_number || null, password_hash]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during signup" });
  }
});

// === LOGIN ===
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    // Find user by email
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = rows[0];

    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    // Compare password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    const loginSuccess = validPassword ? true : false;

    // Record login attempt
    await pool.query(
      `INSERT INTO logins (user_id, ip_address, device_info, successful)
       VALUES ($1, $2, $3, $4)`,
      [user.id, req.ip, req.headers["user-agent"], loginSuccess]
    );

    if (!validPassword)
      return res.status(401).json({ message: "Invalid email or password" });

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ==========================================
// 📰 BLOG ROUTES
// ==========================================

app.post("/api/posts/upload", async (req, res) => {
  const { title, excerpt, content, cover_image_url, categories, status } =
    req.body;

  if (!title || !content || !cover_image_url) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const query = `
        INSERT INTO posts
        (title, excerpt, content, cover_image_url, categories, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      title,
      excerpt,
      content,
      cover_image_url,
      categories,
      status,
    ];

    const result = await pool.query(query, values);
    res
      .status(201)
      .json({ message: "Post created successfully", post: result.rows[0] });
  } catch (err) {
    res.status(500).json({
      error: "Failed to create post",
      message: "Database insert failed",
    });
  }
});

app.get("/blog", async (req, res) => {
  try {
    const { categories, limit = 10, offset = 0 } = req.query;

    let query = `
      SELECT 
        title,
        excerpt,
        content,
        cover_image_url,
        categories,
        created_at
      FROM posts
    `;

    const values = [];

    // Apply category filter only if not "All"
    if (categories && categories !== "All") {
      query += " WHERE LOWER(categories) = LOWER($1)";
      values.push(categories);
    }

    // Dynamically determine parameter positions
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    // Order by most recent first
    query += ` ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`;
    values.push(Number(limit), Number(offset));

    const result = await pool.query(query, values);
    return res.json(result.rows);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.put("/blog/publish/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!id) {
      return res.status(400).json({ message: "Post ID is required" });
    }

    const checkPost = await pool.query("SELECT * FROM posts WHERE id = $1", [
      id,
    ]);
    if (checkPost.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    await pool.query(
      "UPDATE posts SET status = 'published', updated_at = NOW() WHERE id = $1",
      [id]
    );

    res.json({ message: "Post published successfully" });
  } catch (error) {
    console.error("Error publishing post:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete("/blog/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Validate id
    if (!id) {
      return res.status(400).json({ message: "Post ID is required" });
    }

    // Check if post exists
    const checkPost = await pool.query("SELECT * FROM posts WHERE id = $1", [
      id,
    ]);
    if (checkPost.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Delete post
    await pool.query("DELETE FROM posts WHERE id = $1", [id]);

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/blog/counts", async (req, res) => {
  try {
    const query = `
      SELECT 
        status,
        COUNT(*) AS count
      FROM posts
      GROUP BY status
    `;

    const result = await pool.query(query);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching counts:", err);
    res.status(500).json({ error: "Failed to fetch blog counts" });
  }
});

app.get("/blog/posts", async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT 
        id,
        title,
        excerpt,
        categories,
        status,
        created_at
      FROM posts
    `;

    const values = [];

    if (status) {
      query += ` WHERE status = $1`;
      values.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching posts:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ==========================================
// 🚀 START SERVER
// ==========================================
app.listen(port, () => {
  console.log(`🔥 Server running on http://localhost:${port}`);
});
