import jwt from "jsonwebtoken";
import crypto from "crypto";
import RefreshToken from "../models/refreshToken.js";

// Access tokens may use their own secret so they can be rotated
// without invalidating password reset links. Falls back to JWT_SECRET
// so an existing deployment keeps working with no new env vars.
const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

const ACCESS_TOKEN_TTL = "1h";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Short lived JWT the client sends as the Bearer token. Carries the
// purpose claim so authMiddleware can keep rejecting reset tokens,
// and the role so admin routes do not need a second database read.
export const generateAccessToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      purpose: "access"
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

// Opaque random token. Only a sha256 hash is stored, so a database
// leak can never be replayed as a live session.
export const generateRefreshToken = async (user) => {
  const token = crypto.randomBytes(64).toString("hex");

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: crypto
      .createHash("sha256")
      .update(token)
      .digest("hex"),
    expiresAt
  });

  return token;
};

// Looks the presented token up by hash, rejecting revoked and
// expired records. Returns the stored document so the caller can
// read the owning userId.
export const verifyRefreshToken = async (token) => {
  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const record = await RefreshToken.findOne({
    tokenHash,
    revoked: false
  });

  if (!record) {
    throw new Error("Invalid refresh token");
  }

  if (record.expiresAt < new Date()) {
    throw new Error("Refresh token expired");
  }

  return record;
};

// Marks the token as revoked. Called on logout and on rotation, so a
// used refresh token is never good twice.
export const revokeRefreshToken = async (token) => {
  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  await RefreshToken.updateOne(
    { tokenHash },
    { revoked: true }
  );
};

// Issues a full session: a fresh access token plus a stored refresh
// token. Used by login, google sign in, email verification and the
// refresh endpoint so every response is shaped the same.
export const issueTokenPair = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  return { accessToken, refreshToken };
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  issueTokenPair
};