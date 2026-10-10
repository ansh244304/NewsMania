import express from "express";

import {
  generateMCQsController,getMCQsByNewsController
} from "../controllers/mcqController.js";

const router = express.Router();

// Generate MCQs for a news article
router.post(
  "/news/:id/generate",
  generateMCQsController
);
// Get MCQs for a news article
router.get(
  "/news/:id",
  getMCQsByNewsController
);
export default router;
