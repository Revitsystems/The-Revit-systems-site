import express from "express";
import postRoutes from "./routes/postRoutes"; // your post routes file

const app = express();

// Middleware, parsing, etc.
app.use(express.json());

// Mount post routes
app.use("/posts", postRoutes);

export default app;
