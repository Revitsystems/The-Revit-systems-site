import { Request, Response } from "express";
import {
  getAllTags,
  getTagById,
  getTagsByPostId,
  createTag,
  deleteTag,
  attachTagsToPost,
  detachTagFromPost,
  replacePostTags,
} from "@/models/tagModel.js";

// ============================================
// GET /tags
// ============================================
export const fetchAllTags = async (_req: Request, res: Response) => {
  try {
    const tags = await getAllTags();
    res.json(tags);
  } catch (error) {
    console.error("fetchAllTags error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// GET /tags/:id
// ============================================
export const fetchTagById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "Invalid tag ID" });
  }

  try {
    const tag = await getTagById(id);

    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    res.json(tag);
  } catch (error) {
    console.error("fetchTagById error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// GET /posts/:postId/tags
// ============================================
export const fetchTagsForPost = async (req: Request, res: Response) => {
  const { postId } = req.params;

  if (!postId || Array.isArray(postId)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    const tags = await getTagsByPostId(postId);
    res.json(tags);
  } catch (error) {
    console.error("fetchTagsForPost error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// POST /tags  (admin/editor only)
// ============================================
export const addTag = async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ message: "Tag name is required" });
  }

  try {
    const tag = await createTag({ name: name.trim() });
    res.status(201).json(tag);
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Tag name already exists" });
    }
    console.error("addTag error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// DELETE /tags/:id  (admin only)
// ============================================
export const removeTag = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "Invalid tag ID" });
  }

  try {
    const existing = await getTagById(id);

    if (!existing) {
      return res.status(404).json({ message: "Tag not found" });
    }

    await deleteTag(id);
    res.json({ message: "Tag deleted" });
  } catch (error) {
    console.error("removeTag error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// POST /posts/:postId/tags
// Body: { tagIds: string[] }
// ============================================
export const attachPostTags = async (req: Request, res: Response) => {
  const { postId } = req.params;

  if (!postId || Array.isArray(postId)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  const { tagIds } = req.body;

  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    return res
      .status(400)
      .json({ message: "tagIds must be a non-empty array" });
  }

  try {
    await attachTagsToPost(postId, tagIds);
    res.json({ message: "Tags attached successfully" });
  } catch (error) {
    console.error("attachPostTags error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// DELETE /posts/:postId/tags/:tagId
// ============================================
export const detachPostTag = async (req: Request, res: Response) => {
  const { postId, tagId } = req.params;

  if (!postId || Array.isArray(postId)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  if (!tagId || Array.isArray(tagId)) {
    return res.status(400).json({ message: "Invalid tag ID" });
  }

  try {
    await detachTagFromPost(postId, tagId);
    res.json({ message: "Tag removed from post" });
  } catch (error) {
    console.error("detachPostTag error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// PUT /posts/:postId/tags
// Body: { tagIds: string[] }
// ============================================
export const replaceAllPostTags = async (req: Request, res: Response) => {
  const { postId } = req.params;

  if (!postId || Array.isArray(postId)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  const { tagIds } = req.body;

  if (!Array.isArray(tagIds)) {
    return res.status(400).json({ message: "tagIds must be an array" });
  }

  try {
    await replacePostTags(postId, tagIds);
    const updated = await getTagsByPostId(postId);
    res.json(updated);
  } catch (error) {
    console.error("replaceAllPostTags error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
