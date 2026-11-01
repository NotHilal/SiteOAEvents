"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { Booking } from "@/lib/types";

import { BookingDialog, type BookingDraft } from "./booking-dialog";
import { BookingSheet } from "./booking-sheet";

type Api = {
  /** New block / manual order, optionally prefilled. */
  newBooking: (draft?: BookingDraft) => void;
  /** Open an order / block in the side panel. */
  openBooking: (id: string) => void;
};

const Ctx = createContext<Api>({ newBooking: () => {}, openBooking: () => {} });
export const useBookings = () => useContext(Ctx);

/** Re-run `fn` whenever a booking is created / changed anywhere in the admin. */
export function useBookingsChanged(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const h = () => ref.current();
    window.addEventListener("oa:bookings-changed", h);
    return () => window.removeEventListener("oa:bookings-changed", h);
  }, []);
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<{ draft?: BookingDraft | null; booking?: Booking | null } | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);

  const newBooking = useCallback((draft?: BookingDraft) => setDialog({ draft: draft || null, booking: null }), []);
  const openBooking = useCallback((id: string) => setSheetId(id), []);
  const value = useMemo(() => ({ newBooking, openBooking }), [newBooking, openBooking]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <BookingSheet
        id={sheetId}
        onOpenChange={(o) => !o && setSheetId(null)}
        onEdit={(b, asOrder) => setDialog({ booking: b, draft: asOrder ? { kind: "manual" } : null })}
      />
      <BookingDialog
        open={!!dialog}
        onOpenChange={(o) => !o && setDialog(null)}
        draft={dialog?.draft}
        booking={dialog?.booking}
        onSaved={(b) => {
          if (sheetId) setSheetId(b.id);
        }}
      />
    </Ctx.Provider>
  );
}
