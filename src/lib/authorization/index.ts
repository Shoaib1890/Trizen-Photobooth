import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/lib/api/errors";
import type { SessionPayload } from "@/lib/auth/session";
import type { Role } from "@/generated/prisma";

export async function requireAuth(
  session: SessionPayload | null,
): Promise<SessionPayload> {
  if (!session) throw Errors.unauthorized();
  return session;
}

export function requireRole(session: SessionPayload, roles: Role[]) {
  if (!roles.includes(session.role)) {
    throw Errors.forbidden();
  }
}

export async function requireEventOwner(eventId: string, adminId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw Errors.notFound();
  if (event.adminId !== adminId) throw Errors.forbidden();
  return event;
}

export async function requireEventAccess(eventId: string, session: SessionPayload) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      members: {
        where: { userId: session.userId },
        take: 1,
      },
    },
  });

  if (!event) throw Errors.notFound();

  if (session.role === "ADMIN") {
    if (event.adminId !== session.userId) throw Errors.forbidden();
    return event;
  }

  if (session.role === "TEAM_MEMBER") {
    if (event.members.length === 0) throw Errors.forbidden();
    return event;
  }

  throw Errors.forbidden();
}

export async function requireTeamMemberAssignment(
  eventId: string,
  userId: string,
) {
  const membership = await prisma.eventMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (!membership) throw Errors.forbidden();
}
