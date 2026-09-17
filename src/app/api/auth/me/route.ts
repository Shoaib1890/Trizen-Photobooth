import { getSessionFromRequest } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { getCurrentUser } from "@/server/services/auth.service";
import { Errors } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) throw Errors.unauthorized();

    const user = await getCurrentUser(session.userId);
    if (!user) throw Errors.unauthorized();

    return successResponse({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
