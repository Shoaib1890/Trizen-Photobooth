import { getSessionFromRequest } from "@/lib/auth/session";
import {
  requireAuth,
  requireEventAccess,
  requireTeamMemberAssignment,
} from "@/lib/authorization";
import {
  createdResponse,
  handleApiError,
  parseJsonBody,
  successResponse,
} from "@/lib/api/response";
import { photoMetadataSchema } from "@/lib/validation/schemas";
import {
  listEventPhotos,
  savePhotoMetadata,
  cleanupFailedUpload,
} from "@/server/services/photo.service";
import { createSignedUploadParams } from "@/lib/cloudinary";
import { Role } from "@/generated/prisma";
import { Errors } from "@/lib/api/errors";
import { ZodError } from "zod";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    const { eventId } = await params;
    await requireEventAccess(eventId, session);

    const url = new URL(request.url);
    if (url.searchParams.get("action") === "upload-signature") {
      if (session.role !== Role.TEAM_MEMBER) throw Errors.forbidden();
      await requireTeamMemberAssignment(eventId, session.userId);
      const uploadParams = createSignedUploadParams(eventId);
      return successResponse({ uploadParams });
    }

    const photos = await listEventPhotos(eventId, session.userId, session.role);
    return successResponse({ photos });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    if (session.role !== Role.TEAM_MEMBER) throw Errors.forbidden();

    const { eventId } = await params;
    await requireTeamMemberAssignment(eventId, session.userId);

    const body = await parseJsonBody(request, photoMetadataSchema);

    if (!body.publicId.includes(`trizen/events/${eventId}`)) {
      throw Errors.badRequest("Invalid upload for this event.");
    }

    try {
      const photo = await savePhotoMetadata({
        eventId,
        userId: session.userId,
        filename: body.filename,
        secureUrl: body.secureUrl,
        publicId: body.publicId,
        mimeType: body.mimeType,
        fileSize: body.fileSize,
      });
      return createdResponse({ photo });
    } catch (error) {
      await cleanupFailedUpload(body.publicId);
      throw error;
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return handleApiError(
        Errors.validation(error.issues[0]?.message ?? "Validation failed."),
      );
    }
    return handleApiError(error);
  }
}
