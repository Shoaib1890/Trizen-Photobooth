import "dotenv/config";
import { beforeEach, vi } from "vitest";

if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = "test-auth-secret-minimum-32-characters-long";
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  process.env.CLOUDINARY_CLOUD_NAME = "demo";
}

if (!process.env.CLOUDINARY_API_KEY) {
  process.env.CLOUDINARY_API_KEY = "demo-key";
}

if (!process.env.CLOUDINARY_API_SECRET) {
  process.env.CLOUDINARY_API_SECRET = "demo-secret";
}

type CookieOptions = {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
  path?: string;
};

const cookieJar = new Map<string, string>();

export function clearTestCookies() {
  cookieJar.clear();
}

export function getTestCookie(name: string) {
  const value = cookieJar.get(name);
  return value ? `${name}=${encodeURIComponent(value)}` : null;
}

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value ? { name, value } : undefined;
    },
    set: (name: string, value: string, options?: CookieOptions) => {
      if (options?.maxAge === 0 || value === "") {
        cookieJar.delete(name);
        return;
      }
      cookieJar.set(name, value);
    },
  }),
}));

beforeEach(() => {
  clearTestCookies();
});
