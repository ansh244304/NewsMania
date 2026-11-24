import mongoose from "mongoose";

const staticGKBookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaticGKResource",
      required: true
    }
  },
  {
    timestamps: true
  }
);

staticGKBookmarkSchema.index(
  { userId: 1, resourceId: 1 },
  { unique: true }
);

staticGKBookmarkSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.StaticGKBookmark ||
  mongoose.model("StaticGKBookmark", staticGKBookmarkSchema);
