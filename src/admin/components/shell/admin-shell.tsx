"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { BookingProvider } from "@/components/booking/booking-provider";
import { ConfirmProvider } from "@/components/confirm";
import { QuickRealisationButton } from "@/components/realisations/quick-realisation-button";
import { QuickRealisationProvider } from "@/components/realisations/quick-realisation";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { type AdminSession, readSession } from "@/lib/session";
import { findNavItem } from "@/navigation";

import { AppSidebar } from "./app-sidebar";
import { LoginScreen } from "./login-screen";

/** Login gate + sidebar layout for every /admin page. The session lives in
 *  sessionStorage (client only), hence the "checking" state on first paint. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null | "checking">("checking");
  const pathname = usePathname() || "/admin";
  const current = findNavItem(pathname);

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    window.addEventListener("oa-session", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("oa-session", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    document.title = current ? `${current.title} · Espace OA` : "Espace OA";
  }, [current]);

  if (session === "checking") {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (!session) return <LoginScreen />;

  return (
    <ConfirmProvider>
    <BookingProvider>
    <QuickRealisationProvider>
    <SidebarProvider style={{ "--sidebar-width": "15.5rem" } as React.CSSProperties}>
      <AppSidebar email={session.user?.email || ""} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-md lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5 data-[orientation=vertical]:self-center" />
          <span className="font-heading text-sm font-semibold">{current?.title ?? "Espace OA"}</span>
          <span className="flex-1" />
          <QuickRealisationButton />
        </header>
        <div className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
    </QuickRealisationProvider>
    </BookingProvider>
    </ConfirmProvider>
  );
}
