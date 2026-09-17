import {
  handleApiError,
  parseJsonBody,
  successResponse,
} from "@/lib/api/response";
import { verifyPinSchema } from "@/lib/validation/schemas";
import { verifyGalleryPin } from "@/server/services/gallery.service";
import { Errors } from "@/lib/api/errors";
import { ZodError } from "zod";

type Params = { params: Promise<{ slug: string }> };

function getClientKey(request: Request, slug: string) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${ip}:${slug}`;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const body = await parseJsonBody(request, verifyPinSchema);
    const gallery = await verifyGalleryPin(
      slug,
      body.pin,
      getClientKey(request, slug),
    );
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
