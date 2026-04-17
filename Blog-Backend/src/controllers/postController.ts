import { Response } from "express";
import {
  PaginationQuery,
  PaginationRequest,
} from "@/types/pagination.types.js";
import {
  createPost,
  getPosts,
  getPostStats,
  getPostById,
  updatePost,
  publishPost,
  deletePost,
  schedulePost, // Add this
} from "@/models/postModel.js";

export const createNewPost = async (req: Request, res: Response) => {
  // 1. Explicitly type the destructured body
  const {
    categoryId,
    title,
    slug,
    content,
    excerpt,
    featuredImage,
    status,
    scheduledDate,
  }: {
    categoryId: string;
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    featuredImage?: string;
    status?: "draft" | "published" | "scheduled"; // Match your model's expected strings
    scheduledDate?: string;
  } = req.body;

  if (!categoryId || !title || !slug || !content) {
    return res.status(400).json({
      message: "CategoryId, title, slug, and content are required",
    });
  }

  let scheduleTime: Date | undefined;
  if (status === "scheduled" || scheduledDate) {
    if (!scheduledDate) {
      return res.status(400).json({
        message: "scheduledDate is required for scheduled posts",
      });
    }
    scheduleTime = new Date(scheduledDate);
    if (isNaN(scheduleTime.getTime()) || scheduleTime <= new Date()) {
      return res.status(400).json({
        message: "Scheduled date must be a valid future date",
      });
    }
  }

  try {
    // 2. Use Type Assertion for the status to satisfy the model
    const post = await createPost({
      authorId: req.user!.id,
      categoryId: categoryId || null,
      title,
      slug,
      content,
      excerpt: excerpt || "",
      featuredImage: featuredImage || "",
      status: (status || "draft") as "draft" | "published" | "scheduled",
      // 3. Only include scheduledDate if scheduleTime is actually defined
      ...(scheduleTime && { scheduledDate: scheduleTime }),
    });

    res.status(201).json(post);
  } catch (error: any) {
    // ... rest of your catch block
  }
};

export const fetchPosts = async (req: PaginationRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const offset = Number(req.query.offset) || 0;
    const status = String(req.query.status || "published"); // hardcoded, or req.query.status

    const posts = await getPosts(status, limit, offset);

    const hasMore = posts.length === limit;

    res.json({ posts, limit, offset, hasMore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

export const fetchPostStats = async (req: Request, res: Response) => {
  try {
    const stats = await getPostStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

export const updateExistingPost = async (req: Request, res: Response) => {
  const { categoryId, title, slug, content, excerpt, featuredImage } = req.body;

  const id = req.params.id;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  // Fetch the post first
  const post = await getPostById(id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  // Ownership check
  if (post.author_id !== req.user!.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  // Build updates dynamically
  const updates: {
    categoryId?: string | null;
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    featuredImage?: string;
  } = {};

  if (categoryId !== undefined) updates.categoryId = categoryId;
  if (title !== undefined) updates.title = title;
  if (slug !== undefined) updates.slug = slug;
  if (content !== undefined) updates.content = content;
  if (excerpt !== undefined) updates.excerpt = excerpt;
  if (featuredImage !== undefined) updates.featuredImage = featuredImage;

  const updated = await updatePost(id, updates);

  res.json(updated);
};

// Update publishExistingPost to handle scheduled posts
export const publishExistingPost = async (req: Request, res: Response) => {
  const id = req.params.id;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  const post = await getPostById(id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (post.status === "published") {
    return res.status(400).json({
      message: "Already published",
    });
  }

  const updated = await publishPost(id);
  res.json(updated);
};

export const removePost = async (req: Request, res: Response) => {
  const id = req.params.id;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }
  const post = await getPostById(id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (post.author_id !== req.user!.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  await deletePost(id);

  res.json({ message: "Post deleted" });
};

// =============================================
// Create a scheduled post directly
// =============================================
export const createScheduledPost = async (req: Request, res: Response) => {
  const {
    categoryId,
    title,
    slug,
    content,
    excerpt,
    featuredImage,
    scheduledDate,
  } = req.body;

  if (!categoryId || !title || !slug || !content || !scheduledDate) {
    return res.status(400).json({
      message:
        "CategoryId, title, slug, content, and scheduledDate are required",
    });
  }

  const scheduleTime = new Date(scheduledDate);
  if (isNaN(scheduleTime.getTime()) || scheduleTime <= new Date()) {
    return res.status(400).json({
      message: "Scheduled date must be a valid future date",
    });
  }

  try {
    const post = await createPost({
      authorId: req.user!.id,
      categoryId: categoryId || null,
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      status: "scheduled",
      scheduledDate: scheduleTime,
    });

    res.status(201).json(post);
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(400).json({
        message: "Slug already exists",
      });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// Schedule an existing post
// =============================================
export const scheduleExistingPost = async (req: Request, res: Response) => {
  const id = req.params.id;
  const { scheduledDate } = req.body;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  if (!scheduledDate) {
    return res.status(400).json({ message: "scheduledDate is required" });
  }

  const scheduleTime = new Date(scheduledDate);
  if (isNaN(scheduleTime.getTime()) || scheduleTime <= new Date()) {
    return res.status(400).json({
      message: "Scheduled date must be a valid future date",
    });
  }

  const post = await getPostById(id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  // Check ownership
  if (post.author_id !== req.user!.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  // Cannot schedule already published posts
  if (post.status === "published") {
    return res.status(400).json({
      message: "Cannot schedule already published posts",
    });
  }

  const updated = await schedulePost(id, scheduleTime);
  res.json(updated);
};
