"use client";

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });

  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }

  return payload.data as T;
}

export async function apiUpload<T>(
  url: string,
  formData: FormData,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? "Upload failed.");
  }

  return payload.data as T;
}
