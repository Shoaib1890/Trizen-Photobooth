import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getCurrentUser } from "@/server/services/auth.service";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const user = await getCurrentUser(session.userId);
  if (!user) redirect("/login");

  return (
    <AppShell role={user.role} userName={user.name}>
      {children}
    </AppShell>
  );
}
