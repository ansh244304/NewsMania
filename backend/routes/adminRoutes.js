import express from "express";

import {
  getAdminDashboardController
} from "../controllers/adminController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.get(
  "/dashboard",
  authMiddleware,
  adminMiddleware,
  getAdminDashboardController
);

export default router;