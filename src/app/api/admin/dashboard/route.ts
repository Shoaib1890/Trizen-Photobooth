import { getSessionFromRequest } from "@/lib/auth/session";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, successResponse } from "@/lib/api/response";
import { getAdminDashboardStats } from "@/server/services/event.service";
import { Role } from "@/generated/prisma";
import { Errors } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const session = await requireAuth(await getSessionFromRequest(request));
    if (session.role !== Role.ADMIN) throw Errors.forbidden();

    const stats = await getAdminDashboardStats(session.userId);
    return successResponse({ stats });
  } catch (error) {
    return handleApiError(error);
  }
}
