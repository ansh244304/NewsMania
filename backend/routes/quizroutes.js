import express from "express";

import {
  submitQuizController,
  getQuizHistoryController,
  submitDailyQuizController
} from "../controllers/quizcontroller.js";

import  authMiddleware  from "../middleware/authMiddleware.js";

const router = express.Router();

// Submit quiz
router.post( "/submit", authMiddleware, submitQuizController);

// Submit daily quiz
router.post(
  "/daily/submit",
  authMiddleware,
  submitDailyQuizController
);

router.get(
  "/history",
  authMiddleware,
  getQuizHistoryController
);

export default router;
