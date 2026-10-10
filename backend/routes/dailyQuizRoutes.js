import express from "express";

import {
  createDailyQuizController,
  getTodayDailyQuizController
} from "../controllers/dailyquizController.js";

const router = express.Router();

// Create today's daily quiz
router.post(
  "/create",
  createDailyQuizController
);

// Get today's daily quiz
router.get(
  "/today",
  getTodayDailyQuizController
);

export default router;
