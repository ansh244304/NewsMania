import { z } from "zod";

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const addBookmarkSchema = z.object({
  newsId: objectId
});

export const removeBookmarkParamsSchema = z.object({
  newsId: objectId
});
