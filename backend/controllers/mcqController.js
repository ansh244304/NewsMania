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
      category: news.category || "Current Affairs",
      source: "ai"
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

// ======================================================
// MANUAL MCQ CRUD (admin written)
// ======================================================

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

const cleanOptions = (options) =>
  Array.isArray(options)
    ? options.map((option) => String(option ?? "").trim())
    : [];

// Normalises and validates an MCQ payload. Returns either
// { error } or { value } so the create/update paths stay in sync.
const validateMCQInput = (body = {}) => {
  const question = String(body.question || "").trim();
  const options = cleanOptions(body.options);
  const correctAnswer = String(body.correctAnswer || "").trim();
  const explanation = String(body.explanation || "").trim();
  const category = String(body.category || "").trim();
  const difficulty = DIFFICULTIES.includes(body.difficulty)
    ? body.difficulty
    : "Medium";

  if (!question) {
    return { error: "Question is required" };
  }

  if (options.length !== 4 || options.some((option) => !option)) {
    return { error: "Exactly 4 non-empty options are required" };
  }

  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) {
    return { error: "All 4 options must be unique" };
  }

  if (!correctAnswer) {
    return { error: "Correct answer is required" };
  }

  if (!options.includes(correctAnswer)) {
    return { error: "Correct answer must match one of the options" };
  }

  const exam = Array.isArray(body.exam)
    ? body.exam
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];

  return {
    value: {
      question,
      options,
      correctAnswer,
      explanation,
      category: category || "Current Affairs",
      difficulty,
      exam
    }
  };
};

// Create a manually written MCQ
export const createManualMCQController = async (req, res) => {
  try {
    const { value, error } = validateMCQInput(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    const mcq = await MCQ.create({
      ...value,
      newsId: req.body?.newsId || null,
      source: "manual",
      createdBy: req.userId || null
    });

    res.status(201).json({
      success: true,
      message: "MCQ created successfully",
      data: { mcq }
    });

  } catch (error) {
    console.error(
      "Create Manual MCQ Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// List MCQs with optional source/difficulty/search filters
export const listMCQsController = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    const filter = {};

    if (
      req.query.source === "ai" ||
      req.query.source === "manual"
    ) {
      filter.source = req.query.source;
    }

    if (DIFFICULTIES.includes(req.query.difficulty)) {
      filter.difficulty = req.query.difficulty;
    }

    if (req.query.search && String(req.query.search).trim()) {
      filter.question = {
        $regex: String(req.query.search).trim(),
        $options: "i"
      };
    }

    const [mcqs, total] = await Promise.all([
      MCQ.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("newsId", "title"),
      MCQ.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: mcqs.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: { mcqs }
    });

  } catch (error) {
    console.error(
      "List MCQs Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update an existing MCQ
export const updateMCQController = async (req, res) => {
  try {
    const { value, error } = validateMCQInput(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    const mcq = await MCQ.findByIdAndUpdate(
      req.params.id,
      {
        ...value,
        newsId: req.body?.newsId || null
      },
      { new: true, runValidators: true }
    );

    if (!mcq) {
      return res.status(404).json({
        success: false,
        message: "MCQ not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "MCQ updated successfully",
      data: { mcq }
    });

  } catch (error) {
    console.error(
      "Update MCQ Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete an MCQ
export const deleteMCQController = async (req, res) => {
  try {
    const mcq = await MCQ.findByIdAndDelete(req.params.id);

    if (!mcq) {
      return res.status(404).json({
        success: false,
        message: "MCQ not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "MCQ deleted successfully",
      data: { id: mcq._id }
    });

  } catch (error) {
    console.error(
      "Delete MCQ Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};