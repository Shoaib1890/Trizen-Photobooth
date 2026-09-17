import { getSessionFromRequest } from "@/lib/auth/session";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, successResponse } from "@/lib/api/response";
import { bulkUpdateSelection } from "@/server/services/photo.service";
import { Role } from "@/generated/prisma";
import { Errors } from "@/lib/api/errors";
import { z } from "zod";

const bulkSchema = z.object({
  selected: z.boolean(),
});

type Params = { params: Promise<{ eventId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    if (session.role !== Role.ADMIN) throw Errors.forbidden();

    const { eventId } = await params;
    const body = bulkSchema.parse(await request.json());
    await bulkUpdateSelection(eventId, session.userId, body.selected);
    return successResponse({ updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
