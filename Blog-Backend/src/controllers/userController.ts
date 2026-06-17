import { Request, Response } from "express";
import * as UserModel from "@/models/userModel.js";

// ── GET /users ───────────────────────────────────────────────
export const fetchAllUsers = async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;
  const status = req.query.status as string | undefined;
  const role = req.query.role as string | undefined;

  const validStatuses = ["active", "suspended", "pending"];
  const validRoles = ["admin", "editor", "author"];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status filter" });
  }
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role filter" });
  }

  // userController.ts — replace lines 22-27
  try {
    const filters: {
      limit: number;
      offset: number;
      status?: string;
      role?: string;
    } = {
      limit,
      offset,
    };

    if (status) filters.status = status;
    if (role) filters.role = role;

    const users = await UserModel.findManyUsers(filters);
    const hasMore = users.length === limit;

    res.json({ users, limit, offset, hasMore });
  } catch (error) {
    console.error("fetchAllUsers error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ── GET /users/:id ───────────────────────────────────────────
export const fetchUserById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Type Guard: Ensures TypeScript knows 'id' is definitely a string
  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Invalid user ID format" });
  }

  try {
    const user = await UserModel.findUserById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("fetchUserById error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ── PATCH /users/:id ─────────────────────────────────────────
export const editUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Type Guard
  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Invalid user ID format" });
  }

  if (id === req.user!.id) {
    return res
      .status(403)
      .json({ message: "Cannot edit your own account from this endpoint" });
  }

  const { firstName, lastName, role, status } = req.body;
  const validRoles = ["admin", "editor", "author"];
  const validStatuses = ["active", "suspended", "pending"];

  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const updatedUser = await UserModel.updateUserData(id, {
      firstName,
      lastName,
      role,
      status,
    });

    if (!updatedUser) {
      return res
        .status(400)
        .json({ message: "No valid fields provided or user not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("editUser error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ── DELETE /users/:id ────────────────────────────────────────
export const removeUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Type Guard: This completely clears up the red squiggly line!
  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Invalid user ID format" });
  }

  if (id === req.user!.id) {
    return res.status(403).json({ message: "Cannot delete your own account" });
  }

  try {
    const success = await UserModel.deleteUserById(id);
    if (!success) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("removeUser error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
