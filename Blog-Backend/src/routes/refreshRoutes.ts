import { Router } from "express";
import { refresh } from "@/controllers/refreshController.js";
import { rateLimit } from "node_modules/express-rate-limit/dist/index.cjs";

const router = Router();

router.post("/refresh", refresh);

export default router;
