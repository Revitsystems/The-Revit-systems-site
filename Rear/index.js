import express from "express";
import pkg from "pg";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // ✅ Loads .env variables

const { Pool } = pkg;

// ✅ Use environment variables (better security + flexibility)
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

const app = express();
const port = process.env.PORT || 3000;

// ✅ Middlewares
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Health check route
app.get("/", (req, res) => {
  res.send("🚀 Local API working perfectly!");
});

// ✅ Blog upload route
app.post("/api/posts/upload", async (req, res) => {
  const { title, excerpt, content, cover_image_url, categories, status } =
    req.body;

  console.log("📩 Incoming request body:", req.body);

  // Basic validation
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

    console.log("✅ New post added:", result.rows[0]);
    res
      .status(201)
      .json({ message: "Post created successfully", post: result.rows[0] });
  } catch (err) {
    console.error("❌ Database insert failed:", err);
    res.status(500).json({ error: "Failed to create post" });
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
    console.log("Fetched blog posts:", result.rows);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ✅ Start server
app.listen(port, () => {
  console.log(`🔥 Server running on http://localhost:${port}`);
});
