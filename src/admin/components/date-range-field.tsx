"use client";

import { useState } from "react";

import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { daysBetween, fmt, fr, fromISO, toISO } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Pick one day or a period. Value: { from, to } as YYYY-MM-DD. */
export function DateRangeField({
  from,
  to,
  onChange,
  className,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const count = from && to ? daysBetween(from, to).length : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-11 w-full justify-start gap-2.5 text-left font-normal", className)}>
          <CalendarDays className="text-muted-foreground" />
          {from ? (
            <span className="flex-1 truncate">
              {from === to ? fmt(from, "EEEE d MMMM yyyy") : `${fmt(from, "d MMM yyyy")} → ${fmt(to, "d MMM yyyy")}`}
            </span>
          ) : (
            <span className="flex-1 text-muted-foreground">Choisir la date ou la période</span>
          )}
          {count > 0 && <span className="text-xs text-muted-foreground">{count} j</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          locale={fr}
          numberOfMonths={isMobile ? 1 : 2}
          captionLayout="dropdown"
          startMonth={new Date(2024, 0)}
          endMonth={new Date(new Date().getFullYear() + 5, 11)}
          defaultMonth={from ? fromISO(from) : new Date()}
          selected={from ? { from: fromISO(from), to: to ? fromISO(to) : undefined } : undefined}
          onSelect={(range) => {
            if (!range?.from) return;
            const f = toISO(range.from);
            const t = range.to ? toISO(range.to) : f;
            onChange(f, t);
          }}
        />
        <div className="flex items-center justify-between gap-2 border-t p-2 text-xs text-muted-foreground">
          <span>Cliquez le 1er jour puis le dernier (même jour = 1 journée).</span>
          <Button size="sm" onClick={() => setOpen(false)}>
            OK
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
