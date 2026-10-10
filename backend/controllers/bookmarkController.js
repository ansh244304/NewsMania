import Bookmark from "../models/BookMark.js";
import News from "../models/News.js";
import {
  addBookmarkSchema,
  removeBookmarkParamsSchema
} from "../validation/bookmarkSchemas.js";

// Safely parses the given part of the request against a schema. On
// failure it sends a 400 and returns null so the caller stops early.
const parse = (schema, value, res) => {
  const result = schema.safeParse(value ?? {});

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

// Add bookmark
export const addBookmarkController = async (req, res) => {
  try {
    const userId = req.userId;
    const body = parse(addBookmarkSchema, req.body, res);

    if (!body) return;

    const { newsId } = body;

    // Check news exists
    const news = await News.findById(newsId);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News not found"
      });
    }

    // Check existing bookmark
    const existingBookmark = await Bookmark.findOne({
      userId,
      newsId
    });

    if (existingBookmark) {
      return res.status(409).json({
        success: false,
        message: "News already bookmarked"
      });
    }

    const bookmark = await Bookmark.create({
      userId,
      newsId
    });

    res.status(201).json({
      success: true,
      message: "News bookmarked successfully",
      bookmark
    });

  } catch (error) {
    console.error(
      "Add Bookmark Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Get user's bookmarks
export const getBookmarksController = async (req, res) => {
  try {
    const userId = req.userId;

    const bookmarks = await Bookmark.find({
      userId
    })
      .populate(
        "newsId",
        "title summary facts keywords exams source sourceUrl category publishedAt imageUrl"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookmarks.length,
      bookmarks
    });

  } catch (error) {
    console.error(
      "Get Bookmarks Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Remove bookmark
export const removeBookmarkController = async (req, res) => {
  try {
    const userId = req.userId;
    const params = parse(removeBookmarkParamsSchema, req.params, res);

    if (!params) return;

    const { newsId } = params;

    const bookmark = await Bookmark.findOneAndDelete({
      userId,
      newsId
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: "Bookmark not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Bookmark removed successfully"
    });

  } catch (error) {
    console.error(
      "Remove Bookmark Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};