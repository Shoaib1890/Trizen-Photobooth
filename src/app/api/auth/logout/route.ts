import { handleApiError, successResponse } from "@/lib/api/response";
import { logoutUser } from "@/server/services/auth.service";

export async function POST(_request?: Request) {
  try {
    await logoutUser();
    return successResponse({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
