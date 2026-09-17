import Link from "next/link";
import { Camera, ArrowRight, Shield, Upload, Sparkles } from "lucide-react";
import { PublicShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              Professional event photo delivery
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Share event photos securely with your clients
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/70">
              Trizen Gallery helps photography teams upload event photos, curate
              selections, and deliver PIN-protected galleries to customers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Upload,
                title: "Team uploads",
                text: "Assign photographers and collect event photos in one place.",
              },
              {
                icon: Shield,
                title: "PIN-protected galleries",
                text: "Publish curated selections behind a secure 6-digit PIN.",
              },
              {
                icon: Camera,
                title: "Cloud delivery",
                text: "Optimized image delivery powered by Cloudinary.",
              },
              {
                icon: Sparkles,
                title: "Client-ready UX",
                text: "Responsive galleries designed for real customer viewing.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
              >
                <item.icon className="h-5 w-5 text-violet-300" />
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-white/65">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
