import { getSessionFromRequest } from "@/lib/auth/session";
import { requireAuth, requireEventAccess } from "@/lib/authorization";
import { handleApiError, successResponse } from "@/lib/api/response";
import { getEventDetail } from "@/server/services/event.service";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    const { eventId } = await params;
    await requireEventAccess(eventId, session);
    const event = await getEventDetail(eventId, session.userId, session.role);
    return successResponse({ event });
  } catch (error) {
    return handleApiError(error);
  }
}
