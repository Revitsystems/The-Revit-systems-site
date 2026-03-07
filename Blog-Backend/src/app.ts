import express from "express";
import postRoutes from "@/routes/postRoutes.js"; // your post routes file
import authRoutes from "@/routes/authRoutes.js";

const app = express();

// Middleware, parsing, etc.
app.use(express.json());

// Mount post routes
app.use("/posts", postRoutes);
app.use("/auth", authRoutes);

export default app;
