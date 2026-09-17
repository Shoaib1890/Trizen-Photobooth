import { loginSchema } from "@/lib/validation/schemas";
import {
  handleApiError,
  parseJsonBody,
  successResponse,
} from "@/lib/api/response";
import { loginUser } from "@/server/services/auth.service";
import { ZodError } from "zod";
import { Errors } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, loginSchema);
    const user = await loginUser(body);
    return successResponse({ user });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleApiError(
        Errors.validation(error.issues[0]?.message ?? "Validation failed."),
      );
    }
    return handleApiError(error);
  }
}
