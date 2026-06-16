import { Router } from "express";
import { refresh } from "@/controllers/refreshController.js";
import rateLimit from "express-rate-limit";

const router = Router();

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    status: 429,
    message: "Too many refresh attempts. Please log in again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/refresh", refreshLimiter, refresh);

export default router;
