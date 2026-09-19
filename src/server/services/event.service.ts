import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/lib/api/errors";
import { getEnv } from "@/lib/env";
import type { EventSummary } from "@/types";
import { Role } from "@/generated/prisma/client";

function galleryStatus(gallery: { published: boolean } | null): EventSummary["galleryStatus"] {
  if (!gallery) return "none";
  return gallery.published ? "published" : "draft";
}

async function buildEventSummary(event: {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { photos: number };
  photos: { selected: boolean }[];
  gallery: { published: boolean } | null;
}): Promise<EventSummary> {
  return {
    id: event.id,
    name: event.name,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    photoCount: event._count.photos,
    selectedCount: event.photos.filter((p) => p.selected).length,
    galleryStatus: galleryStatus(event.gallery),
  };
}

export async function listEventsForUser(userId: string, role: Role): Promise<EventSummary[]> {
  if (role === Role.ADMIN) {
    const events = await prisma.event.findMany({
      where: { adminId: userId },
      include: {
        photos: { where: { selected: true }, select: { selected: true } },
        gallery: { select: { published: true } },
        _count: { select: { photos: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(events.map(buildEventSummary));
  }

  const memberships = await prisma.eventMember.findMany({
    where: { userId },
    include: {
      event: {
        include: {
          photos: { where: { selected: true }, select: { selected: true } },
          gallery: { select: { published: true } },
          _count: { select: { photos: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(memberships.map((m) => buildEventSummary(m.event)));
}

export async function createEvent(adminId: string, name: string) {
  return prisma.event.create({
    data: { name, adminId },
  });
}

export async function getEventDetail(eventId: string, userId: string, role: Role) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      admin: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      photos: { select: { id: true, selected: true } },
      gallery: true,
    },
  });

  if (!event) throw Errors.notFound();

  if (role === Role.ADMIN && event.adminId !== userId) {
    throw Errors.forbidden();
  }

  if (role === Role.TEAM_MEMBER) {
    const assigned = event.members.some((m) => m.userId === userId);
    if (!assigned) throw Errors.forbidden();
  }

  return {
    id: event.id,
    name: event.name,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    admin: event.admin,
    members: event.members.map((m) => m.user),
    photoCount: event.photos.length,
    selectedCount: event.photos.filter((p) => p.selected).length,
    galleryStatus: galleryStatus(event.gallery),
    gallery: event.gallery
      ? {
          id: event.gallery.id,
          slug: event.gallery.slug,
          published: event.gallery.published,
          publishedAt: event.gallery.publishedAt?.toISOString() ?? null,
          shareUrl: `${getEnv().NEXT_PUBLIC_APP_URL}/gallery/${event.gallery.slug}`,
        }
      : null,
  };
}

export async function assignTeamMember(
  eventId: string,
  adminId: string,
  email: string,
) {
  await prisma.event.findFirstOrThrow({
    where: { id: eventId, adminId },
  }).catch(() => {
    throw Errors.forbidden();
  });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Errors.notFound("No team member account found with that email.");
  }
  if (user.role !== Role.TEAM_MEMBER) {
    throw Errors.badRequest("Only team member accounts can be assigned to events.");
  }

  const existing = await prisma.eventMember.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
  });
  if (existing) {
    throw Errors.conflict("This team member is already assigned to the event.");
  }

  await prisma.eventMember.create({
    data: { eventId, userId: user.id },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

export async function removeTeamMember(
  eventId: string,
  adminId: string,
  userId: string,
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.adminId !== adminId) throw Errors.forbidden();

  const membership = await prisma.eventMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (!membership) throw Errors.notFound();

  await prisma.eventMember.delete({
    where: { eventId_userId: { eventId, userId } },
  });
}

export async function getAdminDashboardStats(adminId: string) {
  const events = await prisma.event.findMany({
    where: { adminId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      gallery: { select: { published: true } },
      _count: { select: { photos: true } },
    },
  });

  const totalEvents = events.length;
  const totalPhotos = events.reduce((sum, e) => sum + e._count.photos, 0);
  const publishedGalleries = events.filter((e) => e.gallery?.published).length;

  const recentEvents = events
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      name: e.name,
      createdAt: e.createdAt.toISOString(),
      photoCount: e._count.photos,
      galleryStatus: galleryStatus(e.gallery),
    }));

  return { totalEvents, totalPhotos, publishedGalleries, recentEvents };
}
