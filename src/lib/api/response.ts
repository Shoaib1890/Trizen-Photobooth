import { NextResponse } from "next/server";
import { AppError } from "@/lib/api/errors";
import { isProduction } from "@/lib/env";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function createdResponse<T>(data: T) {
  return successResponse(data, 201);
}

export function errorResponse(error: AppError) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    },
    { status: error.status },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error);
  }

  if (isProduction()) {
    console.error(error);
    return errorResponse(
      new AppError("INTERNAL_ERROR", "An unexpected error occurred.", 500),
    );
  }

  console.error(error);
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  return errorResponse(new AppError("INTERNAL_ERROR", message, 500));
}

export async function parseJsonBody<T>(
  request: Request,
  schema: { parse: (data: unknown) => T },
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Invalid JSON body.", 400);
  }
  return schema.parse(body);
}
