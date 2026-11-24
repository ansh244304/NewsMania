import rateLimit from "express-rate-limit";

// Every limiter answers with the same JSON shape so the frontend can
// show a consistent message when a budget is exhausted.
const createLimiter = ({ windowMs, limit, message }) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message
        }
    });

export const globalLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    message: "Too many requests. Please try again later."
});

export const authLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: "Too many authentication attempts. Please try again later."
});

export const emailLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    message: "Too many email requests. Please try again later."
});

export const aiLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    message: "Too many AI requests. Please try again later."
});

export default {
    globalLimiter,
    authLimiter,
    emailLimiter,
    aiLimiter
};
