import { z } from "zod";
import {
  STATIC_GK_EXAMS,
  STATIC_GK_SUBJECTS
} from "../models/StaticGKResource.js";

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const booleanish = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }
  return false;
}, z.boolean());

const stringList = (maxLength = 50) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") return [];
      const values = Array.isArray(value) ? value : [value];
      return values
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean);
    },
    z.array(z.string().max(maxLength)).max(50)
  );

const examList = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return [];
    const values = Array.isArray(value) ? value : [value];
    return values
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  },
  z.array(z.enum(STATIC_GK_EXAMS)).max(STATIC_GK_EXAMS.length)
);

const baseResource = {
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(3000).default(""),
  subject: z.enum(STATIC_GK_SUBJECTS),
  topic: z.string().trim().max(160).default(""),
  targetExams: examList.default([]),
  tags: stringList(40).default([]),
  published: booleanish.default(true),
  featured: booleanish.default(false)
};

export const uploadStaticGKSchema = z.object(baseResource);

export const updateStaticGKSchema = z
  .object({
    ...baseResource,
    description: z.string().trim().max(3000).optional(),
    topic: z.string().trim().max(160).optional(),
    targetExams: examList.optional(),
    tags: stringList(40).optional(),
    published: booleanish.optional(),
    featured: booleanish.optional()
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update"
  });

export const staticGKIdSchema = z.object({
  id: objectId
});

export const listStaticGKQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  subject: z.string().trim().default(""),
  exam: z.string().trim().default(""),
  sort: z.enum(["latest", "oldest", "title", "popular"]).default("latest"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
  includeUnpublished: booleanish.default(false)
});

export { booleanish, stringList };
