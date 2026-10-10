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

const router = express.Router();


// Create
router.post(
  "/",
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
  fetchNewsAPIController
);


// PIB
router.get(
  "/fetch/pib",
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
  updateNewsController
);


// Delete
router.delete(
  "/:id",
  deleteNewsController
);


export default router;
