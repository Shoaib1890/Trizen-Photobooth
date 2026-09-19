"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api/client";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
];

const teamLinks = [{ href: "/team", label: "My Events" }];

export function AppShell({
  children,
  role,
  userName,
}: {
  children: React.ReactNode;
  role: "ADMIN" | "TEAM_MEMBER";
  userName: string;
}) {
  const pathname = usePathname();
  const links = role === "ADMIN" ? adminLinks : teamLinks;

  async function handleLogout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href={role === "ADMIN" ? "/admin" : "/team"} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Trizen Gallery</p>
              <p className="text-xs text-slate-500">{userName}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-violet-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500">
              <Camera className="h-5 w-5" />
            </div>
            <span className="font-semibold">Trizen Gallery</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-white/90"
            >
              Register
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
