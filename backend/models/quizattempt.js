import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    newsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "News"
    },

    quizType: {
      type: String,
      enum: ["news", "daily"],
      default: "news"
    },

    answers: [
      {
        mcqId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MCQ",
          required: true
        },

        selectedAnswer: {
          type: String,
          required: true
        },

        correctAnswer: {
          type: String,
          required: true
        },

        isCorrect: {
          type: Boolean,
          required: true
        }
      }
    ],

    totalQuestions: {
      type: Number,
      required: true
    },

    correctAnswers: {
      type: Number,
      required: true
    },

    score: {
      type: Number,
      required: true
    },

    percentage: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  "QuizAttempt",
  quizAttemptSchema
);