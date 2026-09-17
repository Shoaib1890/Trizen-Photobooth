import { customAlphabet } from "nanoid";

const generateSlug = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  12,
);

export function createGallerySlug(): string {
  return generateSlug();
}
