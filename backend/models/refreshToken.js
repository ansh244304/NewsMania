import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revoked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically remove expired refresh tokens from MongoDB
refreshTokenSchema.index({ expiresAt: 1 },{ expireAfterSeconds: 0 });

const RefreshToken =
  mongoose.models.RefreshToken ||
  mongoose.model("RefreshToken", refreshTokenSchema);

export default RefreshToken;
