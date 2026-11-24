import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(
  __dirname,
  "../newsmania-frontend-full-integrated/dist"
);
const frontendIndexPath = path.join(frontendDistPath, "index.html");
import { corsOptions } from "./config/cors.js";
import { globalLimiter } from "./middleware/rateLimiters.js";
import {
  notFound,
  errorHandler
} from "./middleware/errorMiddleware.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import mcqRoutes from "./routes/mcqRoutes.js";
import quizRoutes from "./routes/quizroutes.js";
import bookmarkRoutes from "./routes/bookmarkRoutes.js";
import dailyQuizRoutes from "./routes/dailyQuizRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import briefingRoutes from "./routes/briefingRoutes.js";
import staticGkRoutes from "./routes/staticGkRoutes.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));
app.use(express.static(frontendDistPath));

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// Routes
app.use("/api", globalLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/mcq", mcqRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/bookmark", bookmarkRoutes);
app.use("/api/daily-quiz", dailyQuizRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/briefing", briefingRoutes);
app.use("/api/static-gk", staticGkRoutes);

app.use((req, res, next) => {
  if (
    req.method !== "GET" ||
    req.path === "/health" ||
    req.path === "/api" ||
    req.path.startsWith("/api/") ||
    !req.accepts("html") ||
    !existsSync(frontendIndexPath)
  ) {
    return next();
  }

  return res.sendFile(frontendIndexPath);
});

// Must stay last: 404 for unknown routes, then the error responder
app.use(notFound);
app.use(errorHandler);

export default app;
