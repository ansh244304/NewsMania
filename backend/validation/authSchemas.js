import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address");

const password = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(72, "Password must be at most 72 characters");

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be at most 60 characters"),
  email,
  password
});

export const verifyEmailSchema = z.object({
  email,
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6}$/, "Code must be 6 characters")
});

export const resendVerificationSchema = z.object({
  email
});

export const googleLoginSchema = z.object({
  credential: z.string().trim().min(1, "Google credential is required")
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required")
});

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(1, "Refresh token is required")
});

export const logoutSchema = z.object({
  refreshToken: z.string().trim().min(1).optional()
});

export const forgotPasswordSchema = z.object({
  email
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required"),
  newPassword: password
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: password
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current one"
  });
