import express from "express";

import {
  addBookmarkController,
  getBookmarksController,
  removeBookmarkController
} from "../controllers/bookmarkController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Add bookmark
router.post(
  "/",
  authMiddleware,
  addBookmarkController
);

// Get bookmarks
router.get(
  "/",
  authMiddleware,
  getBookmarksController
);

// Remove bookmark
router.delete(
  "/:newsId",
  authMiddleware,
  removeBookmarkController
);

export default router;
