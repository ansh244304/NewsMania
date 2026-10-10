import User from "../models/user.js";
import News from "../models/News.js";
import MCQ from "../models/MCQ.js";
import QuizAttempt from "../models/quizattempt.js";
import Bookmark from "../models/BookMark.js";
import DailyQuiz from "../models/Dailyquiz.js";

export const getAdminDashboardController = async (req, res) => {
  try {

    const totalUsers =
      await User.countDocuments();

    const totalNews =
      await News.countDocuments();

    const totalMCQs =
      await MCQ.countDocuments();

    const totalQuizAttempts =
      await QuizAttempt.countDocuments();

    const totalBookmarks =
      await Bookmark.countDocuments();

    const totalDailyQuizzes =
      await DailyQuiz.countDocuments();

    const recentNews = await News.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "title category source publishedAt createdAt"
      );

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "name email role createdAt"
      );

    const recentQuizAttempts =
      await QuizAttempt.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate(
          "userId",
          "name email"
        )
        .populate(
          "newsId",
          "title category"
        );

    res.status(200).json({
      success: true,

      data: {
        statistics: {
          totalUsers,
          totalNews,
          totalMCQs,
          totalQuizAttempts,
          totalBookmarks,
          totalDailyQuizzes
        },

        recentNews,

        recentUsers,

        recentQuizAttempts
      }
    });

  } catch (error) {

    console.error(
      "Admin Dashboard Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to load admin dashboard"
    });
  }
};