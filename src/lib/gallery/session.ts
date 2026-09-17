import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv, isProduction } from "@/lib/env";

const GALLERY_COOKIE = "trizen_gallery_access";
const GALLERY_SESSION_MAX_AGE = 60 * 60 * 2; // 2 hours

export interface GallerySessionPayload {
  galleryId: string;
  slug: string;
}

function getSecretKey() {
  return new TextEncoder().encode(getEnv().AUTH_SECRET);
}

export async function createGalleryAccessToken(
  payload: GallerySessionPayload,
): Promise<string> {
  return new SignJWT({ galleryId: payload.galleryId, slug: payload.slug })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GALLERY_SESSION_MAX_AGE}s`)
    .sign(getSecretKey());
}

export async function verifyGalleryAccessToken(
  token: string,
): Promise<GallerySessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.galleryId !== "string" || typeof payload.slug !== "string") {
      return null;
    }
    return { galleryId: payload.galleryId, slug: payload.slug };
  } catch {
    return null;
  }
}

export async function setGalleryAccessCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(GALLERY_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: GALLERY_SESSION_MAX_AGE,
  });
}

export async function getGallerySessionFromCookies(): Promise<GallerySessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(GALLERY_COOKIE)?.value;
  if (!token) return null;
  return verifyGalleryAccessToken(token);
}

export async function getGallerySessionFromRequest(
  request: Request,
): Promise<GallerySessionPayload | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GALLERY_COOKIE}=`));

  if (!match) return null;
  const token = match.slice(GALLERY_COOKIE.length + 1);
  return verifyGalleryAccessToken(decodeURIComponent(token));
}

export { GALLERY_COOKIE, GALLERY_SESSION_MAX_AGE };
