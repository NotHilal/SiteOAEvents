"use client";

import { useMemo, useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PlanningMaterial } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "+ Ajouter un article" — searchable list, with what's left for the chosen dates. */
export function MaterialPicker({
  materials,
  available,
  exclude = [],
  onPick,
  label = "Ajouter un article",
}: {
  materials: PlanningMaterial[];
  available?: Record<string, number>;
  exclude?: string[];
  onPick: (m: PlanningMaterial) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => {
    const map = new Map<string, PlanningMaterial[]>();
    for (const m of materials) {
      if (exclude.includes(m.id)) continue;
      const list = map.get(m.category) || [];
      list.push(m);
      map.set(m.category, list);
    }
    return [...map.entries()];
  }, [materials, exclude]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 w-full justify-start border-dashed text-muted-foreground">
          <Plus /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Chercher : chaise, table, nappe…" />
          <CommandList className="max-h-80">
            <CommandEmpty>Aucun article.</CommandEmpty>
            {groups.map(([category, list]) => (
              <CommandGroup key={category} heading={category}>
                {list.map((m) => {
                  const left = available?.[m.id];
                  return (
                    <CommandItem
                      key={m.id}
                      value={`${m.name} ${category}`}
                      onSelect={() => {
                        onPick(m);
                        setOpen(false);
                      }}
                      className="justify-between gap-3"
                    >
                      <span className="truncate">{m.name}</span>
                      <span
                        className={cn(
                          "shrink-0 text-xs tabular-nums",
                          left == null ? "text-muted-foreground" : left <= 0 ? "text-destructive" : left < m.stock * 0.25 ? "text-warning" : "text-success",
                        )}
                      >
                        {left == null ? `stock ${m.stock}` : `${left} dispo`}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
