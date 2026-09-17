import { getSessionFromRequest } from "@/lib/auth/session";
import { requireAuth } from "@/lib/authorization";
import {
  handleApiError,
  parseJsonBody,
  successResponse,
} from "@/lib/api/response";
import { photoSelectionSchema } from "@/lib/validation/schemas";
import { updatePhotoSelection } from "@/server/services/photo.service";
import { Role } from "@/generated/prisma";
import { Errors } from "@/lib/api/errors";
import { ZodError } from "zod";

type Params = { params: Promise<{ photoId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    if (session.role !== Role.ADMIN) throw Errors.forbidden();

    const { photoId } = await params;
    const body = await parseJsonBody(request, photoSelectionSchema);
    const photo = await updatePhotoSelection(
      photoId,
      session.userId,
      body.selected,
    );
    return successResponse({ photo });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleApiError(
        Errors.validation(error.issues[0]?.message ?? "Validation failed."),
      );
    }
    return handleApiError(error);
  }
}
