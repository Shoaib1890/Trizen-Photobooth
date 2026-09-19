"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { apiFetch } from "@/lib/api/client";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/validation/schemas";
import { formatBytes, formatDate } from "@/lib/utils";
import type { PhotoDto } from "@/types";

interface EventDetail {
  id: string;
  name: string;
}

interface UploadParams {
  timestamp: number;
  folder: string;
  allowedFormats: string;
  signature: string;
  apiKey: string;
  cloudName: string;
}

export default function TeamEventPage() {
  const params = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [eventData, photoData] = await Promise.all([
        apiFetch<{ event: EventDetail }>(`/api/events/${params.eventId}`),
        apiFetch<{ photos: PhotoDto[] }>(`/api/events/${params.eventId}/photos`),
      ]);
      setEvent(eventData.event);
      setPhotos(photoData.photos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [params.eventId]);

  async function uploadToCloudinary(file: File, uploadParams: UploadParams) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", uploadParams.apiKey);
    formData.append("timestamp", String(uploadParams.timestamp));
    formData.append("signature", uploadParams.signature);
    formData.append("folder", uploadParams.folder);
    formData.append("allowed_formats", uploadParams.allowedFormats);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/image/upload`,
      { method: "POST", body: formData },
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message ?? "Cloudinary upload failed.");
    }

    return result as {
      public_id: string;
      secure_url: string;
      bytes: number;
      format: string;
    };
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}`);

        if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
          throw new Error(`${file.name} is not a supported image type.`);
        }
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`${file.name} exceeds the 10MB limit.`);
        }

        const { uploadParams } = await apiFetch<{ uploadParams: UploadParams }>(
          `/api/events/${params.eventId}/photos?action=upload-signature`,
        );
        const uploaded = await uploadToCloudinary(file, uploadParams);
        await apiFetch(`/api/events/${params.eventId}/photos`, {
          method: "POST",
          body: JSON.stringify({
            publicId: uploaded.public_id,
            secureUrl: uploaded.secure_url,
            filename: file.name,
            mimeType: file.type,
            fileSize: uploaded.bytes,
          }),
        });
      }

      setSuccess(`${files.length} photo${files.length > 1 ? "s" : ""} uploaded successfully.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      setProgress("");
      e.target.value = "";
    }
  }

  if (loading) return <PageLoader message="Loading event..." />;
  if (error && !event) return <ErrorState message={error} onRetry={loadData} />;
  if (!event) return null;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 px-0">
          <Link href="/team">← Back to events</Link>
        </Button>
        <h1 className="text-3xl font-bold text-slate-900">{event.name}</h1>
        <p className="mt-2 text-slate-600">Upload and manage your event photos.</p>
      </div>

      {success ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Upload photos</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:bg-slate-100">
            <Upload className="h-8 w-8 text-violet-600" />
            <span className="mt-3 font-medium text-slate-900">
              {uploading ? progress || "Uploading..." : "Select multiple images"}
            </span>
            <span className="mt-1 text-sm text-slate-500">
              JPEG, PNG, or WEBP up to 10MB each
            </span>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-xl font-semibold">My uploaded photos</h2>
        {photos.length === 0 ? (
          <EmptyState
            title="No photos uploaded yet"
            description="Your uploads for this event will appear here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {photos.map((photo) => (
              <Card key={photo.id}>
                <CardContent className="p-3">
                  <Image
                    src={photo.thumbnailUrl}
                    alt={photo.filename}
                    width={400}
                    height={400}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  <div className="mt-3 space-y-1">
                    <p className="truncate text-sm font-medium">{photo.filename}</p>
                    <p className="text-xs text-slate-500">
                      {formatBytes(photo.fileSize)} · {formatDate(photo.createdAt)}
                    </p>
                    <Badge variant="muted">Uploaded by you</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
