"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Options = { title: string; description?: React.ReactNode; confirm?: string; cancel?: string; destructive?: boolean };

const Ctx = createContext<(o: Options) => Promise<boolean>>(async () => false);

/** `const confirm = useConfirm(); if (await confirm({ title: "Supprimer ?" })) …` */
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<Options | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});

  const ask = useCallback((o: Options) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current(v);
    setOpts(null);
  };

  return (
    <Ctx.Provider value={ask}>
      {children}
      <AlertDialog open={!!opts} onOpenChange={(o) => !o && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
            {opts?.description && <AlertDialogDescription>{opts.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>{opts?.cancel ?? "Annuler"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => close(true)}
              className={opts?.destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
            >
              {opts?.confirm ?? "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  );
}
