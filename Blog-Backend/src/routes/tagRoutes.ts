import { Router } from "express";
import {
  fetchAllTags,
  fetchTagById,
  addTag,
  removeTag,
} from "@/controllers/tagController.js";
import { authenticate } from "@/middleware/authMiddleware.js";
import { authorize } from "@/middleware/roleMiddleware.js";

const router = Router();

// ── Public reads ──────────────────────────────────────────────
// GET /tags
router.get("/", fetchAllTags);

// GET /tags/:id
router.get("/:id", fetchTagById);

// ── Admin/editor writes ───────────────────────────────────────
// POST /tags
router.post("/", authenticate, authorize("admin", "editor"), addTag);

// DELETE /tags/:id
router.delete("/:id", authenticate, authorize("admin"), removeTag);

export default router;
