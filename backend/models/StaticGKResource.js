import mongoose from "mongoose";

export const STATIC_GK_SUBJECTS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "General Science",
  "Environment",
  "Art & Culture",
  "Schemes",
  "International Relations",
  "Defence",
  "Miscellaneous"
];

export const STATIC_GK_EXAMS = [
  "UPSC",
  "SSC",
  "Banking",
  "Railway",
  "Defence",
  "State PCS"
];

const staticGKResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000
    },

    subject: {
      type: String,
      required: true,
      enum: STATIC_GK_SUBJECTS,
      index: true
    },

    topic: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160
    },

    targetExams: {
      type: [
        {
          type: String,
          enum: STATIC_GK_EXAMS
        }
      ],
      default: [],
      index: true
    },

    tags: {
      type: [String],
      default: []
    },

    storageKey: {
      type: String,
      required: true,
      select: false
    },

    storageProvider: {
      type: String,
      enum: ["local", "s3"],
      default: "local",
      select: false
    },

    originalFileName: {
      type: String,
      required: true
    },

    fileSize: {
      type: Number,
      required: true,
      min: 0
    },

    mimeType: {
      type: String,
      default: "application/pdf"
    },

    pageCount: {
      type: Number,
      default: null,
      min: 1
    },

    thumbnailKey: {
      type: String,
      default: "",
      select: false
    },

    thumbnailMimeType: {
      type: String,
      default: ""
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    published: {
      type: Boolean,
      default: true,
      index: true
    },

    featured: {
      type: Boolean,
      default: false
    },

    downloadCount: {
      type: Number,
      default: 0,
      min: 0
    },

    ai: {
      status: {
        type: String,
        enum: ["not_processed", "queued", "processing", "ready", "failed"],
        default: "not_processed"
      },
      summary: {
        type: String,
        default: ""
      },
      error: {
        type: String,
        default: ""
      },
      processedAt: {
        type: Date,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

staticGKResourceSchema.index({ published: 1, createdAt: -1 });
staticGKResourceSchema.index({ published: 1, subject: 1, createdAt: -1 });
staticGKResourceSchema.index({ published: 1, targetExams: 1, createdAt: -1 });
staticGKResourceSchema.index({ title: 1 });

const StaticGKResource =
  mongoose.models.StaticGKResource ||
  mongoose.model("StaticGKResource", staticGKResourceSchema);

export default StaticGKResource;
