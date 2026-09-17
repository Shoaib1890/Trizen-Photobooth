"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, PageLoader, Spinner } from "@/components/ui/states";
import { apiFetch } from "@/lib/api/client";
import type { PublicGalleryDto, PublicPhotoDto } from "@/types";

export default function PublicGalleryPage() {
  const params = useParams<{ slug: string }>();
  const [gallery, setGallery] = useState<PublicGalleryDto | null>(null);
  const [photos, setPhotos] = useState<PublicPhotoDto[]>([]);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<PublicPhotoDto | null>(null);

  async function loadGallery() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ gallery: PublicGalleryDto }>(
        `/api/gallery/${params.slug}`,
      );
      setGallery(data.gallery);

      if (data.gallery.verified) {
        const photoData = await apiFetch<{ photos: PublicPhotoDto[] }>(
          `/api/gallery/${params.slug}/photos`,
        );
        setPhotos(photoData.photos);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gallery unavailable.");
      setGallery(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGallery();
  }, [params.slug]);

  async function verifyPin(e: FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      const data = await apiFetch<{ gallery: PublicGalleryDto }>(
        `/api/gallery/${params.slug}/verify`,
        {
          method: "POST",
          body: JSON.stringify({ pin }),
        },
      );
      setGallery(data.gallery);
      const photoData = await apiFetch<{ photos: PublicPhotoDto[] }>(
        `/api/gallery/${params.slug}/photos`,
      );
      setPhotos(photoData.photos);
      setPin("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid PIN.");
      setPhotos([]);
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <PageLoader message="Loading gallery..." />
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <ErrorState title="Gallery unavailable" message={error || "This gallery is not available."} />
      </div>
    );
  }

  if (!gallery.verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-violet-950 px-4 text-white">
        <Card className="w-full max-w-md border-white/10 bg-white text-slate-900">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle>{gallery.title}</CardTitle>
            <p className="text-sm text-slate-500">
              Enter the 6-digit PIN to view this gallery.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={verifyPin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">Gallery PIN</Label>
                <Input
                  id="pin"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  required
                />
              </div>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={verifying || pin.length !== 6}>
                {verifying ? (
                  <>
                    <Spinner />
                    Verifying...
                  </>
                ) : (
                  "View gallery"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold">{gallery.title}</h1>
          <p className="mt-1 text-sm text-white/60">
            {photos.length} photo{photos.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {photos.length === 0 ? (
          <EmptyState
            title="No photos in this gallery"
            description="The admin has not published any photos yet."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className="group overflow-hidden rounded-xl"
                onClick={() => setLightbox(photo)}
              >
                <Image
                  src={photo.thumbnailUrl}
                  alt={photo.filename}
                  width={800}
                  height={800}
                  className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
              </button>
            ))}
          </div>
        )}
      </main>

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <Image
            src={lightbox.storageUrl}
            alt={lightbox.filename}
            width={1600}
            height={1200}
            className="max-h-[90vh] max-w-full object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
