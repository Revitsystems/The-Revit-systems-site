import { Response } from "express";
import { AuthRequest } from "../types/express";
import { createPost, getAllPosts, deletePost } from "../models/postModel";

export const createNewPost = async (req: AuthRequest, res: Response) => {
  const { title, content } = req.body;

  const post = await createPost(title, content, req.user!.id);

  res.status(201).json(post);
};

export const fetchPosts = async (_req: AuthRequest, res: Response) => {
  const posts = await getAllPosts();
  res.json(posts);
};

export const removePost = async (req: AuthRequest, res: Response) => {
  await deletePost(req.params.id);
  res.json({ message: "Post deleted" });
};
