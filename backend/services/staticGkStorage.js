import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BACKEND_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

let s3Client = null;

const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const getMaxPdfBytes = () =>
  numberFromEnv("STATIC_GK_MAX_FILE_MB", 25) * 1024 * 1024;

export const getMaxThumbnailBytes = () =>
  numberFromEnv("STATIC_GK_MAX_THUMBNAIL_MB", 2) * 1024 * 1024;

export const getUploadRoot = () =>
  path.resolve(
    process.env.STATIC_GK_UPLOAD_DIR ||
      path.join(BACKEND_ROOT, "uploads", "static-gk")
  );

export const getStorageProvider = () =>
  process.env.STATIC_GK_STORAGE_DRIVER === "s3" ? "s3" : "local";

const getS3Config = () => {
  const bucket = process.env.STATIC_GK_S3_BUCKET;

  if (!bucket) {
    throw new Error("STATIC_GK_S3_BUCKET is required for S3 storage");
  }

  const accessKeyId = process.env.STATIC_GK_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STATIC_GK_S3_SECRET_ACCESS_KEY;

  return {
    bucket,
    prefix: (process.env.STATIC_GK_S3_PREFIX || "static-gk").replace(
      /^\/+|\/+$/g,
      ""
    ),
    clientConfig: {
      region: process.env.STATIC_GK_S3_REGION || "auto",
      endpoint: process.env.STATIC_GK_S3_ENDPOINT || undefined,
      forcePathStyle:
        String(process.env.STATIC_GK_S3_FORCE_PATH_STYLE).toLowerCase() ===
        "true",
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined
    }
  };
};

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client(getS3Config().clientConfig);
  }

  return s3Client;
};

const resolveLocalPath = (storageKey) => {
  const root = getUploadRoot();
  const fullPath = path.resolve(root, storageKey);
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;

  if (!fullPath.startsWith(rootPrefix)) {
    throw new Error("Invalid storage key");
  }

  return fullPath;
};

const makeStorageKey = (extension) => {
  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}`;
  const name = `${crypto.randomUUID()}${extension}`;

  if (getStorageProvider() === "s3") {
    const { prefix } = getS3Config();
    return [prefix, folder, name].filter(Boolean).join("/");
  }

  return ["static-gk", folder, name].join("/");
};

const putObject = async ({ key, buffer, contentType }) => {
  if (getStorageProvider() === "s3") {
    const { bucket } = getS3Config();

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType
      })
    );

    return;
  }

  const fullPath = resolveLocalPath(key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer, { flag: "wx" });
};

export const validatePdfBuffer = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error("A PDF file is required");
  }

  if (buffer.length > getMaxPdfBytes()) {
    throw new Error(
      `PDF is too large. Maximum size is ${Math.floor(
        getMaxPdfBytes() / (1024 * 1024)
      )} MB`
    );
  }

  const header = buffer.subarray(0, 1024).toString("latin1");

  if (!header.includes("%PDF-")) {
    throw new Error("The uploaded file is not a valid PDF");
  }

  let pageCount = null;

  try {
    const document = await PDFDocument.load(buffer, {
      updateMetadata: false,
      ignoreEncryption: true
    });
    pageCount = document.getPageCount();
  } catch {
    throw new Error("The uploaded PDF is damaged or password protected");
  }

  if (!pageCount) {
    throw new Error("The uploaded PDF has no readable pages");
  }

  return pageCount;
};

const detectImageType = (buffer) => {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { extension: ".png", mimeType: "image/png" };
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { extension: ".jpg", mimeType: "image/jpeg" };
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { extension: ".webp", mimeType: "image/webp" };
  }

  return null;
};

export const validateThumbnailBuffer = (buffer) => {
  if (!buffer?.length) {
    throw new Error("The thumbnail file is empty");
  }

  if (buffer.length > getMaxThumbnailBytes()) {
    throw new Error(
      `Thumbnail is too large. Maximum size is ${Math.floor(
        getMaxThumbnailBytes() / (1024 * 1024)
      )} MB`
    );
  }

  const type = detectImageType(buffer);

  if (!type) {
    throw new Error("Thumbnail must be a PNG, JPEG or WebP image");
  }

  return type;
};

export const savePdfFile = async ({ buffer, originalFileName }) => {
  const pageCount = await validatePdfBuffer(buffer);
  const storageKey = makeStorageKey(".pdf");

  await putObject({
    key: storageKey,
    buffer,
    contentType: "application/pdf"
  });

  return {
    storageKey,
    storageProvider: getStorageProvider(),
    pageCount,
    originalFileName: path.basename(originalFileName || "document.pdf")
  };
};

export const saveThumbnailFile = async ({ buffer }) => {
  const type = validateThumbnailBuffer(buffer);
  const thumbnailKey = makeStorageKey(type.extension);

  await putObject({
    key: thumbnailKey,
    buffer,
    contentType: type.mimeType
  });

  return {
    thumbnailKey,
    thumbnailMimeType: type.mimeType
  };
};

export const deleteStoredFile = async (
  storageKey,
  provider = getStorageProvider()
) => {
  if (!storageKey) return;

  if (provider === "s3") {
    const { bucket } = getS3Config();

    try {
      await getS3Client().send(
        new DeleteObjectCommand({ Bucket: bucket, Key: storageKey })
      );
    } catch (error) {
      if (error?.name !== "NoSuchKey") throw error;
    }

    return;
  }

  const fullPath = resolveLocalPath(storageKey);

  try {
    await fs.unlink(fullPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
};

export const getLocalFilePath = (storageKey) => resolveLocalPath(storageKey);

const safeFileName = (value, fallback = "document.pdf") =>
  path
    .basename(String(value || fallback))
    .replace(/[\r\n"]/g, "")
    .slice(0, 180) || fallback;

export const getSignedFileUrl = async ({
  storageKey,
  provider = getStorageProvider(),
  download = false,
  fileName = "document.pdf"
}) => {
  if (provider !== "s3") {
    throw new Error("Signed URLs are only available with S3 storage");
  }

  const { bucket } = getS3Config();
  const disposition = `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(
    safeFileName(fileName)
  )}`;

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ResponseContentDisposition: disposition
    }),
    {
      expiresIn: numberFromEnv("STATIC_GK_SIGNED_URL_SECONDS", 300)
    }
  );
};

export const getStoredObjectBuffer = async (
  storageKey,
  provider = getStorageProvider()
) => {
  if (provider === "s3") {
    const { bucket } = getS3Config();
    const response = await getS3Client().send(
      new GetObjectCommand({ Bucket: bucket, Key: storageKey })
    );

    return Buffer.from(await response.Body.transformToByteArray());
  }

  return fs.readFile(resolveLocalPath(storageKey));
};
