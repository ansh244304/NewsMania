import News from "../models/News.js";
import { generateNewsAnalysis } from "../services/aiService.js";


// Generate AI analysis for a news article
export const generateNewsAnalysisController = async (req, res) => {
  try {

    const { id } = req.params;

    // Find news in MongoDB
    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News not found"
      });
    }

    // Check article content
    if (!news.content || news.content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "News content is empty"
      });
    }

    // Send article content to Gemini
    const analysis = await generateNewsAnalysis(
      news.content
    );

    // Save AI generated data
    news.summary = analysis.summary;
    news.facts = analysis.facts;
    news.keywords = analysis.keywords;
    news.exams = analysis.exams;

    await news.save();

    // Send response
    res.status(200).json({
      success: true,
      message: "AI analysis generated successfully",
      data: {
        newsId: news._id,
        summary: news.summary,
        facts: news.facts,
        keywords: news.keywords,
        exams: news.exams
      }
    });

  } catch (error) {

    console.error(
      "AI Controller Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to generate AI analysis"
    });

  }
};