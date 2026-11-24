import StaticGKResource, {
  STATIC_GK_EXAMS,
  STATIC_GK_SUBJECTS
} from "../models/StaticGKResource.js";
import StaticGKBookmark from "../models/StaticGKBookmark.js";
import User from "../models/user.js";
import {
  listStaticGKQuerySchema,
  staticGKIdSchema,
  updateStaticGKSchema,
  uploadStaticGKSchema
} from "../validation/staticGKSchemas.js";
import {
  deleteStoredFile,
  getLocalFilePath,
  getSignedFileUrl,
  savePdfFile,
  saveThumbnailFile
} from "../services/staticGkStorage.js";

const parse = (schema, value, res) => {
  const result = schema.safeParse(value ?? {});

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "(root)",
        message: issue.message
      }))
    });

    return null;
  }

  return result.data;
};

const isAdminUser = async (userId) => {
  if (!userId) return false;

  const user = await User.findById(userId).select("role").lean();

  return user?.role === "admin";
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const publicResource = (resource) => {
  const data =
    typeof resource.toObject === "function"
      ? resource.toObject()
      : { ...resource };

  const id = String(data._id);
  const hasThumbnail = Boolean(data.thumbnailMimeType);

  delete data.storageKey;
  delete data.storageProvider;
  delete data.thumbnailKey;

  return {
    ...data,
    id,
    fileUrl: `/static-gk/${id}/file`,
    thumbnailUrl: hasThumbnail ? `/static-gk/${id}/thumbnail` : null,
    hasThumbnail,
    ai: data.ai || { status: "not_processed", summary: "", error: "" }
  };
};

const contentDisposition = (fileName, download) =>
  `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(
    fileName || "document.pdf"
  )}`;

const fileHeaders = (resource, download) => ({
  "Content-Type": "application/pdf",
  "Content-Disposition": contentDisposition(
    resource.originalFileName,
    download
  ),
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": resource.published ? "private, max-age=60" : "private, no-store"
});

export const listStaticGKController = async (req, res) => {
  try {
    const query = parse(listStaticGKQuerySchema, req.query, res);

    if (!query) return;

    if (query.subject && !STATIC_GK_SUBJECTS.includes(query.subject)) {
      return res.status(400).json({
        success: false,
        message: "Unknown subject filter"
      });
    }

    if (query.exam && !STATIC_GK_EXAMS.includes(query.exam)) {
      return res.status(400).json({
        success: false,
        message: "Unknown exam filter"
      });
    }

    const includeUnpublished =
      query.includeUnpublished && (await isAdminUser(req.userId));

    const filter = includeUnpublished ? {} : { published: true };

    if (query.subject) filter.subject = query.subject;
    if (query.exam) filter.targetExams = query.exam;

    const search = query.q.trim();

    if (search) {
      const term = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { title: term },
        { description: term },
        { topic: term },
        { tags: term },
        { subject: term }
      ];
    }

    const sort =
      query.sort === "oldest"
        ? { createdAt: 1 }
        : query.sort === "title"
          ? { title: 1 }
          : query.sort === "popular"
            ? { downloadCount: -1, createdAt: -1 }
            : { createdAt: -1 };

    const skip = (query.page - 1) * query.limit;

    const [resources, total] = await Promise.all([
      StaticGKResource.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(query.limit)
        .select("-ai.summary"),
      StaticGKResource.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      resources: resources.map(publicResource),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit))
    });
  } catch (error) {
    console.error("List Static GK Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load the Static GK library"
    });
  }
};

export const getStaticGKController = async (req, res) => {
  try {
    const params = parse(staticGKIdSchema, req.params, res);

    if (!params) return;

    const resource = await StaticGKResource.findById(params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    if (!resource.published && !(await isAdminUser(req.userId))) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    let bookmarked = false;

    if (req.userId) {
      bookmarked = Boolean(
        await StaticGKBookmark.exists({
          userId: req.userId,
          resourceId: resource._id
        })
      );
    }

    res.status(200).json({
      success: true,
      resource: {
        ...publicResource(resource),
        bookmarked
      }
    });
  } catch (error) {
    console.error("Get Static GK Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load this resource"
    });
  }
};

export const uploadStaticGKController = async (req, res) => {
  const pdfFile = req.files?.file?.[0];
  const thumbnailFile = req.files?.thumbnail?.[0];

  let savedPdf = null;
  let savedThumbnail = null;

  try {
    const body = parse(uploadStaticGKSchema, req.body, res);

    if (!body) return;

    if (!pdfFile) {
      return res.status(400).json({
        success: false,
        message: "A PDF file is required"
      });
    }

    savedPdf = await savePdfFile({
      buffer: pdfFile.buffer,
      originalFileName: pdfFile.originalname
    });

    if (thumbnailFile) {
      savedThumbnail = await saveThumbnailFile({
        buffer: thumbnailFile.buffer
      });
    }

    const resource = await StaticGKResource.create({
      ...body,
      storageKey: savedPdf.storageKey,
      storageProvider: savedPdf.storageProvider,
      originalFileName: savedPdf.originalFileName,
      fileSize: pdfFile.size,
      mimeType: "application/pdf",
      pageCount: savedPdf.pageCount,
      thumbnailKey: savedThumbnail?.thumbnailKey || "",
      thumbnailMimeType: savedThumbnail?.thumbnailMimeType || "",
      uploadedBy: req.userId
    });

    res.status(201).json({
      success: true,
      message: "PDF notes uploaded successfully",
      resource: publicResource(resource)
    });
  } catch (error) {
    console.error("Upload Static GK Error:", error.message);

    if (savedPdf) {
      await deleteStoredFile(
        savedPdf.storageKey,
        savedPdf.storageProvider
      ).catch((cleanupError) =>
        console.error("Static GK cleanup error:", cleanupError.message)
      );
    }

    if (savedThumbnail) {
      await deleteStoredFile(savedThumbnail.thumbnailKey).catch(
        (cleanupError) =>
          console.error("Static GK cleanup error:", cleanupError.message)
      );
    }

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map((item) => item.message)
          .join(", ")
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || "Could not upload the PDF"
    });
  }
};

export const updateStaticGKController = async (req, res) => {
  try {
    const params = parse(staticGKIdSchema, req.params, res);

    if (!params) return;

    const body = parse(updateStaticGKSchema, req.body, res);

    if (!body) return;

    const resource = await StaticGKResource.findByIdAndUpdate(
      params.id,
      body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Resource updated successfully",
      resource: publicResource(resource)
    });
  } catch (error) {
    console.error("Update Static GK Error:", error.message);

    res.status(400).json({
      success: false,
      message: error.message || "Could not update the resource"
    });
  }
};

export const deleteStaticGKController = async (req, res) => {
  try {
    const params = parse(staticGKIdSchema, req.params, res);

    if (!params) return;

    const resource = await StaticGKResource.findById(params.id).select(
      "+storageKey +storageProvider +thumbnailKey"
    );

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    await deleteStoredFile(
      resource.storageKey,
      resource.storageProvider || "local"
    );

    if (resource.thumbnailKey) {
      await deleteStoredFile(
        resource.thumbnailKey,
        resource.storageProvider || "local"
      );
    }

    await Promise.all([
      StaticGKResource.deleteOne({ _id: resource._id }),
      StaticGKBookmark.deleteMany({ resourceId: resource._id })
    ]);

    res.status(200).json({
      success: true,
      message: "Resource deleted successfully"
    });
  } catch (error) {
    console.error("Delete Static GK Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not delete the resource"
    });
  }
};

export const serveStaticGKFileController = async (req, res) => {
  try {
    const params = parse(staticGKIdSchema, req.params, res);

    if (!params) return;

    const resource = await StaticGKResource.findById(params.id).select(
      "+storageKey +storageProvider"
    );

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    if (!resource.published && !(await isAdminUser(req.userId))) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    const download = String(req.query.download || "") === "1";

    if (download) {
      StaticGKResource.updateOne(
        { _id: resource._id },
        { $inc: { downloadCount: 1 } }
      ).catch((error) =>
        console.error("Download count error:", error.message)
      );
    }

    if (resource.storageProvider === "s3") {
      const url = await getSignedFileUrl({
        storageKey: resource.storageKey,
        provider: "s3",
        download,
        fileName: resource.originalFileName
      });

      return res.redirect(302, url);
    }

    const filePath = getLocalFilePath(resource.storageKey);

    return res.sendFile(
      filePath,
      { headers: fileHeaders(resource, download) },
      (error) => {
        if (error && !res.headersSent) {
          res.status(404).json({
            success: false,
            message: "The stored PDF file could not be found"
          });
        }
      }
    );
  } catch (error) {
    console.error("Serve Static GK Error:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Could not open the PDF file"
      });
    }
  }
};

export const serveStaticGKThumbnailController = async (req, res) => {
  try {
    const params = parse(staticGKIdSchema, req.params, res);

    if (!params) return;

    const resource = await StaticGKResource.findById(params.id).select(
      "+thumbnailKey +storageProvider"
    );

    if (!resource || !resource.thumbnailKey) {
      return res.status(404).json({
        success: false,
        message: "Thumbnail not found"
      });
    }

    if (!resource.published && !(await isAdminUser(req.userId))) {
      return res.status(404).json({
        success: false,
        message: "Thumbnail not found"
      });
    }

    if (resource.storageProvider === "s3") {
      const url = await getSignedFileUrl({
        storageKey: resource.thumbnailKey,
        provider: "s3",
        fileName: "thumbnail"
      });

      return res.redirect(302, url);
    }

    const filePath = getLocalFilePath(resource.thumbnailKey);

    return res.sendFile(
      filePath,
      {
        headers: {
          "Content-Type": resource.thumbnailMimeType || "image/jpeg",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": resource.published
            ? "private, max-age=300"
            : "private, no-store"
        }
      },
      (error) => {
        if (error && !res.headersSent) {
          res.status(404).json({
            success: false,
            message: "Thumbnail not found"
          });
        }
      }
    );
  } catch (error) {
    console.error("Serve Static GK Thumbnail Error:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Could not load the thumbnail"
      });
    }
  }
};

export const addStaticGKBookmarkController = async (req, res) => {
  try {
    const params = parse(staticGKIdSchema, req.params, res);

    if (!params) return;

    const resource = await StaticGKResource.findOne({
      _id: params.id,
      published: true
    }).select("_id");

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    const existing = await StaticGKBookmark.exists({
      userId: req.userId,
      resourceId: params.id
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Resource already bookmarked"
      });
    }

    await StaticGKBookmark.create({
      userId: req.userId,
      resourceId: params.id
    });

    res.status(201).json({
      success: true,
      message: "Resource saved to bookmarks"
    });
  } catch (error) {
    console.error("Add Static GK Bookmark Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not save this bookmark"
    });
  }
};

export const removeStaticGKBookmarkController = async (req, res) => {
  try {
    const params = parse(staticGKIdSchema, req.params, res);

    if (!params) return;

    const bookmark = await StaticGKBookmark.findOneAndDelete({
      userId: req.userId,
      resourceId: params.id
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: "Bookmark not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Bookmark removed"
    });
  } catch (error) {
    console.error("Remove Static GK Bookmark Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not remove this bookmark"
    });
  }
};

export const listStaticGKBookmarksController = async (req, res) => {
  try {
    const bookmarks = await StaticGKBookmark.find({
      userId: req.userId
    })
      .populate({
        path: "resourceId",
        match: { published: true }
      })
      .sort({ createdAt: -1 });

    const resources = bookmarks
      .map((bookmark) => bookmark.resourceId)
      .filter(Boolean)
      .map(publicResource);

    res.status(200).json({
      success: true,
      count: resources.length,
      resources
    });
  } catch (error) {
    console.error("List Static GK Bookmark Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load your saved notes"
    });
  }
};
