import User from "../models/user.js";
import QuizAttempt from "../models/quizattempt.js";
import DailyQuiz from "../models/Dailyquiz.js";
import { getImportantStories } from "../services/briefingService.js";
import {
  getGreeting,
  getIstDayRange,
  getStreakSnapshot
} from "../services/streakService.js";

// The story count promised by the greeting
const STORY_COUNT = 10;

export const getDailyBriefingController = async (
  req,
  res
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const user = await User.findById(userId).select(
      "name streak badges"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // -----------------------------
    // STORIES
    // -----------------------------

    const stories = await getImportantStories(
      STORY_COUNT
    );

    // -----------------------------
    // TODAY'S DAILY QUIZ
    // -----------------------------

    const today = getIstDayRange();
    const { start, end } = today;

    const dailyQuiz = await DailyQuiz.findOne({
      date: { $gte: start, $lt: end },
      isActive: true
    }).select(
      "title description totalQuestions date isActive"
    );

    // Has today's quiz already been submitted?
    const todayAttempt =
      await QuizAttempt.findOne({
        userId,
        quizType: "daily",
        createdAt: { $gte: start, $lt: end }
      }).select("percentage score totalQuestions createdAt");

    const streak = getStreakSnapshot(user);

    // -----------------------------
    // RESPONSE
    // -----------------------------

    res.status(200).json({
      success: true,

      data: {
        greeting: getGreeting(),
        firstName: (user.name || "").split(" ")[0],
        date: today.key,

        stories,
        storyCount: stories.length,

        streak: {
          ...streak,
          dailyQuizDone: Boolean(todayAttempt)
        },

        dailyQuiz,

        todayAttempt: todayAttempt
          ? {
              percentage: todayAttempt.percentage,
              score: todayAttempt.score,
              totalQuestions: todayAttempt.totalQuestions
            }
          : null
      }
    });

  } catch (error) {
    console.error(
      "Daily Briefing Controller Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to load your daily briefing"
    });
  }
};
