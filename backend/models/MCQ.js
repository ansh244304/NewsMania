import mongoose from "mongoose";

const mcqSchema = new mongoose.Schema(
  {
    newsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "News",
      required: true
    },

    question: {
      type: String,
      required: true,
      trim: true
    },

    options: {
      type: [String],
      required: true,
      validate: {
        validator: function (value) {
          return value.length === 4;
        },
        message: "MCQ must have exactly 4 options"
      }
    },

    correctAnswer: {
      type: String,
      required: true
    },

    explanation: {
      type: String,
      required: true
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium"
    },

    exam: {
      type: [String],
      default: []
    },

    category: {
      type: String,
      default: "Current Affairs"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("MCQ", mcqSchema);