import DailyQuiz from "../models/Dailyquiz.js";
import MCQ from "../models/MCQ.js";
import News from "../models/News.js";
import { generateMCQs } from "./mcqService.js";
import { getIstDayRange } from "./streakService.js";

// Daily quiz is aimed at exam aspirants, so Easy questions are excluded.
const ALLOWED_DIFFICULTIES = ["Medium", "Hard"];

const QUESTIONS_PER_ARTICLE = 3;

// The quiz day follows IST, the same day the streak counts, so
// "today's quiz" never disagrees with the briefing.
const startOfToday = () => getIstDayRange().start;

const shuffle = (items) => {
  const array = [...items];

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
};

const hasEnoughContent = (article) =>
  article &&
  article.content &&
  article.content.trim().length >= 400;

// Builds MCQs from the newest articles until the quiz has enough
// medium/hard questions, so the daily quiz never depends on
// manually generated MCQs.
const topUpFromRecentNews = async (
  numberOfQuestions
) => {
  const articles = await News.find({
    content: { $not: { $regex: "\\[\\d+\\s+chars?\\]\\s*$", $options: "i" } }
  })
    .sort({ publishedAt: -1 })
    .limit(25);

  const usable = articles.filter(hasEnoughContent);

  if (usable.length === 0) {
    return 0;
  }

  let created = 0;

  for (const [index, article] of usable.entries()) {
    const existing = await MCQ.countDocuments({
      newsId: article._id
    });

    if (existing >= QUESTIONS_PER_ARTICLE) {
      continue;
    }

    // Alternate so the daily quiz mixes recall and analytical questions
    // instead of being uniformly easy recall.
    const difficulty =
      index % 2 === 0 ? "Hard" : "Medium";

    try {
      const generated = await generateMCQs(
        article.content,
        QUESTIONS_PER_ARTICLE,
        { difficulty }
      );

      await MCQ.insertMany(
        generated.map((mcq) => ({
          newsId: article._id,
          question: mcq.question,
          options: mcq.options,
          correctAnswer: mcq.correctAnswer,
          explanation: mcq.explanation,
          difficulty: mcq.difficulty,
          exam: article.exams || [],
          category: article.category || "Current Affairs"
        }))
      );

      created += generated.length;

      console.log(
        `Daily quiz: generated ${generated.length} ${difficulty} MCQs from "${article.title.slice(0, 50)}"`
      );
    } catch (error) {
      console.log(
        `Daily quiz: could not generate MCQs for "${article.title.slice(0, 50)}" - ${error.message}`
      );
    }
  }

  return created;
};

export const createDailyQuiz = async (
  numberOfQuestions = 10
) => {
  const startOfDay = startOfToday();

  // 1. Return today's quiz if it already exists
  const existingQuiz = await DailyQuiz.findOne({
    date: startOfDay
  }).populate("mcqs");

  if (existingQuiz) {
    return existingQuiz;
  }

  // 2. Top up the MCQ pool from recent news if required
  const available = await MCQ.countDocuments({
    difficulty: { $in: ALLOWED_DIFFICULTIES }
  });

  if (available < numberOfQuestions) {
    console.log(
      `Daily quiz: only ${available} medium/hard MCQs available, generating more from recent news...`
    );
    await topUpFromRecentNews(numberOfQuestions);
  }

  // 3. Pull medium/hard MCQs, newest first
  const mcqs = await MCQ.find({
    difficulty: { $in: ALLOWED_DIFFICULTIES }
  })
    .sort({ createdAt: -1 })
    .limit(200);

  if (mcqs.length < numberOfQuestions) {
    throw new Error(
      `Not enough medium/hard MCQs available. Need ${numberOfQuestions}, but only ${mcqs.length} found. Generate MCQs from a few news articles first.`
    );
  }

  // 4. Randomly select so the daily quiz is not identical every time
  const selectedMCQs = shuffle(mcqs).slice(
    0,
    numberOfQuestions
  );

  // 5. Create today's quiz
  const dailyQuiz = await DailyQuiz.create({
    title: "Daily Current Affairs Quiz",

    description:
      "Medium to hard questions based on today's important current affairs.",

    date: startOfDay,

    mcqs: selectedMCQs.map((mcq) => mcq._id),

    totalQuestions: selectedMCQs.length,

    isActive: true
  });

  console.log(
    `Daily quiz created with ${selectedMCQs.length} questions`
  );

  // 6. Return populated quiz
  return await DailyQuiz.findById(
    dailyQuiz._id
  ).populate("mcqs");
};
