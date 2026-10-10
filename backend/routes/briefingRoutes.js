import express from "express";

import {
  getDailyBriefingController
} from "../controllers/briefingController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/today",
  authMiddleware,
  getDailyBriefingController
);

export default router;
