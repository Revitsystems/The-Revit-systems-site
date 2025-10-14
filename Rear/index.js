import express from "express";
import pkg from "pg";
import cors from "cors";

const { Pool } = pkg;

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "Brio1234",
  database: "The Revit Systems Site",
  port: 5432,
});

const app = express();
const port = 3000;

app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Example route
app.get("/", (req, res) => {
  res.send("Local route working!");
});

app.post("/api/posts/upload", async (req, res) => {
  const { title, excerpt, content, cover_image_url, categories, status } =
    req.body;

  console.log(req.body);

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
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
