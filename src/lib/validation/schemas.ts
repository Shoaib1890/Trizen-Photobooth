import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required."),
    email: z.string().trim().email("Enter a valid email.").transform((v) => v.toLowerCase()),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Password is required."),
});

export const createEventSchema = z.object({
  name: z.string().trim().min(1, "Event name is required."),
});

export const assignMemberSchema = z.object({
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
});

export const photoSelectionSchema = z.object({
  selected: z.boolean(),
});

export const galleryPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits."),
});

export const galleryUpdateSchema = z.object({
  pin: z
    .string()
    .regex(/^\d{6}$/, "PIN must be exactly 6 digits.")
    .optional(),
  photoIds: z.array(z.string().uuid()).optional(),
});

export const photoMetadataSchema = z.object({
  publicId: z.string().min(1),
  secureUrl: z.string().url(),
  filename: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
});

export const verifyPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits."),
});

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
