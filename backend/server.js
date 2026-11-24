import "dotenv/config";

import connectDB from "./config/db.js";
import app from "./app.js";

// Fail fast instead of starting a server that cannot serve requests
const REQUIRED_ENV = [
    "MONGO_URI",
    "JWT_SECRET",
    "FRONTEND_URL"
];

const missing = REQUIRED_ENV.filter(
    (name) => !process.env[name]
);

if (missing.length > 0) {
    console.error(
        `Missing required environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
}

if (
    process.env.NODE_ENV === "production" &&
    !process.env.CORS_ORIGINS
) {
    console.error(
        "CORS_ORIGINS is required when NODE_ENV is production"
    );
    process.exit(1);
}

process.on("unhandledRejection", (reason) => {
    console.error(
        "Unhandled promise rejection:",
        reason
    );
});

const PORT = process.env.PORT || 5000;

const start = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(
            `Server is running on port ${PORT}`
        );
    });
};

start();
