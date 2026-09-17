import { getSessionFromRequest } from "@/lib/auth/session";
import { requireAuth, requireEventOwner } from "@/lib/authorization";
import { handleApiError, successResponse } from "@/lib/api/response";
import { publishGallery } from "@/server/services/gallery.service";
import { Role } from "@/generated/prisma";
import { Errors } from "@/lib/api/errors";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    if (session.role !== Role.ADMIN) throw Errors.forbidden();

    const { eventId } = await params;
    await requireEventOwner(eventId, session.userId);
    const gallery = await publishGallery(eventId, session.userId);
    return successResponse({ gallery });
  } catch (error) {
    return handleApiError(error);
  }
}
