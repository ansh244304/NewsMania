import crypto from "crypto";
import User from "../models/user.js";
import { sendEmail } from "./emailService.js";

// How long a code stays usable, and how long the user has to
// wait before asking for another one.
const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

// There is no rate limit package in this project, so the send and
// guess budgets are tracked here. This is per process, which is
// enough to blunt casual abuse on a single node and keeps the
// endpoints from being a free email cannon.
const MAX_SENDS_PER_HOUR = 5;
const MAX_GUESSES_PER_CODE = 5;

const sendBudget = new Map();
const guessBudget = new Map();

const prune = (map, windowMs) => {
    const cutoff = Date.now() - windowMs;

    for (const [key, stamps] of map) {
        const kept = stamps.filter(
            (stamp) => stamp > cutoff
        );

        if (kept.length) {
            map.set(key, kept);
        } else {
            map.delete(key);
        }
    }
};

const isBlocked = (map, key, limit, windowMs) => {
    prune(map, windowMs);

    return (map.get(key) || []).length >= limit;
};

const record = (map, key) => {
    const stamps = map.get(key) || [];

    stamps.push(Date.now());
    map.set(key, stamps);
};

// Cryptographically random digits, drawn from the
// unambiguous set so the code is easy to retype from an email.
const generateCode = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i += 1) {
        code += alphabet[
            crypto.randomInt(0, alphabet.length)
        ];
    }

    return code;
};

const buildVerificationEmail = ({ name, code }) => {
    const minutes = CODE_TTL_MINUTES;

    return `
        <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:auto;color:#0c1424">
            <h2 style="margin:0 0 16px">Confirm your email</h2>

            <p>Hello ${name},</p>

            <p>
                Enter this code to finish creating your
                Newsmania account:
            </p>

            <p style="font-size:32px;font-weight:800;letter-spacing:.35em;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 24px;text-align:center">
                ${code}
            </p>

            <p>This code expires in ${minutes} minutes.</p>

            <p style="color:#64748b;font-size:13px">
                If you did not sign up for Newsmania, you
                can ignore this email.
            </p>
        </div>
    `;
};

// Issues a fresh code for a user and mails it out. Any code
// already in flight is overwritten, so the newest mail is
// always the only one that works.
const sendVerificationCode = async (user, { isResend = false } = {}) => {
    const key = user._id.toString();

    if (
        isResend &&
        isBlocked(
            sendBudget,
            key,
            MAX_SENDS_PER_HOUR,
            60 * 60 * 1000
        )
    ) {
        throw new Error("Too many codes requested. Try again later");
    }

    if (isResend) {
        record(sendBudget, key);
    }

    const code = generateCode();

    user.verificationCode = code;
    user.verificationCodeExpiresAt = new Date(
        Date.now() + CODE_TTL_MINUTES * 60 * 1000
    );

    await user.save();

    await sendEmail(
        user.email,
        isResend
            ? "Your new Newsmania verification code"
            : "Confirm your Newsmania email",
        buildVerificationEmail({ name: user.name, code })
    );

    return {
        expiresIn: CODE_TTL_MINUTES * 60,
        resendAvailableIn: RESEND_COOLDOWN_SECONDS
    };
};

// Checks a submitted code against the stored one. Attempts are
// budgeted per user so a six character code cannot be brute
// forced, and every failure burns one attempt.
const verifyCode = async (user, code) => {
    if (!user.verificationCode) {
        throw new Error("No verification code was requested");
    }

    if (
        !user.verificationCodeExpiresAt ||
        user.verificationCodeExpiresAt.getTime() < Date.now()
    ) {
        throw new Error("Verification code has expired");
    }

    const key = user._id.toString();

    if (
        isBlocked(
            guessBudget,
            key,
            MAX_GUESSES_PER_CODE,
            15 * 60 * 1000
        )
    ) {
        throw new Error("Too many incorrect attempts. Request a new code");
    }

    const submitted = String(code || "")
        .trim()
        .toUpperCase();

    const stored = user.verificationCode
        .trim()
        .toUpperCase();

    if (
        submitted.length !== stored.length ||
        !crypto.timingSafeEqual(
            Buffer.from(submitted),
            Buffer.from(stored)
        )
    ) {
        record(guessBudget, key);

        throw new Error("Incorrect verification code");
    }

    return true;
};

// Flips the account to verified and burns the code so it cannot
// be replayed against the endpoint.
const markVerified = async (user) => {
    user.isEmailVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpiresAt = null;

    // A verified user gets a clean guess budget
    guessBudget.delete(user._id.toString());

    await user.save();

    return user;
};

export default {
    sendVerificationCode,
    verifyCode,
    markVerified,
    CODE_TTL_MINUTES,
    RESEND_COOLDOWN_SECONDS
};
