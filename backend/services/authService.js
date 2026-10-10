import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { sendEmail } from "./emailService.js";
import verificationService from "./verificationService.js";
import googleAuthService from "./googleAuthService.js";
import tokenService from "./tokenService.js";

// Tokens carry a purpose so a password reset link cannot be
// replayed as a session token, and vice versa.
const signToken = (id, purpose, expiresIn) =>
    jwt.sign(
        { id, purpose },
        process.env.JWT_SECRET,
        { expiresIn }
    );

// A session is an access token plus a stored refresh token, issued
// together so every login path answers with the same shape. The
// client keeps the refresh token somewhere durable and trades it for
// a new pair when the access token expires.
const sessionPayload = async (user) => {
    const { accessToken, refreshToken } =
        await tokenService.issueTokenPair(user);

    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        provider: user.provider,

        // token stays the name the existing client already reads
        token: accessToken,
        refreshToken
    };
};

// Registration no longer hands out a session. The account is
// created unverified, a code goes out by email, and the token is
// only issued once that code comes back.
const register = async ({ name, email, password }) => {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        if (!existingUser.isEmailVerified) {
            throw new Error(
                "Account is not verified. Please check your email"
            );
        }

        if (existingUser.provider === "google") {
            throw new Error(
                "This email is registered with Google. Continue with Google instead"
            );
        }

        throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        provider: "local",
        isEmailVerified: false
    });

    const verification = await verificationService.sendVerificationCode(
        newUser
    );

    return {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        requiresVerification: true,
        ...verification
    };
};

// Confirms the emailed code and, on success, returns the session
// the rest of the app expects.
const verifyEmail = async ({ email, code }) => {
    const user = await User.findOne({ email }).select(
        "+verificationCode +verificationCodeExpiresAt"
    );

    if (!user) {
        throw new Error("User does not exist");
    }

    if (user.isEmailVerified) {
        throw new Error("Email is already verified. Please sign in");
    }

    await verificationService.verifyCode(user, code);

    await verificationService.markVerified(user);

    return sessionPayload(user);
};

// Sends another code to an account that is still unverified. The
// response is identical whether or not the email is known, so this
// cannot be used to find registered addresses.
const resendVerification = async ({ email }) => {
    const user = await User.findOne({ email }).select(
        "+verificationCode +verificationCodeExpiresAt"
    );

    if (!user || user.isEmailVerified) {
        return true;
    }

    await verificationService.sendVerificationCode(user, {
        isResend: true
    });

    return true;
};

const login = async ({ email, password }) => {
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
        throw new Error("User does not exist");
    }

    // Google only accounts have no password to compare against
    if (existingUser.provider === "google" || !existingUser.password) {
        throw new Error(
            "This account uses Google. Please continue with Google"
        );
    }

    const isMatch = await bcrypt.compare(
        password,
        existingUser.password
    );

    if (!isMatch) {
        throw new Error("Invalid credentials");
    }

    // A password match does not prove the mailbox is real, so an
    // unverified account has to clear the emailed code first.
    if (!existingUser.isEmailVerified) {
        throw new Error(
            "Please verify your email before signing in"
        );
    }

    return sessionPayload(existingUser);
};

// Exchanges a Google credential for a normal session, so the rest
// of the app never learns that Google was involved.
const googleLogin = async ({ credential }) => {
    const result = await googleAuthService.googleLogin(credential);

    const user = await User.findById(result.id);

    return sessionPayload(user);
};


const forgotPassword = async ({ email }) => {
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
        throw new Error("User does not exist");
    }

    // Purpose tagged so authMiddleware will refuse to treat this
    // as a session token, and short lived on purpose
    const token = signToken(
        existingUser._id,
        "reset",
        "15m"
    );

    const url =
        `${process.env.FRONTEND_URL || "http://localhost:4000"}/reset-password/${token}`;

    const subject = "Password Reset Request";

    const html = `
        <h2>Password Reset</h2>

        <p>Hello ${existingUser.name},</p>

        <p>You requested to reset your password.</p>

        <p>Click the link below to reset your password:</p>

        <p>
            <a href="${url}">
                Reset Password
            </a>
        </p>

        <p>This link will expire in 15 minutes.</p>

        <p>
            If you did not request this, please ignore this email.
        </p>
    `;

    await sendEmail(
        existingUser.email,
        subject,
        html
    );

    return true;
};
const resetPassword = async ({ token, newPassword }) => {
    try {
        // Verify reset token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // A session token is not a reset token, and vice versa
        if (decoded.purpose !== "reset") {
            throw new Error("Invalid reset token");
        }

        // Find user
        const user = await User.findById(decoded.id);

        if (!user) {
            throw new Error("User does not exist");
        }

        // A Google linked account has no password to overwrite
        if (user.provider === "google" || !user.password) {
            throw new Error(
                "This account uses Google. Please continue with Google"
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(
            newPassword,
            10
        );

        // Update password
        user.password = hashedPassword;

        await user.save();

        return true;

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new Error("Reset token has expired");
        }

        if (error.name === "JsonWebTokenError") {
            throw new Error("Invalid reset token");
        }

        throw error;
    }
};

// Changing a password from inside the app, so the current
// password has to be proven before anything is written.
const changePassword = async ({
    userId,
    currentPassword,
    newPassword
}) => {
    if (!currentPassword || !newPassword) {
        throw new Error("Both the current and new password are required");
    }

    if (currentPassword === newPassword) {
        throw new Error("New password must be different from the current one");
    }

    if (newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User does not exist");
    }

    // Google only accounts never had a password to replace
    if (user.provider === "google" || !user.password) {
        throw new Error(
            "This account uses Google and has no password to change"
        );
    }

    const isMatch = await bcrypt.compare(
        currentPassword,
        user.password
    );

    if (!isMatch) {
        throw new Error("Current password is incorrect");
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    return true;
};

// A refresh token is single use. The stored hash is verified, then
// revoked (rotation) before a fresh pair is handed back, so a leaked
// or replayed token is only ever good once.
const refresh = async ({ refreshToken }) => {
    if (!refreshToken) {
        throw new Error("Refresh token is required");
    }

    const record = await tokenService.verifyRefreshToken(refreshToken);

    const user = await User.findById(record.userId);

    if (!user) {
        throw new Error("User does not exist");
    }

    // Rotate before issuing the new pair so the old token cannot be
    // replayed after it has been swapped
    await tokenService.revokeRefreshToken(refreshToken);

    return sessionPayload(user);
};

// Revolving the stored refresh token is enough to kill the session;
// the access token expires on its own shortly after.
const logout = async ({ refreshToken }) => {
    if (refreshToken) {
        await tokenService.revokeRefreshToken(refreshToken);
    }

    return true;
};

export default {
    register,
    verifyEmail,
    resendVerification,
    login,
    googleLogin,
    forgotPassword,
    resetPassword,
    changePassword,
    refresh,
    logout
};