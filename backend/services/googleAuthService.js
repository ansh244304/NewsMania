import { OAuth2Client } from "google-auth-library";
import User from "../models/user.js";

// One client is enough. verifyIdToken checks the signature against
// Google's public keys and rejects expired, replayed or
// wrong-audience tokens, so the browser credential never has to be
// trusted on its own.
let client = null;

const getClient = () => {
    if (client) {
        return client;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
        throw new Error("Google sign in is not configured on the server");
    }

    client = new OAuth2Client(clientId);

    return client;
};

// Reads and validates the credential the browser got from the
// Google popup, returning the profile fields we store.
const verifyGoogleToken = async (credential) => {
    if (!credential) {
        throw new Error("Google credential is missing");
    }

    const ticket = await getClient().verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload.sub) {
        throw new Error("Google token is missing a subject id");
    }

    // Only a confirmed Google email may be trusted enough to match
    // an existing local account. Without this check an attacker
    // could claim an unverified address and take the account over.
    if (!payload.email || payload.email_verified !== true) {
        throw new Error("Google account email is not verified");
    }

    return {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email.split("@")[0],
        avatarUrl: payload.picture || ""
    };
};

// Signs a user in with Google, creating the account on first use.
// An existing local account with the same verified email is
// linked instead of duplicated, so a user who signed up with a
// password can later add Google without losing their progress.
const googleLogin = async (credential) => {
    const profile = await verifyGoogleToken(credential);

    let user = await User.findOne({ googleId: profile.googleId });

    if (!user) {
        user = await User.findOne({ email: profile.email });
    }

    if (user) {
        // Backfill the missing identity on a linked local account
        if (!user.googleId) {
            user.googleId = profile.googleId;
        }

        user.provider = "google";
        user.isEmailVerified = true;

        if (profile.avatarUrl) {
            user.avatarUrl = profile.avatarUrl;
        }

        if (!user.name) {
            user.name = profile.name;
        }

        await user.save();
    } else {
        user = await User.create({
            name: profile.name,
            email: profile.email,
            password: null,
            provider: "google",
            isEmailVerified: true,
            googleId: profile.googleId,
            avatarUrl: profile.avatarUrl
        });
    }

    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        isNewUser: user.createdAt.getTime() > Date.now() - 5000
    };
};

export default {
    verifyGoogleToken,
    googleLogin
};
