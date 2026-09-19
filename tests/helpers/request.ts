import { createSessionToken, AUTH_COOKIE } from "@/lib/auth/session";
import {
  createGalleryAccessToken,
  GALLERY_COOKIE,
} from "@/lib/gallery/session";
import type { Role } from "@/generated/prisma/client";

export async function authCookie(userId: string, role: Role) {
  const token = await createSessionToken({ userId, role });
  return `${AUTH_COOKIE}=${encodeURIComponent(token)}`;
}

export async function galleryCookie(galleryId: string, slug: string) {
  const token = await createGalleryAccessToken({ galleryId, slug });
  return `${GALLERY_COOKIE}=${encodeURIComponent(token)}`;
}

export function jsonRequest(
  url: string,
  init: RequestInit & { cookie?: string } = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (init.cookie) headers.set("cookie", init.cookie);

  return new Request(url, {
    ...init,
    headers,
  });
}

export async function readJson<T>(response: Response): Promise<{
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}> {
  return response.json();
}
