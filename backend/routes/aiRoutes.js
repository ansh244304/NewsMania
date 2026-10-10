import express from "express";

import {
  generateNewsAnalysisController
} from "../controllers/aiController.js";

const router = express.Router();

router.post(
  "/news/:id/analyze",
  generateNewsAnalysisController
);

export default router;
