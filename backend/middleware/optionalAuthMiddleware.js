import jwt from "jsonwebtoken";

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

const optionalAuthMiddleware = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, ACCESS_SECRET);

    if (!decoded.purpose || decoded.purpose === "access") {
      req.userId = decoded.id;
    }
  } catch {
    req.userId = undefined;
  }

  next();
};

export default optionalAuthMiddleware;
