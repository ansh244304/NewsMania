import axios from "axios";
import News from "../models/News.js";
import {
  isTruncated,
  scrapeArticle
} from "./articleScraper.js";


// ======================================================
// CREATE NEWS
// ======================================================

export const createNews = async (newsData) => {
  const {
    title,
    content,
    source,
    sourceUrl,
    category,
    publishedAt,
    imageUrl,
    tags
  } = newsData;

  // Check duplicate
  const existingNews = await News.findOne({
    sourceUrl
  });

  if (existingNews) {
    throw new Error("News already exists");
  }

  const news = await News.create({
    title,
    content,
    source,
    sourceUrl,
    category: category || "Other",
    publishedAt: publishedAt || new Date(),
    imageUrl: imageUrl || "",
    tags: tags || []
  });

  return news;
};


// ======================================================
// GET ALL NEWS
// ======================================================

export const getAllNews = async ({
  page = 1,
  limit = 10,
  search = "",
  category = "",
  source = ""
} = {}) => {

  page = Number(page);
  limit = Number(limit);

  const skip = (page - 1) * limit;

  const query = {};

  // Search
  if (search) {
    query.$or = [
      {
        title: {
          $regex: search,
          $options: "i"
        }
      },
      {
        content: {
          $regex: search,
          $options: "i"
        }
      }
    ];
  }

  // Category
  if (category) {
    query.category = category;
  }

  // Source
  if (source === "PIB") {
    query.source = "PIB";
  } else if (source === "news") {
    query.source = { $ne: "PIB" };
  }

  // Fetch news
  const news = await News.find(query)
    .sort({
      publishedAt: -1
    })
    .skip(skip)
    .limit(limit);

  // Count
  const total = await News.countDocuments(query);

  return {
    news,
    total,
    page,
    limit,
    totalPages: Math.ceil(
      total / limit
    )
  };
};


// ======================================================
// GET NEWS BY ID
// ======================================================

export const getNewsById = async (id) => {

  const news = await News.findById(id);

  if (!news) {
    throw new Error(
      "News not found"
    );
  }

  return news;
};


// ======================================================
// UPDATE NEWS
// ======================================================

export const updateNews = async (
  id,
  newsData
) => {

  const news =
    await News.findByIdAndUpdate(
      id,
      newsData,
      {
        new: true,
        runValidators: true
      }
    );

  if (!news) {
    throw new Error(
      "News not found"
    );
  }

  return news;
};


// ======================================================
// DELETE NEWS
// ======================================================

export const deleteNews = async (
  id
) => {

  const news =
    await News.findByIdAndDelete(id);

  if (!news) {
    throw new Error(
      "News not found"
    );
  }

  return news;
};


// ======================================================
// FETCH GNEWS + SAVE TO MONGODB
// ======================================================

export const fetchNewsAPI = async ({
  query = "India",
  page = 1,
  max = 10
} = {}) => {

  try {

    // Check API key
    if (!process.env.NEWS_API_KEY) {
      throw new Error(
        "NEWS_API_KEY is missing in .env"
      );
    }

    console.log(
      "================================="
    );

    console.log(
      "Fetching news from GNews..."
    );

    console.log(
      "Query:",
      query
    );

    console.log(
      "API Key exists:",
      !!process.env.NEWS_API_KEY
    );

    console.log(
      "================================="
    );


    // ==================================================
    // CALL GNEWS
    // ==================================================

    const response =
      await axios.get(
        "https://gnews.io/api/v4/search",
        {
          params: {

            q: query,

            lang: "en",

            country: "in",

            max: Number(max),

            page: Number(page),

            apikey:
              process.env.NEWS_API_KEY
          }
        }
      );


    // ==================================================
    // GET ARTICLES
    // ==================================================

    const articles =
      response.data.articles || [];

    console.log(
      "GNews articles received:",
      articles.length
    );


    const savedNews = [];


    // ==================================================
    // SAVE ARTICLES
    // ==================================================

    for (
      const article of articles
    ) {

      try {

        // ----------------------------------------------
        // Validate
        // ----------------------------------------------

        if (
          !article.title ||
          !article.url
        ) {

          console.log(
            "Skipping invalid article"
          );

          continue;
        }


        // ----------------------------------------------
        // Check duplicate
        // ----------------------------------------------

        const existingNews =
          await News.findOne({
            sourceUrl:
              article.url
          });


        if (existingNews) {

          console.log(
            "Already exists:",
            article.title
          );

          continue;
        }


        // ----------------------------------------------
        // Content
        //
        // GNews free plan returns only a ~266 char
        // preview ending in "... [NNNN chars]".
        // Scrape the original article for full text.
        // ----------------------------------------------

        const preview =
          article.content ||
          article.description ||
          article.title;

        let content = preview;
        let imageUrl = article.image || "";
        let publishedAt = article.publishedAt
          ? new Date(article.publishedAt)
          : new Date();

        const needsScrape =
          isTruncated(preview) ||
          (!article.content && article.description);

        if (needsScrape) {
          const scraped =
            await scrapeArticle(article.url);

          if (
            scraped &&
            scraped.content.length > preview.length
          ) {
            content = scraped.content;

            if (scraped.imageUrl) {
              imageUrl = scraped.imageUrl;
            }

            if (scraped.publishedAt) {
              publishedAt = scraped.publishedAt;
            }

            console.log(
              "Full text scraped:",
              article.title.slice(0, 50),
              `(${preview.length} -> ${content.length} chars)`
            );
          } else {
            // Strip GNews' "... [NNNN chars]" marker so the UI
            // never shows a dangling truncation notice
            content = preview
              .replace(/\s*\.\.\.\s*\[\d+\s+chars?\]\s*$/i, "")
              .trim();
          }
        }


        // ----------------------------------------------
        // Create MongoDB document
        // ----------------------------------------------

        const news =
          await News.create({

            title:
              article.title,

            content:
              content,

            summary:
              article.description ||
              "",

            facts: [],

            keywords: [],

            exams: [],

            source:
              article.source?.name ||
              "GNews",

            sourceUrl:
              article.url,

            category:
              "Other",

            publishedAt:
              publishedAt,

            imageUrl:
              imageUrl,

            tags: []
          });


        // ----------------------------------------------
        // Add to result
        // ----------------------------------------------

        savedNews.push(news);


        console.log(
          "Saved to MongoDB:",
          article.title
        );

      } catch (articleError) {

        console.error(
          "Article save error:",
          articleError.message
        );

      }
    }


    // ==================================================
    // FINAL RESULT
    // ==================================================

    console.log(
      "================================="
    );

    console.log(
      "New articles saved:",
      savedNews.length
    );

    console.log(
      "================================="
    );


    return savedNews;


  } catch (error) {

    console.error(
      "================================="
    );

    console.error(
      "GNEWS ERROR:"
    );

    console.error(
      error.response?.data ||
      error.message
    );

    console.error(
      "================================="
    );

    throw new Error(
      error.response?.data?.errors
        ? JSON.stringify(
            error.response.data.errors
          )
        : error.response?.data?.message ||
          error.message ||
          "Failed to fetch GNews"
    );
  }
};