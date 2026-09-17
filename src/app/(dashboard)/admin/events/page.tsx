import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listEventsForUser } from "@/server/services/event.service";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma";

export default async function AdminEventsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== Role.ADMIN) redirect("/team");

  const events = await listEventsForUser(session.userId, session.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Events</h1>
          <p className="mt-2 text-slate-600">Create and manage your photography events.</p>
        </div>
        <Button asChild>
          <Link href="/admin/events/new">
            <Plus className="h-4 w-4" />
            New event
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Create your first event to start assigning team members and collecting photos."
          action={
            <Button asChild>
              <Link href="/admin/events/new">Create event</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{event.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Created {formatDate(event.createdAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="muted">{event.photoCount} photos</Badge>
                    <Badge variant="default">{event.selectedCount} selected</Badge>
                    <Badge
                      variant={
                        event.galleryStatus === "published" ? "success" : "warning"
                      }
                    >
                      {event.galleryStatus}
                    </Badge>
                  </div>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/admin/events/${event.id}`}>Manage</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
