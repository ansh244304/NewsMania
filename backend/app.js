import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import { corsOptions } from "./config/cors.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from './routes/authRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import mcqRoutes from './routes/mcqRoutes.js';
import quizRoutes from './routes/quizroutes.js';
import bookmarkRoutes from './routes/bookmarkRoutes.js';
import dailyQuizRoutes from './routes/dailyQuizRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import briefingRoutes from './routes/briefingRoutes.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());

connectDB();

app.use(cors(corsOptions));

// Routes
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

app.get('/', (req, res) => {
  res.send('Welcome to the Newsmania API');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});