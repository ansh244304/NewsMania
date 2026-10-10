import MCQ from "../models/MCQ.js";
import QuizAttempt from "../models/quizattempt.js";
import DailyQuiz from "../models/Dailyquiz.js";
import {
  registerDailyActivity
} from "../services/streakService.js";
import {
  submitQuizSchema,
  submitDailyQuizSchema
} from "../validation/quizSchemas.js";

// Safely parses req.body against a schema. On failure it sends a 400
// and returns null so the caller stops early.
const parseBody = (schema, req, res) => {
  const result = schema.safeParse(req.body ?? {});

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "(root)",
        message: issue.message
      }))
    });

    return null;
  }

  return result.data;
};

export const submitQuizController = async (req, res) => {
  try {
    const body = parseBody(submitQuizSchema, req, res);

    if (!body) return;

    const { newsId, answers } = body;

    // 2. Get MCQs for this news
    const mcqs = await MCQ.find({
      newsId
    });

    if (mcqs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No MCQs found for this news"
      });
    }

    // 3. Calculate result
    let correctAnswers = 0;

    const result = answers.map((answer) => {
      const mcq = mcqs.find(
        (item) =>
          item._id.toString() ===
          answer.mcqId
      );

      if (!mcq) {
        return {
          mcqId: answer.mcqId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: false,
          message: "MCQ not found"
        };
      }

      const isCorrect =
        mcq.correctAnswer === answer.selectedAnswer;

      if (isCorrect) {
        correctAnswers++;
      }

      return {
        mcqId: mcq._id,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: mcq.correctAnswer,
        isCorrect
      };
    });

    // 4. Calculate score
    const totalQuestions = mcqs.length;

    const score = correctAnswers;

    const percentage =
      (correctAnswers / totalQuestions) * 100;

    // 5. Get logged-in user
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // 6. Save quiz attempt
    const quizAttempt = await QuizAttempt.create({
      userId,
      newsId,
      quizType: "news",
      answers: result.filter(
        (item) => item.correctAnswer
      ),
      totalQuestions,
      correctAnswers,
      score,
      percentage: Number(percentage.toFixed(2))
    });

    // 7. Send response
    res.status(201).json({
      success: true,
      message: "Quiz submitted successfully",

      data: {
        attemptId: quizAttempt._id,
        totalQuestions,
        correctAnswers,
        score,
        percentage: Number(
          percentage.toFixed(2)
        ),
        result
      }
    });

  } catch (error) {
    console.error(
      "Quiz Controller Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ======================================================
// SUBMIT DAILY QUIZ
// ======================================================

export const submitDailyQuizController = async (req, res) => {
  try {
    const body = parseBody(submitDailyQuizSchema, req, res);

    if (!body) return;

    const { quizId, answers } = body;

    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const dailyQuiz =
      await DailyQuiz.findById(quizId);

    if (!dailyQuiz) {
      return res.status(404).json({
        success: false,
        message: "Daily quiz not found"
      });
    }

    // Only questions that belong to this quiz may be answered
    const allowedIds =
      dailyQuiz.mcqs.map((id) => id.toString());

    const mcqs = await MCQ.find({
      _id: { $in: allowedIds }
    });

    if (mcqs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "This daily quiz has no questions"
      });
    }

    let correctAnswers = 0;

    const result = answers.map((answer) => {
      const mcq = mcqs.find(
        (item) =>
          item._id.toString() === answer.mcqId
      );

      if (!mcq) {
        return {
          mcqId: answer.mcqId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: false,
          message: "Question does not belong to this quiz"
        };
      }

      const isCorrect =
        mcq.correctAnswer === answer.selectedAnswer;

      if (isCorrect) {
        correctAnswers++;
      }

      return {
        mcqId: mcq._id,
        question: mcq.question,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: mcq.correctAnswer,
        explanation: mcq.explanation,
        difficulty: mcq.difficulty,
        isCorrect
      };
    });

    const totalQuestions = mcqs.length;
    const percentage =
      (correctAnswers / totalQuestions) * 100;

    const quizAttempt = await QuizAttempt.create({
      userId,
      quizType: "daily",
      answers: result.filter(
        (item) => item.correctAnswer
      ),
      totalQuestions,
      correctAnswers,
      score: correctAnswers,
      percentage: Number(percentage.toFixed(2))
    });

    // Taking the daily quiz is what keeps the streak alive
    const streak = await registerDailyActivity(
      userId
    );

    res.status(201).json({
      success: true,
      message: "Daily quiz submitted successfully",

      data: {
        attemptId: quizAttempt._id,
        quizType: "daily",
        quizTitle: dailyQuiz.title,
        totalQuestions,
        correctAnswers,
        score: correctAnswers,
        percentage: Number(
          percentage.toFixed(2)
        ),
        result,

        streak: streak
          ? {
              current: streak.current,
              longest: streak.longest,
              status: streak.status,
              newBadges: streak.newBadges
            }
          : null
      }
    });

  } catch (error) {

    console.error(
      "Submit Daily Quiz Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Get user's quiz history
export const getQuizHistoryController = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const attempts = await QuizAttempt.find({
      userId
    })
      .populate("newsId", "title category source publishedAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: {
        attempts
      }
    });

  } catch (error) {
    console.error(
      "Quiz History Controller Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};