import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    content: {
      type: String,
      required: true
    },

    // AI generated summary
    summary: {
      type: String,
      default: ""
    },

    // AI generated important facts
    facts: {
      type: [String],
      default: []
    },

    // AI generated keywords
    keywords: {
      type: [String],
      default: []
    },

    // Relevant exams
    exams: {
      type: [String],
      default: []
    },

    source: {
      type: String,
      required: true
    },

    sourceUrl: {
      type: String,
      required: true,
      unique: true
    },

    category: {
      type: String,
      enum: [
        "National",
        "International",
        "Economy",
        "Science",
        "Technology",
        "Environment",
        "Defence",
        "Sports",
        "Polity",
        "Other"
      ],
      default: "Other"
    },

    publishedAt: {
      type: Date
    },

    imageUrl: {
      type: String
    },

    tags: [
      {
        type: String
      }
    ]
  },
  {
    timestamps: true
  }
);

export default mongoose.model("News", newsSchema);