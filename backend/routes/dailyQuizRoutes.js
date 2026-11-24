import express from "express";

import {
  createDailyQuizController,
  getTodayDailyQuizController,
  rebuildDailyQuizController
} from "../controllers/dailyquizController.js";

const router = express.Router();

// Create today's daily quiz
router.post(
  "/create",
  createDailyQuizController
);

// Rebuild today's daily quiz (picks up newly written MCQs)
router.post(
  "/rebuild",
  rebuildDailyQuizController
);

// Get today's daily quiz
router.get(
  "/today",
  getTodayDailyQuizController
);
export default router;
