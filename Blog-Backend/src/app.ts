import { Router } from "express";
import {
  createNewPost,
  fetchPosts,
  removePost,
} from "./controllers/postController";
import { authenticate } from "./middleware/authMiddleware";
import { authorize } from "./middleware/roleMiddleware";

const router = Router();

router.get("/", fetchPosts);
router.post("/", authenticate, createNewPost);
router.delete("/:id", authenticate, authorize("admin"), removePost);

export default router;
