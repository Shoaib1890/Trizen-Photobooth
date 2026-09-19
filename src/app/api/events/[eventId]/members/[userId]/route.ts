import { getSessionFromRequest } from "@/lib/auth/session";
import {
  requireAuth,
  requireEventAccess,
  requireEventOwner,
  requireTeamMemberAssignment,
} from "@/lib/authorization";
import { handleApiError, successResponse } from "@/lib/api/response";
import { removeTeamMember } from "@/server/services/event.service";
import { Role } from "@/generated/prisma/client";
import { Errors } from "@/lib/api/errors";

type Params = { params: Promise<{ eventId: string; userId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireAuth(await getSessionFromRequest(_request));
    if (session.role !== Role.ADMIN) throw Errors.forbidden();

    const { eventId, userId } = await params;
    await removeTeamMember(eventId, session.userId, userId);
    return successResponse({ removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
