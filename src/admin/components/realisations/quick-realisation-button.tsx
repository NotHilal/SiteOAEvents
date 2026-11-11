"use client";

import { Camera } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useQuickRealisation } from "./quick-realisation";

/** Top-bar shortcut, on every admin page. */
export function QuickRealisationButton() {
  const open = useQuickRealisation();
  return (
    <Button size="sm" variant="outline" onClick={open}>
      <Camera /> <span className="hidden sm:inline">Nouvelle réalisation</span>
      <span className="sm:hidden">Réalisation</span>
    </Button>
  );
}
