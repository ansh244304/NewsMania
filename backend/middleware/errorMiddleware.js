// Catch-all for requests that matched no route
export const notFound = (req, res) => {
    return res.status(404).json({
        success: false,
        message: "Route not found"
    });
};

// Central error responder. Server faults answer with a generic
// message so stack traces and internal details never reach a client.
export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    // The CORS config rejects unknown origins with a CORS error
    if (/cors/i.test(err.message || "")) {
        return res.status(403).json({
            success: false,
            message: "Origin is not allowed by CORS"
        });
    }

    const status =
        Number(err.status || err.statusCode) || 500;

    if (status >= 500) {
        console.error(
            "Unhandled error:",
            err.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }

    return res.status(status).json({
        success: false,
        message: err.message || "Request failed"
    });
};

export default {
    notFound,
    errorHandler
};
