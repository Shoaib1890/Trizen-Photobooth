import { getSessionFromRequest } from "@/lib/auth/session";
import { requireAuth, requireEventOwner } from "@/lib/authorization";
import {
  createdResponse,
  handleApiError,
  parseJsonBody,
  successResponse,
} from "@/lib/api/response";
import { assignMemberSchema } from "@/lib/validation/schemas";
import { assignTeamMember } from "@/server/services/event.service";
import { Role } from "@/generated/prisma/client";
import { Errors } from "@/lib/api/errors";
import { ZodError } from "zod";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    if (session.role !== Role.ADMIN) throw Errors.forbidden();

    const { eventId } = await params;
    await requireEventOwner(eventId, session.userId);

    const body = await parseJsonBody(request, assignMemberSchema);
    const member = await assignTeamMember(eventId, session.userId, body.email);
    return createdResponse({ member });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleApiError(
        Errors.validation(error.issues[0]?.message ?? "Validation failed."),
      );
    }
    return handleApiError(error);
  }
}
