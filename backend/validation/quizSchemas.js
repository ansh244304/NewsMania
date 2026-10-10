import { z } from "zod";

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const answerSchema = z.object({
  mcqId: objectId,
  selectedAnswer: z.string({ message: "Selected answer is required" })
});

export const submitQuizSchema = z.object({
  newsId: objectId,
  answers: z
    .array(answerSchema)
    .min(1, "No answers submitted")
});

export const submitDailyQuizSchema = z.object({
  quizId: objectId,
  answers: z
    .array(answerSchema)
    .min(1, "No answers submitted")
});
