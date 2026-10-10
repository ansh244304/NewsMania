import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    // Google accounts never set this, so it has to be optional
    password: {
      type: String,
      required: false,
      default: null
    },

    // Which login method created the account. "local" is email
    // plus password, "google" is a verified Google identity.
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },

    // Defaults to true so accounts created before verification
    // existed are not locked out. The register flow passes
    // false explicitly, and the verify endpoint flips it back.
    isEmailVerified: {
      type: Boolean,
      default: true
    },

    // The six digit code emailed at registration. Both fields are
    // hidden from queries unless .select("+verificationCode") is
    // asked for, so a stray read cannot leak the code.
    verificationCode: {
      type: String,
      default: undefined,
      select: false
    },

    verificationCodeExpiresAt: {
      type: Date,
      default: null,
      select: false
    },

    // Subject id from the Google token, used to link an account
    // across sign ins. Sparse so local users keep no field at all.
    googleId: {
      type: String,
      default: undefined
    },

    avatarUrl: {
      type: String,
      default: ""
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    // Daily streak, advanced by taking the daily quiz
    streak: {
      current: {
        type: Number,
        default: 0
      },

      longest: {
        type: Number,
        default: 0
      },

      // Timestamp of the last day the streak was advanced
      lastActivityAt: {
        type: Date,
        default: null
      }
    },

    // Achievement badges earned from streak milestones
    badges: [
      {
        id: {
          type: String,
          required: true
        },

        name: {
          type: String,
          required: true
        },

        description: {
          type: String,
          default: ""
        },

        days: {
          type: Number,
          default: 0
        },

        earnedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Only Google accounts carry a googleId, so the index has to be
// sparse. Without it every local user would collide on the missing
// value and the second signup would fail.
userSchema.index(
  { googleId: 1 },
  { unique: true, sparse: true }
);

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

export default User;