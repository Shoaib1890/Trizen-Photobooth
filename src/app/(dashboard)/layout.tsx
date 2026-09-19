import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  return (
    <AppShell role={session.role} userName={session.name || "Signed in"}>
      {children}
    </AppShell>
  );
}
