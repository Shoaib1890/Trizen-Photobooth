import { handleApiError, successResponse } from "@/lib/api/response";
import { getPublicGalleryPhotos } from "@/server/services/gallery.service";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const photos = await getPublicGalleryPhotos(slug, request);
    return successResponse({ photos });
  } catch (error) {
    return handleApiError(error);
  }
}
