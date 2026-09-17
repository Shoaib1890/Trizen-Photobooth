import { registerSchema } from "@/lib/validation/schemas";
import {
  createdResponse,
  handleApiError,
  parseJsonBody,
} from "@/lib/api/response";
import { registerAdmin } from "@/server/services/auth.service";
import { ZodError } from "zod";
import { Errors } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, registerSchema);
    const user = await registerAdmin({
      name: body.name,
      email: body.email,
      password: body.password,
    });
    return createdResponse({ user });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleApiError(
        Errors.validation(error.issues[0]?.message ?? "Validation failed."),
      );
    }
    return handleApiError(error);
  }
}
