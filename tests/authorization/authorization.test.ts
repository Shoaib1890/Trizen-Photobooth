import { beforeEach, describe, expect, it } from "vitest";
import { POST as createEventPost } from "@/app/api/events/route";
import { GET as eventGet } from "@/app/api/events/[eventId]/route";
import { POST as publishPost } from "@/app/api/events/[eventId]/gallery/publish/route";
import { GET as eventsGet } from "@/app/api/events/route";
import {
  createAssignedEvent,
  createTestUsers,
  resetDatabase,
} from "../helpers/db";
import { authCookie, jsonRequest, readJson } from "../helpers/request";
import { prisma } from "@/lib/db/prisma";
import { hashPin } from "@/lib/auth/password";
import { createGallerySlug } from "@/lib/gallery/slug";

describe("Authorization", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("prevents team member from creating events", async () => {
    const { member } = await createTestUsers();
    const cookie = await authCookie(member.id, "TEAM_MEMBER");

    const response = await createEventPost(
      jsonRequest("http://localhost/api/events", {
        method: "POST",
        cookie,
        body: JSON.stringify({ name: "Blocked Event" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("prevents team member from publishing gallery", async () => {
    const { admin, member } = await createTestUsers();
    const event = await createAssignedEvent(admin.id, member.id);
    const adminCookie = await authCookie(admin.id, "ADMIN");
    const memberCookie = await authCookie(member.id, "TEAM_MEMBER");

    await prisma.gallery.create({
      data: {
        eventId: event.id,
        slug: createGallerySlug(),
        pinHash: await hashPin("123456"),
        published: false,
      },
    });

    const response = await publishPost(
      jsonRequest(`http://localhost/api/events/${event.id}/gallery/publish`, {
        method: "POST",
        cookie: memberCookie,
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    expect(response.status).toBe(403);

    const adminResponse = await publishPost(
      jsonRequest(`http://localhost/api/events/${event.id}/gallery/publish`, {
        method: "POST",
        cookie: adminCookie,
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    expect(adminResponse.status).toBeGreaterThanOrEqual(400);
  });

  it("prevents team member from accessing unassigned event", async () => {
    const { admin, member, otherMember } = await createTestUsers();
    const event = await createAssignedEvent(admin.id, member.id);
    const otherCookie = await authCookie(otherMember.id, "TEAM_MEMBER");

    const response = await eventGet(
      jsonRequest(`http://localhost/api/events/${event.id}`, {
        method: "GET",
        cookie: otherCookie,
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    expect(response.status).toBe(403);
  });

  it("prevents admin from managing another admin event", async () => {
    const { admin, otherAdmin } = await createTestUsers();
    const event = await prisma.event.create({
      data: { name: "Owned Event", adminId: admin.id },
    });
    const cookie = await authCookie(otherAdmin.id, "ADMIN");

    const response = await eventGet(
      jsonRequest(`http://localhost/api/events/${event.id}`, {
        method: "GET",
        cookie,
      }),
      { params: Promise.resolve({ eventId: event.id }) },
    );

    expect(response.status).toBe(403);
  });

  it("blocks unauthenticated protected APIs", async () => {
    const response = await eventsGet(
      jsonRequest("http://localhost/api/events", { method: "GET" }),
    );
    expect(response.status).toBe(401);
  });
});
