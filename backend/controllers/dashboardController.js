
import User from "../models/user.js";
import News from "../models/News.js";
import Bookmark from "../models/BookMark.js";
import QuizAttempt from "../models/quizattempt.js";
import DailyQuiz from "../models/Dailyquiz.js";
import {
  getIstDayRange,
  getStreakSnapshot
} from "../services/streakService.js";

export const getDashboardController = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // -----------------------------
    // USER
    // -----------------------------

    const user = await User.findById(userId)
      .select("name email role createdAt streak badges");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // -----------------------------
    // QUIZ ATTEMPTS
    // -----------------------------

    const attempts = await QuizAttempt.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate(
        "newsId",
        "title category source publishedAt"
      );

    const allAttempts = await QuizAttempt.find({
      userId
    });

    const totalQuizzes = allAttempts.length;

    const totalQuestions = allAttempts.reduce(
      (sum, attempt) =>
        sum + attempt.totalQuestions,
      0
    );

    const correctAnswers = allAttempts.reduce(
      (sum, attempt) =>
        sum + attempt.correctAnswers,
      0
    );

    const accuracy =
      totalQuestions > 0
        ? (correctAnswers / totalQuestions) * 100
        : 0;

    // -----------------------------
    // BOOKMARKS
    // -----------------------------

    const bookmarks = await Bookmark.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate(
        "newsId",
        "title summary category source sourceUrl publishedAt imageUrl"
      );

    const totalBookmarks =
      await Bookmark.countDocuments({ userId });

    // -----------------------------
    // TODAY'S QUIZ
    // -----------------------------

    // Day boundaries follow IST so the quiz and the streak agree
    const { start: startOfDay, end: endOfDay } =
      getIstDayRange();

    const todayQuiz = await DailyQuiz.findOne({
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      isActive: true
    }).select(
      "title description date totalQuestions isActive"
    );

    // -----------------------------
    // RECENT NEWS
    // -----------------------------

    const recentNews = await News.find()
      .sort({ publishedAt: -1 })
      .limit(10)
      .select(
        "title summary category source sourceUrl publishedAt imageUrl"
      );

    // -----------------------------
    // RESPONSE
    // -----------------------------

    res.status(200).json({
      success: true,

      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          joinedAt: user.createdAt
        },

        statistics: {
          totalQuizzes,
          totalQuestions,
          correctAnswers,
          accuracy: Number(
            accuracy.toFixed(2)
          ),
          totalBookmarks
        },

        streak: {
          ...getStreakSnapshot(user),
          dailyQuizDone: Boolean(
            await QuizAttempt.exists({
              userId,
              quizType: "daily",
              createdAt: { $gte: startOfDay }
            })
          )
        },

        todayQuiz,

        recentAttempts: attempts,

        bookmarks,

        recentNews
      }
    });

  } catch (error) {
    console.error(
      "Dashboard Controller Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard"
    });
  }
};