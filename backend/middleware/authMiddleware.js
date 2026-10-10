import jwt from "jsonwebtoken";

// Access tokens are signed with their own secret when one is set,
// otherwise they fall back to JWT_SECRET like reset tokens do. The
// purpose claim below is what keeps a reset token from being
// replayed against every protected route.
const ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
    try {
        // Get Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Authorization token is missing"
            });
        }

        // Expected: Bearer <token>
        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Token is missing"
            });
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            ACCESS_SECRET
        );

        // Reset links are signed with the same secret as sessions,
        // so the purpose claim is what keeps an emailed reset token
        // from being replayed against every protected route
        if (decoded.purpose && decoded.purpose !== "access") {
            return res.status(401).json({
                message: "Token is not valid for this request"
            });
        }

        // Store user ID in request
        req.userId = decoded.id;

        next();

    } catch (error) {
        console.error("Auth middleware error:", error);

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

export default authMiddleware;