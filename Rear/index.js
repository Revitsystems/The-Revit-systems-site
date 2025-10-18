// server.js
import express from "express";
import pkg from "pg";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// ✅ Middlewares
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Health check
app.get("/", (req, res) => {
  res.send("🚀 Local API working perfectly!");
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
    const result = await pool.query(`
      SELECT 
        title,
        excerpt,
        content,
        cover_image_url
      FROM posts
    `);
    return res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.get("/blog/status-counts", async (req, res) => {
  try {
    const countsQuery = `
      SELECT 
        status,
        COUNT(*) AS count
      FROM posts
      GROUP BY status
    `;

    const postsQuery = `
      SELECT 
        id,
        title,
        status,
        created_at
      FROM posts
      ORDER BY created_at DESC
    `;

    const [countsResult, postsResult] = await Promise.all([
      pool.query(countsQuery),
      pool.query(postsQuery),
    ]);

    return res.json({
      counts: countsResult.rows,
      posts: postsResult.rows,
    });
  } catch (err) {
    console.error("❌ Error fetching blog data:", err);
    res.status(500).json({ error: "Failed to fetch blog data" });
  }
});

// ==========================================
// 📧 CONTACT FORM EMAIL
// ==========================================

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: `"${name}" <${process.env.EMAIL_USER}>`,
    to: "revitsystems@gmail.com",
    subject: `New contact message from ${name}`,
    html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res
      .status(201)
      .json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Email send error:", error);
    res.status(500).json({
      success: false,
      message: "Email unsuccessful. Please try again later.",
    });
  }
});

// ==========================================
// 🚀 START SERVER
// ==========================================
app.listen(port, () => {
  console.log(`🔥 Server running on http://localhost:${port}`);
});
