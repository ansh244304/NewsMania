import express from "express";

import authController from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const {
    register,
    verifyEmail,
    resendVerification,
    googleLogin,
    login,
    refresh,
    logout,
    me,
    forgotPassword,
    resetPassword,
    changePassword
} = authController;

const router = express.Router();

// Register, then confirm the emailed code
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

// Google popup credential in, normal session out
router.post("/google", googleLogin);

// Login
router.post("/login", login);

// Access tokens expire, so a stored refresh token trades for a
// fresh pair (rotation happens server side)
router.post("/refresh", refresh);

// Server side logout: revoke the refresh token before the client
// clears its copy
router.post("/logout", logout);

// Current user, used to refresh a cached session
router.get("/me", authMiddleware, me);

// Forgot password
router.post("/forgot-password", forgotPassword);

// Reset password
router.post("/reset-password", resetPassword);

// Change password while signed in
router.post("/change-password", authMiddleware, changePassword);

export default router;
