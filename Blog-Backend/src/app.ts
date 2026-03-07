import express from "express";
import postRoutes from "@/routes/postRoutes.js"; // your post routes file
import 

const app = express();

// Middleware, parsing, etc.
app.use(express.json());

// Mount post routes
app.use("/posts", postRoutes);

export default app;
