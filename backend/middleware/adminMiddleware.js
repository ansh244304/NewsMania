import User from "../models/user.js";

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const user = await User.findById(req.userId)
      .select("role");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    next();

  } catch (error) {
    console.error(
      "Admin Middleware Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to verify admin access"
    });
  }
};

export default adminMiddleware;