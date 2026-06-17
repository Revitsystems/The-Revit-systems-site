import { Router } from "express";
import {
  fetchAllUsers,
  fetchUserById,
  editUser,
  removeUser,
} from "@/controllers/userController.js";
import { authenticate } from "@/middleware/authMiddleware.js";
import { authorize } from "@/middleware/roleMiddleware.js";

const router = Router();

// All user management routes are admin-only
router.use(authenticate, authorize("admin"));

// GET  /users          — paginated list with optional ?status= ?role= filters
router.get("/", fetchAllUsers);

// GET  /users/:id      — single user
router.get("/:id", fetchUserById);

// PATCH /users/:id     — edit name, role, status
router.patch("/:id", editUser);

// DELETE /users/:id    — permanently remove
router.delete("/:id", removeUser);

export default router;
