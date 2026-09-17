import { beforeEach, describe, expect, it } from "vitest";
import { GET as photosGet, POST as photosPost } from "@/app/api/events/[eventId]/photos/route";
import { PATCH as selectionPatch } from "@/app/api/photos/[photoId]/selection/route";
import {
  createAssignedEvent,
  createTestUsers,
  resetDatabase,
} from "../helpers/db";
import { authCookie, jsonRequest, readJson } from "../helpers/request";
import { prisma } from "@/lib/db/prisma";

describe("Photo access control", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  async function seedPhotos(eventId: string, memberId: string, otherMemberId: string) {
    const memberPhoto = await prisma.photo.create({
      data: {
        eventId,
        uploadedById: memberId,
        filename: "member.jpg",
        storageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        storagePublicId: "member-photo",
        mimeType: "image/jpeg",
        fileSize: 1000,
      },
    });

    await prisma.photo.create({
      data: {
        eventId,
        uploadedById: otherMemberId,
        filename: "other.jpg",
        storageUrl: "https://res.cloudinary.com/demo/image/upload/other.jpg",
        storagePublicId: "other-photo",
        mimeType: "image/jpeg",
        fileSize: 1000,
      },
    });

    return memberPhoto;
  }

  it("allows assigned team member to save upload metadata", async () => {
    const { admin, member } = await createTestUsers();
    const event = await createAssignedEvent(admin.id, member.id);
    const cookie = await authCookie(member.id, "TEAM_MEMBER");

    const response = await photosPost(
      jsonRequest(`http://localhost/api/events/${event.id}/photos`, {
        method: "POST",
        cookie,
        body: JSON.stringify({
          publicId: `trizen/events/${event.id}/photo-1`,
          secureUrl: "https://res.cloudinary.com/demo/image/upload/photo-1.jpg",
          filename: "photo-1.jpg",
          mimeType: "image/jpeg",
          fileSize: 5000,
        }),
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    expect(response.status).toBe(201);
  });

  it("team member sees only own uploads", async () => {
    const { admin, member, otherMember } = await createTestUsers();
    const event = await createAssignedEvent(admin.id, member.id);
    await prisma.eventMember.create({
      data: { eventId: event.id, userId: otherMember.id },
    });
    await seedPhotos(event.id, member.id, otherMember.id);

    const cookie = await authCookie(member.id, "TEAM_MEMBER");
    const response = await photosGet(
      jsonRequest(`http://localhost/api/events/${event.id}/photos`, {
        method: "GET",
        cookie,
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    const body = await readJson<{ photos: { filename: string }[] }>(response);
    expect(response.status).toBe(200);
    expect(body.data?.photos).toHaveLength(1);
    expect(body.data?.photos[0].filename).toBe("member.jpg");
  });

  it("admin sees all event photos", async () => {
    const { admin, member, otherMember } = await createTestUsers();
    const event = await createAssignedEvent(admin.id, member.id);
    await prisma.eventMember.create({
      data: { eventId: event.id, userId: otherMember.id },
    });
    await seedPhotos(event.id, member.id, otherMember.id);

    const cookie = await authCookie(admin.id, "ADMIN");
    const response = await photosGet(
      jsonRequest(`http://localhost/api/events/${event.id}/photos`, {
        method: "GET",
        cookie,
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    const body = await readJson<{ photos: unknown[] }>(response);
    expect(response.status).toBe(200);
    expect(body.data?.photos).toHaveLength(2);
  });

  it("public user cannot access event photo listing", async () => {
    const { admin, member } = await createTestUsers();
    const event = await createAssignedEvent(admin.id, member.id);
    await seedPhotos(event.id, member.id, member.id);

    const response = await photosGet(
      jsonRequest(`http://localhost/api/events/${event.id}/photos`, {
        method: "GET",
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    expect(response.status).toBe(401);
  });

  it("admin can update photo selection", async () => {
    const { admin, member } = await createTestUsers();
    const event = await createAssignedEvent(admin.id, member.id);
    const photo = await seedPhotos(event.id, member.id, member.id);
    const cookie = await authCookie(admin.id, "ADMIN");

    const response = await selectionPatch(
      jsonRequest(`http://localhost/api/photos/${photo.id}/selection`, {
        method: "PATCH",
        cookie,
        body: JSON.stringify({ selected: true }),
      }),
      { params: Promise.resolve({ photoId: photo.id }) },
    );

    expect(response.status).toBe(200);
    const updated = await prisma.photo.findUnique({ where: { id: photo.id } });
    expect(updated?.selected).toBe(true);
  });
});
