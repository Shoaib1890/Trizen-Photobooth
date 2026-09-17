import { handleApiError, successResponse } from "@/lib/api/response";
import { getPublicGalleryMetaFromRequest } from "@/server/services/gallery.service";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const gallery = await getPublicGalleryMetaFromRequest(slug, request);
    return successResponse({ gallery });
  } catch (error) {
    return handleApiError(error);
  }
}
