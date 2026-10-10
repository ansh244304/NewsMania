import News from "../models/News.js";
import { isTruncated } from "./articleScraper.js";

// How many recent articles to consider before ranking
const POOL_SIZE = 80;

// Stories older than this stop being "today's" news
const WINDOW_HOURS = 72;

// Exams a category is most often asked from
const CATEGORY_WEIGHT = {
  Polity: 12,
  National: 11,
  Economy: 9,
  Environment: 8,
  Defence: 8,
  Science: 7,
  Technology: 7,
  International: 6,
  Other: 5,
  Sports: 1
};

// Official government releases outrank opinion pieces
const SOURCE_WEIGHT = {
  PIB: 5
};

const TITLE_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "for", "of",
  "to", "in", "on", "at", "by", "with", "from", "as",
  "is", "are", "was", "were", "be", "been", "will",
  "after", "over", "into", "amid", "says", "said"
]);

const tokenizeTitle = (title = "") => {
  return [
    ...new Set(
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(
          (word) =>
            word.length > 3 &&
            !TITLE_STOP_WORDS.has(word)
        )
    )
  ];
};

// Two headlines about the same event share most of their
// distinctive words. Used to keep the ten stories distinct.
const isSameStory = (a, b) => {
  if (!a.tokens || !b.tokens) {
    return false;
  }

  const shared = a.tokens.filter((token) =>
    b.tokens.includes(token)
  ).length;

  const union = new Set([
    ...a.tokens,
    ...b.tokens
  ]).size;

  return union > 0 && shared / union >= 0.6;
};

const scoreArticle = (article, now) => {
  const publishedAt = new Date(
    article.publishedAt || article.createdAt
  );

  const ageHours = Math.max(
    0,
    (now - publishedAt.getTime()) / (60 * 60 * 1000)
  );

  // Freshness, worth up to 40 points and gone after ~44 hours
  const recency = Math.max(
    0,
    40 - ageHours * 0.9
  );

  // Exam relevance, the strongest signal we have
  const examRelevance = Math.min(
    (article.exams?.length || 0) * 6,
    20
  );

  // AI analysis means someone already judged it worth detailing
  const enrichment = Math.min(
    (article.facts?.length || 0) * 2,
    10
  ) + Math.min(article.keywords?.length || 0, 5);

  const categoryWeight =
    CATEGORY_WEIGHT[article.category] ?? 5;

  const sourceWeight =
    SOURCE_WEIGHT[article.source] || 0;

  // Real depth instead of a search preview
  const depth = Math.min(
    (article.content?.length || 0) / 300,
    8
  );

  return Number(
    (
      recency +
      examRelevance +
      enrichment +
      categoryWeight +
      sourceWeight +
      depth
    ).toFixed(2)
  );
};

// The ten most important stories for today, best first
export const getImportantStories = async (limit = 10) => {
  const now = Date.now();

  const windowStart = new Date(
    now - WINDOW_HOURS * 60 * 60 * 1000
  );

  const articles = await News.find({
    publishedAt: { $gte: windowStart }
  })
    .sort({ publishedAt: -1 })
    .limit(POOL_SIZE)
    .select(
      "title summary content category source sourceUrl imageUrl exams facts keywords publishedAt"
    );

  // A thin news day should still produce a briefing
  const pool =
    articles.length >= limit
      ? articles
      : await News.find()
          .sort({ publishedAt: -1 })
          .limit(POOL_SIZE)
          .select(
            "title summary content category source sourceUrl imageUrl exams facts keywords publishedAt"
          );

  const ranked = pool
    .filter(
      (article) =>
        article.title &&
        !isTruncated(article.content)
    )
    .map((article) => ({
      ...article,
      content: undefined,
      importance: scoreArticle(article, now)
    }))
    .sort(
      (a, b) => b.importance - a.importance
    );

  // One story, one slot
  const stories = [];

  for (const article of ranked) {
    const candidate = {
      ...article,
      tokens: tokenizeTitle(article.title)
    };

    const duplicate = stories.some(
      (story) => isSameStory(story, candidate)
    );

    if (duplicate) {
      continue;
    }

    const { tokens, ...rest } = candidate;

    stories.push(rest);

    if (stories.length === limit) {
      break;
    }
  }

  return stories;
};

export default { getImportantStories };
