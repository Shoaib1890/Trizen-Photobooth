"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { apiFetch } from "@/lib/api/client";

interface EventDetail {
  id: string;
  name: string;
  photoCount: number;
  selectedCount: number;
  galleryStatus: string;
  members: { id: string; name: string; email: string }[];
  gallery: {
    slug: string;
    published: boolean;
    shareUrl: string;
  } | null;
}

export default function AdminEventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadEvent() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ event: EventDetail }>(
        `/api/events/${params.eventId}`,
      );
      setEvent(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvent();
  }, [params.eventId]);

  async function assignMember(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/api/events/${params.eventId}/members`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setEmail("");
      setSuccess("Team member assigned.");
      await loadEvent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign member.");
    }
  }

  async function removeMember(userId: string) {
    setError("");
    try {
      await apiFetch(`/api/events/${params.eventId}/members/${userId}`, {
        method: "DELETE",
      });
      await loadEvent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  }

  if (loading) return <PageLoader message="Loading event..." />;
  if (error && !event) return <ErrorState message={error} onRetry={loadEvent} />;
  if (!event) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{event.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="muted">{event.photoCount} uploaded</Badge>
            <Badge variant="default">{event.selectedCount} selected</Badge>
            <Badge
              variant={event.galleryStatus === "published" ? "success" : "warning"}
            >
              Gallery: {event.galleryStatus}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/events/${event.id}/photos`}>Review photos</Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/events/${event.id}/gallery`}>Manage gallery</Link>
          </Button>
        </div>
      </div>

      {success ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={assignMember} className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 space-y-2">
                <Label htmlFor="email">Team member email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@example.com"
                  required
                />
              </div>
              <Button type="submit" className="sm:self-end">
                Assign
              </Button>
            </form>

            {event.members.length === 0 ? (
              <EmptyState
                title="No team members assigned"
                description="Add an existing team member by email."
              />
            ) : (
              <ul className="space-y-2">
                {event.members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                  >
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(member.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gallery</CardTitle>
          </CardHeader>
          <CardContent>
            {event.gallery?.published ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-emerald-700">Published</p>
                <p className="break-all text-slate-600">{event.gallery.shareUrl}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Select photos, set a PIN, and publish the gallery when ready.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
