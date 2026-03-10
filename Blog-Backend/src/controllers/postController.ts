import { Response } from "express";
import { AuthRequest } from "@/types/express.js";
import {
  PaginationQuery,
  PaginationRequest,
} from "@/types/pagination.types.js";
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  publishPost,
  deletePost,
} from "@/models/postModel.js";

export const createNewPost = async (req: AuthRequest, res: Response) => {
  console.log(req.body);
  const { categoryId, title, slug, content, excerpt, featuredImage } = req.body;

  if (
    !categoryId ||
    !title ||
    !slug ||
    !content ||
    !excerpt ||
    !featuredImage
  ) {
    return res.status(400).json({
      message:
        "CategoryId, title, slug, content, excerpt, and featuredImage are required",
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

export const updateExistingPost = async (req: AuthRequest, res: Response) => {
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

export const publishExistingPost = async (req: AuthRequest, res: Response) => {
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

export const removePost = async (req: AuthRequest, res: Response) => {
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
