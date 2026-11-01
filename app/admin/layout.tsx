import type { Metadata } from "next";
import { connection } from "next/server";

import "@fontsource/lato/400.css";
import "@fontsource/lato/700.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import "@/styles/globals.css";

import { AdminShell } from "@/components/shell/admin-shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Espace OA",
  robots: { index: false, follow: false },
};

// Root layout of the App Router part of the site: only /admin lives in app/,
// the public site stays in pages/ (own _app, Bootstrap, CSS).
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // Render per request: the CSP nonce from proxy.js is only applied to
  // dynamically rendered pages.
  await connection();
  return (
    <html lang="fr">
      <body>
        <TooltipProvider delayDuration={200}>
          <AdminShell>{children}</AdminShell>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
