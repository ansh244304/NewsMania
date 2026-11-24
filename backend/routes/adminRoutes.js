import express from "express";

import {
  getAdminDashboardController
} from "../controllers/adminController.js";

import {
  createManualMCQController,
  listMCQsController,
  updateMCQController,
  deleteMCQController
} from "../controllers/mcqController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.get(
  "/dashboard",
  authMiddleware,
  adminMiddleware,
  getAdminDashboardController
);

// Admin written MCQs
router.post(
  "/mcqs",
  authMiddleware,
  adminMiddleware,
  createManualMCQController
);

router.get(
  "/mcqs",
  authMiddleware,
  adminMiddleware,
  listMCQsController
);

router.put(
  "/mcqs/:id",
  authMiddleware,
  adminMiddleware,
  updateMCQController
);

router.delete(
  "/mcqs/:id",
  authMiddleware,
  adminMiddleware,
  deleteMCQController
);
export default router;