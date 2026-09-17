import Link from "next/link";
import { Calendar, Camera, ImageIcon, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSessionFromCookies } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getAdminDashboardStats } from "@/server/services/event.service";
import { Role } from "@/generated/prisma";

export default async function AdminDashboardPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== Role.ADMIN) redirect("/team");

  const stats = await getAdminDashboardStats(session.userId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin dashboard</h1>
        <p className="mt-2 text-slate-600">
          Manage events, review uploads, and publish client galleries.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Events", value: stats.totalEvents, icon: Calendar },
          { label: "Photos", value: stats.totalPhotos, icon: Camera },
          { label: "Published galleries", value: stats.publishedGalleries, icon: Sparkles },
          { label: "Recent activity", value: stats.recentEvents.length, icon: ImageIcon },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {item.label}
              </CardTitle>
              <item.icon className="h-4 w-4 text-violet-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No events yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/admin/events/${event.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium">{event.name}</p>
                    <p className="text-sm text-slate-500">
                      {event.photoCount} photos
                    </p>
                  </div>
                  <Badge
                    variant={
                      event.galleryStatus === "published" ? "success" : "muted"
                    }
                  >
                    {event.galleryStatus}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
