import {
  createDailyQuiz
} from "../services/dailyQuizService.js";

// Create today's daily quiz
export const createDailyQuizController = async (req, res) => {
  try {
    const numberOfQuestions =
      Number(req.body?.numberOfQuestions) || 10;

    const quiz = await createDailyQuiz(
      numberOfQuestions
    );

    res.status(201).json({
      success: true,
      message: "Daily quiz created successfully",
      data: quiz
    });

  } catch (error) {
    console.error(
      "Create Daily Quiz Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Get today's daily quiz
export const getTodayDailyQuizController = async (req, res) => {
  try {
    const quiz = await createDailyQuiz(10);

    res.status(200).json({
      success: true,
      data: quiz
    });

  } catch (error) {
    console.error(
      "Get Daily Quiz Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Rebuild today's daily quiz so newly written MCQs are included
export const rebuildDailyQuizController = async (req, res) => {
  try {
    const numberOfQuestions =
      Number(req.body?.numberOfQuestions) || 10;

    const quiz = await createDailyQuiz(
      numberOfQuestions,
      { rebuild: true }
    );

    res.status(200).json({
      success: true,
      message: "Today's daily quiz was rebuilt",
      data: quiz
    });

  } catch (error) {
    console.error(
      "Rebuild Daily Quiz Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};