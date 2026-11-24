import multer from "multer";
import { getMaxPdfBytes } from "../services/staticGkStorage.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: getMaxPdfBytes(),
    files: 2,
    fields: 40,
    fieldSize: 100 * 1024
  },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname
      .toLowerCase()
      .slice(file.originalname.lastIndexOf("."));

    if (file.fieldname === "file") {
      if (
        extension !== ".pdf" ||
        !["application/pdf", "application/octet-stream"].includes(
          file.mimetype
        )
      ) {
        return callback(new Error("Only PDF files are allowed"));
      }

      return callback(null, true);
    }

    if (file.fieldname === "thumbnail") {
      if (
        ![".png", ".jpg", ".jpeg", ".webp"].includes(extension) ||
        !["image/png", "image/jpeg", "image/webp"].includes(file.mimetype)
      ) {
        return callback(new Error("Thumbnail must be a PNG, JPEG or WebP image"));
      }

      return callback(null, true);
    }

    return callback(new Error("Unexpected file field"));
  }
});

const fields = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 }
]);

const uploadStaticGKFiles = (req, res, next) => {
  fields(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "The uploaded file is larger than the configured limit"
          : error.message;

      return res.status(400).json({
        success: false,
        message
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Could not process the uploaded file"
    });
  });
};

export default uploadStaticGKFiles;
