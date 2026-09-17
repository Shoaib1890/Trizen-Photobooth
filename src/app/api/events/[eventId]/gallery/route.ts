import { getSessionFromRequest } from "@/lib/auth/session";
import { requireAuth, requireEventOwner } from "@/lib/authorization";
import {
  createdResponse,
  handleApiError,
  parseJsonBody,
  successResponse,
} from "@/lib/api/response";
import { galleryPinSchema, galleryUpdateSchema } from "@/lib/validation/schemas";
import {
  createOrUpdateGallery,
  getGalleryForAdmin,
} from "@/server/services/gallery.service";
import { Role } from "@/generated/prisma";
import { Errors } from "@/lib/api/errors";
import { ZodError } from "zod";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    if (session.role !== Role.ADMIN) throw Errors.forbidden();

    const { eventId } = await params;
    await requireEventOwner(eventId, session.userId);
    const data = await getGalleryForAdmin(eventId, session.userId);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    if (session.role !== Role.ADMIN) throw Errors.forbidden();

    const { eventId } = await params;
    await requireEventOwner(eventId, session.userId);

    const body = await parseJsonBody(request, galleryPinSchema);
    const gallery = await createOrUpdateGallery(eventId, session.userId, {
      pin: body.pin,
    });
    return createdResponse({ gallery });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleApiError(
        Errors.validation(error.issues[0]?.message ?? "Validation failed."),
      );
    }
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    if (session.role !== Role.ADMIN) throw Errors.forbidden();

    const { eventId } = await params;
    await requireEventOwner(eventId, session.userId);

    const body = await parseJsonBody(request, galleryUpdateSchema);
    const gallery = await createOrUpdateGallery(eventId, session.userId, body);
    return successResponse({ gallery });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleApiError(
        Errors.validation(error.issues[0]?.message ?? "Validation failed."),
      );
    }
    return handleApiError(error);
  }
}
