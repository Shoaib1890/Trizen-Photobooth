import { getSessionFromRequest } from "@/lib/auth/session";
import { requireAuth } from "@/lib/authorization";
import {
  createdResponse,
  handleApiError,
  parseJsonBody,
  successResponse,
} from "@/lib/api/response";
import { createEventSchema } from "@/lib/validation/schemas";
import {
  createEvent,
  listEventsForUser,
} from "@/server/services/event.service";
import { ZodError } from "zod";
import { Errors } from "@/lib/api/errors";
import { Role } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    const events = await listEventsForUser(session.userId, session.role);
    return successResponse({ events });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    if (session.role !== Role.ADMIN) throw Errors.forbidden();

    const body = await parseJsonBody(request, createEventSchema);
    const event = await createEvent(session.userId, body.name);
    return createdResponse({
      event: {
        id: event.id,
        name: event.name,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleApiError(
        Errors.validation(error.issues[0]?.message ?? "Validation failed."),
      );
    }
    return handleApiError(error);
  }
}
