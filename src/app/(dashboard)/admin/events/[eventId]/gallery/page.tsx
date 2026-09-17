"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { apiFetch } from "@/lib/api/client";
import type { GalleryDto } from "@/types";

export default function AdminGalleryPage() {
  const params = useParams<{ eventId: string }>();
  const [gallery, setGallery] = useState<GalleryDto | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadGallery() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ gallery: GalleryDto | null }>(
        `/api/events/${params.eventId}/gallery`,
      );
      setGallery(data.gallery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gallery.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGallery();
  }, [params.eventId]);

  async function saveGallery(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiFetch<{ gallery: GalleryDto }>(
        `/api/events/${params.eventId}/gallery`,
        {
          method: gallery ? "PATCH" : "POST",
          body: JSON.stringify({ pin }),
        },
      );
      setGallery(data.gallery);
      setPin("");
      setSuccess("Gallery PIN saved. Selected photos synced.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save gallery.");
    } finally {
      setBusy(false);
    }
  }

  async function publishGallery() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiFetch<{ gallery: GalleryDto }>(
        `/api/events/${params.eventId}/gallery/publish`,
        { method: "POST" },
      );
      setGallery(data.gallery);
      setSuccess("Gallery published successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish gallery.");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!gallery?.shareUrl) return;
    await navigator.clipboard.writeText(gallery.shareUrl);
    setSuccess("Gallery URL copied to clipboard.");
  }

  if (loading) return <PageLoader message="Loading gallery..." />;
  if (error && !gallery) return <ErrorState message={error} onRetry={loadGallery} />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 px-0">
          <Link href={`/admin/events/${params.eventId}`}>← Back to event</Link>
        </Button>
        <h1 className="text-3xl font-bold text-slate-900">Gallery management</h1>
        <p className="mt-2 text-slate-600">
          Set a 6-digit PIN and publish selected photos for your client.
        </p>
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
          <CardTitle>PIN setup</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveGallery} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">6-digit gallery PIN</Label>
              <Input
                id="pin"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="482917"
                required
              />
            </div>
            <Button type="submit" disabled={busy || pin.length !== 6}>
              {gallery ? "Update gallery" : "Create gallery"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {gallery ? (
        <Card>
          <CardHeader>
            <CardTitle>Publish gallery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="muted">{gallery.selectedPhotoCount} photos</Badge>
              <Badge variant={gallery.published ? "success" : "warning"}>
                {gallery.published ? "Published" : "Draft"}
              </Badge>
            </div>

            {gallery.published ? (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">Shareable URL</p>
                <p className="break-all text-sm text-slate-600">{gallery.shareUrl}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={copyUrl}>
                    <Copy className="h-4 w-4" />
                    Copy URL
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={gallery.shareUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open gallery
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={publishGallery} disabled={busy}>
                Publish gallery
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
