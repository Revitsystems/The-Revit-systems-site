import { Router } from "express";
import {
  fetchAllCategories,
  fetchCategoryById,
  fetchCategoryBySlug,
  fetchChildCategories,
  addCategory,
  editCategory,
  removeCategory,
} from "@/controllers/categoryController.js";
import { authenticate } from "@/middleware/authMiddleware.js";
import { authorize } from "@/middleware/roleMiddleware.js";

const router = Router();

// ── Public reads ──────────────────────────────────────────────
// GET /categories?topLevel=true
router.get("/", fetchAllCategories);

// GET /categories/slug/:slug  — must come before /:id to avoid slug being parsed as an id
router.get("/slug/:slug", fetchCategoryBySlug);

// GET /categories/:id
router.get("/:id", fetchCategoryById);

// GET /categories/:id/children
router.get("/:id/children", fetchChildCategories);

// ── Admin writes ──────────────────────────────────────────────
// POST /categories
router.post("/", authenticate, authorize("admin"), addCategory);

// PATCH /categories/:id
router.patch("/:id", authenticate, authorize("admin"), editCategory);

// DELETE /categories/:id
router.delete("/:id", authenticate, authorize("admin"), removeCategory);

export default router;
