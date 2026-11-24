import express from "express";

import {
  createNewsController,
  getAllNewsController,
  getNewsByIdController,
  updateNewsController,
  deleteNewsController,
  fetchPIBNewsController,
  fetchNewsAPIController
} from "../controllers/newsController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();


// Create
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  createNewsController
);


// Get all
router.get(
  "/",
  getAllNewsController
);


// GNews
router.get(
  "/fetch/newsapi",
  authMiddleware,
  adminMiddleware,
  fetchNewsAPIController
);


// PIB
router.get(
  "/fetch/pib",
  authMiddleware,
  adminMiddleware,
  fetchPIBNewsController
);


// Get one
router.get(
  "/:id",
  getNewsByIdController
);


// Update
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  updateNewsController
);


// Delete
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  deleteNewsController
);

export default router;
