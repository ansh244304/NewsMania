import mongoose from "mongoose";

const dailyQuizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    date: {
      type: Date,
      required: true
    },

    mcqs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MCQ",
        required: true
      }
    ],

    totalQuestions: {
      type: Number,
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  "DailyQuiz",
  dailyQuizSchema
);

// One quiz per calendar day. `date` is always stored at midnight UTC so a
// plain index is enough; a `unique` field index would have blocked every
// day after the first.
dailyQuizSchema.index({ date: 1 }, { unique: true });