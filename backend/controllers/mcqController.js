import News from "../models/News.js";
import MCQ from "../models/MCQ.js";
import { generateMCQs } from "../services/mcqService.js";

export const generateMCQsController = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find news article
    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News not found"
      });
    }

    // 2. Check article content
    if (!news.content || news.content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "News content is empty"
      });
    }

    // 3. Get number of questions
    const numberOfQuestions =
      Number(req.body?.numberOfQuestions) || 5;

    const difficulty = req.body?.difficulty || "Medium";

    const regenerate =
      req.body?.regenerate === true ||
      req.body?.regenerate === "true";

    // 4. Check if MCQs already exist
    const existingMCQs = await MCQ.find({
      newsId: news._id
    });

    if (
      !regenerate &&
      existingMCQs.length >= numberOfQuestions
    ) {
      return res.status(200).json({
        success: true,
        message: "MCQs already exist",
        data: {
          newsId: news._id,
          count: existingMCQs.length,
          mcqs: existingMCQs
        }
      });
    }

    // 4b. Replace stale/junk MCQs so a regenerate always starts clean
    if (regenerate && existingMCQs.length) {
      await MCQ.deleteMany({
        newsId: news._id
      });
    }

    // 5. Generate MCQs using Gemini
    const mcqs = await generateMCQs(
      news.content,
      numberOfQuestions,
      { difficulty }
    );

    // 6. Prepare MCQs for MongoDB
    const mcqData = mcqs.map((mcq) => ({
      newsId: news._id,
      question: mcq.question,
      options: mcq.options,
      correctAnswer: mcq.correctAnswer,
      explanation: mcq.explanation,
      difficulty: mcq.difficulty || difficulty,
      exam: news.exams || [],
      category: news.category || "Current Affairs"
    }));

    // 7. Save MCQs
    const savedMCQs = await MCQ.insertMany(mcqData);

    // 8. Send response
    res.status(201).json({
      success: true,
      message: "MCQs generated and saved successfully",
      data: {
        newsId: news._id,
        count: savedMCQs.length,
        mcqs: savedMCQs
      }
    });

  } catch (error) {
    console.error(
      "MCQ Controller Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// Get MCQs for a news article
export const getMCQsByNewsController = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if news exists
    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News not found"
      });
    }

    // Find MCQs
    const mcqs = await MCQ.find({
      newsId: id
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: mcqs.length,
      data: {
        newsId: id,
        mcqs
      }
    });

  } catch (error) {
    console.error(
      "Get MCQ Controller Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};