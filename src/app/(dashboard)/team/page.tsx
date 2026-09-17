import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listEventsForUser } from "@/server/services/event.service";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma";

export default async function TeamEventsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== Role.TEAM_MEMBER) redirect("/admin");

  const events = await listEventsForUser(session.userId, session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My assigned events</h1>
        <p className="mt-2 text-slate-600">
          Upload photos to events you&apos;ve been assigned to.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No assigned events"
          description="An admin will assign you to events before you can upload photos."
        />
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{event.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Assigned · Created {formatDate(event.createdAt)}
                  </p>
                  <Badge className="mt-3" variant="muted">
                    {event.photoCount} photos uploaded by you
                  </Badge>
                </div>
                <Button asChild>
                  <Link href={`/team/events/${event.id}`}>Open event</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
