// Browser CORS policy.
//
// In development the Vite app can be reached under several spellings
// of the same machine: localhost, 127.0.0.1, or the LAN address Vite
// prints for phone testing. All of them are the same dev box, so the
// loopback origins are accepted whatever the port, rather than having
// to guess which one the address bar used.
//
// Set CORS_ORIGINS in .env for a real deployment. That switches the
// check to an exact list, so nothing outside it is ever allowed.

const isLoopbackOrigin = (origin) => {
    let hostname;

    try {
        // [::1] comes back wrapped in brackets
        hostname = new URL(origin).hostname.replace(/^\[|\]$/g, "");
    } catch {
        return false;
    }

    return (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1"
    );
};

const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const corsOptions = {
    origin(origin, callback) {
        // No Origin header at all, which is curl or a server side
        // call rather than a browser
        if (!origin) {
            return callback(null, true);
        }

        if (configuredOrigins.includes(origin)) {
            return callback(null, true);
        }

        if (!configuredOrigins.length && isLoopbackOrigin(origin)) {
            return callback(null, true);
        }

        return callback(
            new Error(
                `Origin ${origin} is not allowed by CORS`
            )
        );
    }
};

export default corsOptions;
