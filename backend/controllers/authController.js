import authService from "../services/authService.js";
import verificationService from "../services/verificationService.js";
import User from "../models/user.js";
import {
    registerSchema,
    verifyEmailSchema,
    resendVerificationSchema,
    googleLoginSchema,
    loginSchema,
    refreshSchema,
    logoutSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema
} from "../validation/authSchemas.js";

// Safely parses req.body against the given schema. On failure it
// sends a 400 and returns null so the caller can stop early.
const parseBody = (schema, req, res) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
        res.status(400).json({
            message: "Validation failed",
            errors: result.error.issues.map((issue) => ({
                field: issue.path.join(".") || "(root)",
                message: issue.message
            }))
        });

        return null;
    }

    return result.data;
};

// Both register and login answer with the same shape so the
// client can always read token and user from the top level.
const toAuthPayload = (result) => {
    const { token, refreshToken, ...user } = result;

    return { token, refreshToken, user };
};

// Service and Google library errors are plain messages, so the
// status is picked from the wording. Anything unrecognised stays
// a 500 rather than pretending to be a client mistake.
const statusFor = (message) => {
    // A server side misconfiguration is not the caller's fault
    if (/not configured/i.test(message)) return 500;

    if (/does not exist/i.test(message)) return 404;
    if (/already/i.test(message)) return 409;
    if (/too many|expired/i.test(message)) return 429;

    // Only a credential that failed cryptographic verification
    if (/parse token|invalid token|audience|subject|credential/i.test(message)) return 401;

    // A Google account being asked for a password is a bad request,
    // not a failed authentication, so it must not read as a 401
    if (/google|not verified|verify your email|verification|incorrect|invalid|required/i.test(message)) return 400;

    return 500;
};

const register = async (req, res) => {
    try {
        const body = parseBody(registerSchema, req, res);

        if (!body) return;

        const result = await authService.register(body);

        // No token here on purpose. The account has not proved it
        // can read its own mailbox yet, so it gets a session only
        // after the emailed code comes back.
        return res.status(201).json({
            message: "Verification code sent to your email",
            user: {
                id: result.id,
                name: result.name,
                email: result.email,
                requiresVerification: true
            },
            expiresIn: result.expiresIn,
            resendAvailableIn: result.resendAvailableIn
        });

    } catch (error) {
        console.error("Register controller error:", error);

        return res.status(statusFor(error.message)).json({
            message: error.message
        });
    }
};


// Confirms the emailed code and returns the session
const verifyEmail = async (req, res) => {
    try {
        const body = parseBody(verifyEmailSchema, req, res);

        if (!body) return;

        const result = await authService.verifyEmail(body);

        return res.status(200).json({
            message: "Email verified successfully",
            ...toAuthPayload(result)
        });

    } catch (error) {
        console.error("Verify email controller error:", error);

        return res.status(statusFor(error.message)).json({
            message: error.message
        });
    }
};


// Sends another code, answering the same way for known and
// unknown addresses so it cannot be used to probe for accounts
const resendVerification = async (req, res) => {
    try {
        const body = parseBody(resendVerificationSchema, req, res);

        if (!body) return;

        await authService.resendVerification(body);

        return res.status(200).json({
            message: "If that account needs verifying, a new code is on its way",
            resendAvailableIn: verificationService.RESEND_COOLDOWN_SECONDS
        });

    } catch (error) {
        console.error("Resend verification controller error:", error);

        return res.status(statusFor(error.message)).json({
            message: error.message
        });
    }
};


// Trades a Google credential for a normal session
const googleLogin = async (req, res) => {
    try {
        const body = parseBody(googleLoginSchema, req, res);

        if (!body) return;

        const result = await authService.googleLogin(body);

        return res.status(200).json({
            message: result.isNewUser
                ? "Account created with Google"
                : "User logged in successfully",
            ...toAuthPayload(result)
        });

    } catch (error) {
        console.error("Google login controller error:", error);

        return res.status(statusFor(error.message)).json({
            message: error.message
        });
    }
};


const login = async (req, res) => {
    try {
        const body = parseBody(loginSchema, req, res);

        if (!body) return;

        const result = await authService.login(body);

        return res.status(200).json({
            message: "User logged in successfully",
            ...toAuthPayload(result)
        });

    } catch (error) {
        console.error("Login controller error:", error);

        return res.status(statusFor(error.message)).json({
            message: error.message
        });
    }
};


// Trades a stored refresh token for a fresh access token plus a new
// refresh token (rotation)
const refresh = async (req, res) => {
    try {
        const body = parseBody(refreshSchema, req, res);

        if (!body) return;

        const result = await authService.refresh(body);

        return res.status(200).json({
            message: "Tokens refreshed successfully",
            ...toAuthPayload(result)
        });

    } catch (error) {
        console.error("Refresh controller error:", error);

        return res.status(statusFor(error.message)).json({
            message: error.message
        });
    }
};

// Revokes the stored refresh token. The access token is left to
// expire on its own.
const logout = async (req, res) => {
    try {
        const body = parseBody(logoutSchema, req, res);

        if (!body) return;

        await authService.logout(body);

        return res.status(200).json({
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error("Logout controller error:", error);

        return res.status(statusFor(error.message)).json({
            message: error.message
        });
    }
};


// Rehydrate the logged in user from a valid token
const me = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select(
            "name email role avatarUrl provider isEmailVerified streak badges createdAt"
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            message: "User fetched successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatarUrl: user.avatarUrl,
                provider: user.provider,
                isEmailVerified: user.isEmailVerified,
                streak: user.streak,
                badges: user.badges
            }
        });

    } catch (error) {
        console.error("Me controller error:", error);

        return res.status(500).json({
            message: error.message
        });
    }
};


const forgotPassword = async (req, res) => {
    try {
        const body = parseBody(forgotPasswordSchema, req, res);

        if (!body) return;

        await authService.forgotPassword(body);

        return res.status(200).json({
            message: "Password reset link sent to email"
        });

    } catch (error) {
        console.error("Forgot password controller error:", error);

        return res.status(statusFor(error.message)).json({
            message: error.message
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const body = parseBody(resetPasswordSchema, req, res);

        if (!body) return;

        await authService.resetPassword(body);

        return res.status(200).json({
            message: "Password reset successfully"
        });

    } catch (error) {
        console.error("Reset password controller error:", error);

        return res.status(statusFor(error.message)).json({
            message: error.message
        });
    }
};
// Change password while already signed in
const changePassword = async (req, res) => {
    try {
        const body = parseBody(changePasswordSchema, req, res);

        if (!body) return;

        await authService.changePassword({
            userId: req.userId,
            currentPassword: body.currentPassword,
            newPassword: body.newPassword
        });

        return res.status(200).json({
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("Change password controller error:", error);

        return res.status(statusFor(error.message)).json({
            message: error.message
        });
    }
};

export default {
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
};
