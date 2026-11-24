import express from "express";
import {
  addStaticGKBookmarkController,
  deleteStaticGKController,
  getStaticGKController,
  listStaticGKBookmarksController,
  listStaticGKController,
  removeStaticGKBookmarkController,
  serveStaticGKFileController,
  serveStaticGKThumbnailController,
  updateStaticGKController,
  uploadStaticGKController
} from "../controllers/staticGkController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import optionalAuthMiddleware from "../middleware/optionalAuthMiddleware.js";
import uploadStaticGKFiles from "../middleware/staticGkUpload.js";

const router = express.Router();

router.get(
  "/bookmarks",
  authMiddleware,
  listStaticGKBookmarksController
);

router.post(
  "/:id/bookmark",
  authMiddleware,
  addStaticGKBookmarkController
);

router.delete(
  "/:id/bookmark",
  authMiddleware,
  removeStaticGKBookmarkController
);

router.get(
  "/",
  optionalAuthMiddleware,
  listStaticGKController
);

router.post(
  "/upload",
  authMiddleware,
  adminMiddleware,
  uploadStaticGKFiles,
  uploadStaticGKController
);

router.get(
  "/:id/file",
  optionalAuthMiddleware,
  serveStaticGKFileController
);

router.get(
  "/:id/thumbnail",
  optionalAuthMiddleware,
  serveStaticGKThumbnailController
);

router.get(
  "/:id",
  optionalAuthMiddleware,
  getStaticGKController
);

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  updateStaticGKController
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  deleteStaticGKController
);
export default router;
