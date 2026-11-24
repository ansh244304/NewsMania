import express from "express";

import {
  generateNewsAnalysisController
} from "../controllers/aiController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.post(
  "/news/:id/analyze",
  authMiddleware,
  aiLimiter,
  generateNewsAnalysisController
);
export default router;
