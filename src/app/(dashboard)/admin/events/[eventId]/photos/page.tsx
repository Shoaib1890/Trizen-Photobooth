"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { apiFetch } from "@/lib/api/client";
import { formatBytes, formatDate } from "@/lib/utils";
import type { PhotoDto } from "@/types";

export default function AdminPhotoReviewPage() {
  const params = useParams<{ eventId: string }>();
  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadPhotos() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ photos: PhotoDto[] }>(
        `/api/events/${params.eventId}/photos`,
      );
      setPhotos(data.photos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPhotos();
  }, [params.eventId]);

  async function toggleSelection(photo: PhotoDto) {
    setBusy(true);
    try {
      await apiFetch(`/api/photos/${photo.id}/selection`, {
        method: "PATCH",
        body: JSON.stringify({ selected: !photo.selected }),
      });
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id ? { ...p, selected: !p.selected } : p,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update selection.");
    } finally {
      setBusy(false);
    }
  }

  async function bulkSelect(selected: boolean) {
    setBusy(true);
    try {
      await apiFetch(`/api/events/${params.eventId}/photos/selection`, {
        method: "PATCH",
        body: JSON.stringify({ selected }),
      });
      setPhotos((prev) => prev.map((p) => ({ ...p, selected })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update selection.");
    } finally {
      setBusy(false);
    }
  }

  const selectedCount = photos.filter((p) => p.selected).length;

  if (loading) return <PageLoader message="Loading photos..." />;
  if (error && photos.length === 0) {
    return <ErrorState message={error} onRetry={loadPhotos} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0">
            <Link href={`/admin/events/${params.eventId}`}>← Back to event</Link>
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Photo review</h1>
          <p className="mt-2 text-slate-600">
            {selectedCount} of {photos.length} selected for publishing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => bulkSelect(true)}>
            Select all
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => bulkSelect(false)}>
            Clear selection
          </Button>
        </div>
      </div>

      {photos.length === 0 ? (
        <EmptyState
          title="No photos uploaded yet"
          description="Team members can upload photos once assigned to this event."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => (
            <Card
              key={photo.id}
              className={photo.selected ? "ring-2 ring-violet-500" : ""}
            >
              <CardContent className="p-3">
                <button
                  type="button"
                  className="group relative block w-full overflow-hidden rounded-lg"
                  onClick={() => toggleSelection(photo)}
                  disabled={busy}
                >
                  <Image
                    src={photo.thumbnailUrl}
                    alt={photo.filename}
                    width={400}
                    height={400}
                    className="aspect-square w-full object-cover"
                  />
                  <div
                    className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border ${
                      photo.selected
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-white/80 bg-black/30 text-white"
                    }`}
                  >
                    {photo.selected ? <Check className="h-4 w-4" /> : null}
                  </div>
                </button>
                <div className="mt-3 space-y-1">
                  <p className="truncate text-sm font-medium">{photo.filename}</p>
                  <p className="text-xs text-slate-500">
                    {photo.uploadedBy.name} · {formatBytes(photo.fileSize)}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(photo.createdAt)}</p>
                  <Badge variant={photo.selected ? "success" : "muted"}>
                    {photo.selected ? "Selected" : "Unselected"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
