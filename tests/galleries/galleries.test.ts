import { beforeEach, describe, expect, it } from "vitest";
import { POST as galleryPost } from "@/app/api/events/[eventId]/gallery/route";
import { POST as publishPost } from "@/app/api/events/[eventId]/gallery/publish/route";
import { GET as galleryMetaGet } from "@/app/api/gallery/[slug]/route";
import { POST as verifyPost } from "@/app/api/gallery/[slug]/verify/route";
import { GET as galleryPhotosGet } from "@/app/api/gallery/[slug]/photos/route";
import {
  createAssignedEvent,
  createTestUsers,
  resetDatabase,
} from "../helpers/db";
import { getTestCookie } from "../setup";
import { authCookie, galleryCookie, jsonRequest, readJson } from "../helpers/request";
import { prisma } from "@/lib/db/prisma";
import { createGallerySlug } from "@/lib/gallery/slug";
import { hashPin } from "@/lib/auth/password";
import { clearAllPinRateLimits } from "@/lib/gallery/rate-limit";
import { GALLERY_COOKIE } from "@/lib/gallery/session";

describe("Gallery publishing and PIN access", () => {
  beforeEach(async () => {
    clearAllPinRateLimits();
    await resetDatabase();
  });

  async function seedPublishableEvent() {
    const { admin, member } = await createTestUsers();
    const event = await createAssignedEvent(admin.id, member.id);

    const selected = await prisma.photo.create({
      data: {
        eventId: event.id,
        uploadedById: member.id,
        filename: "selected.jpg",
        storageUrl: "https://res.cloudinary.com/demo/image/upload/selected.jpg",
        storagePublicId: "selected",
        mimeType: "image/jpeg",
        fileSize: 1000,
        selected: true,
      },
    });

    await prisma.photo.create({
      data: {
        eventId: event.id,
        uploadedById: member.id,
        filename: "hidden.jpg",
        storageUrl: "https://res.cloudinary.com/demo/image/upload/hidden.jpg",
        storagePublicId: "hidden",
        mimeType: "image/jpeg",
        fileSize: 1000,
        selected: false,
      },
    });

    return { admin, member, event, selected };
  }

  it("admin cannot publish without selected photos", async () => {
    const { admin, member } = await createTestUsers();
    const event = await createAssignedEvent(admin.id, member.id);
    const cookie = await authCookie(admin.id, "ADMIN");

    await galleryPost(
      jsonRequest(`http://localhost/api/events/${event.id}/gallery`, {
        method: "POST",
        cookie,
        body: JSON.stringify({ pin: "123456" }),
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    const response = await publishPost(
      jsonRequest(`http://localhost/api/events/${event.id}/gallery/publish`, {
        method: "POST",
        cookie,
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    expect(response.status).toBe(400);
  });

  it("admin can publish with valid PIN and selected photos", async () => {
    const { admin, event } = await seedPublishableEvent();
    const cookie = await authCookie(admin.id, "ADMIN");

    await galleryPost(
      jsonRequest(`http://localhost/api/events/${event.id}/gallery`, {
        method: "POST",
        cookie,
        body: JSON.stringify({ pin: "654321" }),
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    const response = await publishPost(
      jsonRequest(`http://localhost/api/events/${event.id}/gallery/publish`, {
        method: "POST",
        cookie,
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    const body = await readJson<{ gallery: { published: boolean; slug: string } }>(
      response,
    );
    expect(response.status).toBe(200);
    expect(body.data?.gallery.published).toBe(true);
  });

  it("unpublished gallery returns not found publicly", async () => {
    const { admin, event } = await seedPublishableEvent();
    const slug = createGallerySlug();

    await prisma.gallery.create({
      data: {
        eventId: event.id,
        slug,
        pinHash: await hashPin("111111"),
        published: false,
      },
    });

    const response = await galleryMetaGet(
      jsonRequest(`http://localhost/api/gallery/${slug}`, { method: "GET" }),
      { params: Promise.resolve({ slug }) },
    );

    expect(response.status).toBe(404);
  });

  it("wrong PIN returns 401 without photos", async () => {
    const { event } = await seedPublishableEvent();
    const slug = createGallerySlug();

    const gallery = await prisma.gallery.create({
      data: {
        eventId: event.id,
        slug,
        pinHash: await hashPin("222222"),
        published: true,
        publishedAt: new Date(),
      },
    });

    const verifyResponse = await verifyPost(
      jsonRequest(`http://localhost/api/gallery/${slug}/verify`, {
        method: "POST",
        body: JSON.stringify({ pin: "000000" }),
      }),
      { params: Promise.resolve({ slug }) },
    );
    expect(verifyResponse.status).toBe(401);

    const photosResponse = await galleryPhotosGet(
      jsonRequest(`http://localhost/api/gallery/${slug}/photos`, {
        method: "GET",
      }),
      { params: Promise.resolve({ slug }) },
    );
    expect(photosResponse.status).toBe(401);

    expect(gallery.id).toBeTruthy();
  });

  it("correct PIN exposes only published gallery photos", async () => {
    const { admin, event, selected } = await seedPublishableEvent();
    const cookie = await authCookie(admin.id, "ADMIN");
    const slug = createGallerySlug();

    await galleryPost(
      jsonRequest(`http://localhost/api/events/${event.id}/gallery`, {
        method: "POST",
        cookie,
        body: JSON.stringify({ pin: "333333" }),
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    await publishPost(
      jsonRequest(`http://localhost/api/events/${event.id}/gallery/publish`, {
        method: "POST",
        cookie,
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    const gallery = await prisma.gallery.findUnique({ where: { eventId: event.id } });
    expect(gallery?.slug).toBeTruthy();

    const verifyResponse = await verifyPost(
      jsonRequest(`http://localhost/api/gallery/${gallery!.slug}/verify`, {
        method: "POST",
        body: JSON.stringify({ pin: "333333" }),
      }),
      { params: Promise.resolve({ slug: gallery!.slug }) },
    );
    expect(verifyResponse.status).toBe(200);

    const galleryAccessCookie = getTestCookie(GALLERY_COOKIE);
    const photosResponse = await galleryPhotosGet(
      jsonRequest(`http://localhost/api/gallery/${gallery!.slug}/photos`, {
        method: "GET",
        cookie: galleryAccessCookie ?? undefined,
      }),
      { params: Promise.resolve({ slug: gallery!.slug }) },
    );

    const body = await readJson<{ photos: { id: string }[] }>(photosResponse);
    expect(photosResponse.status).toBe(200);
    expect(body.data?.photos).toHaveLength(1);
    expect(body.data?.photos[0].id).toBe(selected.id);
  });

  it("gallery token for gallery A cannot access gallery B", async () => {
    const { admin, member } = await createTestUsers();
    const eventA = await createAssignedEvent(admin.id, member.id);
    const eventB = await createAssignedEvent(admin.id, member.id);

    const slugA = createGallerySlug();
    const slugB = createGallerySlug();

    const galleryA = await prisma.gallery.create({
      data: {
        eventId: eventA.id,
        slug: slugA,
        pinHash: await hashPin("444444"),
        published: true,
        publishedAt: new Date(),
      },
    });

    await prisma.gallery.create({
      data: {
        eventId: eventB.id,
        slug: slugB,
        pinHash: await hashPin("555555"),
        published: true,
        publishedAt: new Date(),
      },
    });

    const cookie = await galleryCookie(galleryA.id, slugA);
    const response = await galleryPhotosGet(
      jsonRequest(`http://localhost/api/gallery/${slugB}/photos`, {
        method: "GET",
        cookie,
      }),
      { params: Promise.resolve({ slug: slugB }) },
    );

    expect(response.status).toBe(401);
  });
});
