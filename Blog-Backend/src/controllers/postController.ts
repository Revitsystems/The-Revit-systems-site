import { Request, Response } from "express";
import { PaginationRequest } from "@/types/pagination.types.js";
import {
  createPost,
  getPosts,
  getPostStats,
  getPostById,
  updatePost,
  publishPost,
  deletePost,
  schedulePost,
} from "@/models/postModel.js";

// =============================================
// Create a new post (draft, published, or scheduled)
// =============================================
export const createNewPost = async (req: Request, res: Response) => {
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
    status?: "draft" | "published" | "scheduled";
    scheduledDate?: string;
  } = req.body;

  if (!title || !slug || !content) {
    return res.status(400).json({
      message: "Title, slug, and content are required",
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
    const post = await createPost({
      authorId: req.user!.id,
      // categoryId is optional — a post can exist without a category
      categoryId: categoryId || null,
      title,
      slug,
      content,
      excerpt: excerpt || "",
      featuredImage: featuredImage || "",
      status: (status || "draft") as "draft" | "published" | "scheduled",
      ...(scheduleTime && { scheduledDate: scheduleTime }),
    });

    res.status(201).json(post);
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Slug already exists" });
    }
    console.error("createNewPost error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// Fetch posts — supports status filter and pagination
// =============================================
export const fetchPosts = async (req: PaginationRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const offset = Number(req.query.offset) || 0;

    // When the frontend sends "all" (or omits status entirely) we pass null
    // to getPosts so it runs without a WHERE status clause and returns everything.
    // Any other value — "published", "draft", "scheduled" — is passed through
    // directly as the status filter.
    const rawStatus = req.query.status;
    const status = !rawStatus || rawStatus === "all" ? null : String(rawStatus);

    const posts = await getPosts(status, limit, offset);
    const hasMore = posts.length === limit;

    res.json({ posts, limit, offset, hasMore });
  } catch (err) {
    console.error("fetchPosts error:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

// =============================================
// Fetch aggregate post counts by status
// =============================================
export const fetchPostStats = async (req: Request, res: Response) => {
  try {
    const stats = await getPostStats();
    res.json(stats);
  } catch (err) {
    console.error("fetchPostStats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

// =============================================
// Update an existing post's content fields
// =============================================
export const updateExistingPost = async (req: Request, res: Response) => {
  const { categoryId, title, slug, content, excerpt, featuredImage } = req.body;
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

  try {
    const updated = await updatePost(id, updates);
    res.json(updated);
  } catch (error: any) {
    if (error.message === "No fields provided for update") {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === "23505") {
      return res.status(409).json({ message: "Slug already exists" });
    }
    console.error("updateExistingPost error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// Publish a draft or scheduled post
// =============================================
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
    return res.status(400).json({ message: "Already published" });
  }

  try {
    const updated = await publishPost(id);
    res.json(updated);
  } catch (err) {
    console.error("publishExistingPost error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// Delete a post — author only
// =============================================
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

  try {
    await deletePost(id);
    res.json({ message: "Post deleted" });
  } catch (err) {
    console.error("removePost error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// Schedule an existing draft post
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

  if (post.author_id !== req.user!.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  if (post.status === "published") {
    return res.status(400).json({
      message: "Cannot schedule already published posts",
    });
  }

  try {
    const updated = await schedulePost(id, scheduleTime);
    res.json(updated);
  } catch (err) {
    console.error("scheduleExistingPost error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// Create a scheduled post directly
// Kept for backwards compatibility with postRoutes.ts POST /posts/schedule
// createNewPost with status:"scheduled" is the preferred path going forward
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

  if (!title || !slug || !content || !scheduledDate) {
    return res.status(400).json({
      message: "Title, slug, content, and scheduledDate are required",
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
      return res.status(409).json({ message: "Slug already exists" });
    }
    console.error("createScheduledPost error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
