"use client";

import { createContext, useContext } from "react";

import { ArrowDown, ArrowUp, ChevronRight, Link2, Plus, RotateCcw, Trash2 } from "lucide-react";

import { ImageField } from "@/components/image-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type CmsField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "richtext" | "image" | "color" | "url" | "toggle" | "list";
  default?: unknown;
  max?: number;
  min?: number;
  rows?: number;
  required?: boolean;
  itemLabel?: string;
  fields?: CmsField[];
};
export type CmsSection = { id: string; label: string; description?: string; fields: CmsField[] };
export type CmsPage = { id: string; key: string; label: string; short?: string; path: string; sections: CmsSection[] };
export type Content = Record<string, Record<string, unknown>>;
type Item = Record<string, unknown>;

/** Which collapsible blocks are open + focus reporting, shared by the editor. */
export const EditorUi = createContext<{
  isOpen: (path: string, fallback: boolean) => boolean;
  setOpen: (path: string, open: boolean) => void;
  onFocusPath: (path: string) => void;
}>({ isOpen: (_p, f) => f, setOpen: () => {}, onFocusPath: () => {} });

export const fieldDomId = (path: string) => `cms-${path}`;

function emptyItem(fields: CmsField[]): Item {
  const o: Item = {};
  for (const f of fields) o[f.id] = f.type === "list" ? [] : f.type === "toggle" ? false : f.type === "color" ? f.default : "";
  return o;
}

function itemSummary(field: CmsField, item: Item, index: number) {
  const first = field.fields?.find((f) => ["text", "textarea", "richtext"].includes(f.type));
  const text = first ? String(item[first.id] || "").replace(/\*/g, "") : "";
  return text.trim() || `${field.itemLabel || "Élément"} ${index + 1}`;
}

export function FieldEditor({ field, value, onChange, path }: { field: CmsField; value: unknown; onChange: (v: unknown) => void; path: string }) {
  const ui = useContext(EditorUi);
  const id = fieldDomId(path);
  const focus = () => ui.onFocusPath(path);

  if (field.type === "list") return <ListEditor field={field} value={Array.isArray(value) ? (value as Item[]) : []} onChange={onChange} path={path} />;

  if (field.type === "toggle") {
    return (
      <label id={id} htmlFor={`${id}-input`} className="cms-field flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
        <span className="text-sm">{field.label}</span>
        <Switch id={`${id}-input`} checked={value === true} onCheckedChange={(v) => { onChange(v); focus(); }} />
      </label>
    );
  }

  const str = typeof value === "string" ? value : "";
  const counter = field.max && str.length > field.max * 0.8 && (
    <span className={cn("text-xs tabular-nums", str.length > field.max ? "text-destructive" : "text-muted-foreground")}>
      {str.length}/{field.max}
    </span>
  );
  const label = (
    <div className="flex items-baseline justify-between gap-2">
      <Label htmlFor={`${id}-input`} className="leading-snug">
        {field.label}
        {field.required && <span className="text-muted-foreground"> *</span>}
      </Label>
      {counter}
    </div>
  );

  if (field.type === "image") {
    const original = typeof field.default === "string" ? field.default : "";
    return (
      <div id={id} className="cms-field space-y-1.5 rounded-lg" onFocus={focus} onClick={focus}>
        {label}
        <ImageField value={str} onChange={(url) => onChange(url)} prefix="site" aspect="aspect-[16/9]" />
        {original && str !== original && (
          <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs text-muted-foreground" onClick={() => onChange(original)}>
            <RotateCcw className="size-3" /> Remettre la photo d'origine
          </Button>
        )}
      </div>
    );
  }

  if (field.type === "color") {
    return (
      <div id={id} className="cms-field space-y-1.5 rounded-lg" onFocus={focus}>
        {label}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(str) ? str : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
            aria-label={field.label}
          />
          <Input id={`${id}-input`} value={str} maxLength={7} onChange={(e) => onChange(e.target.value)} className="w-28 font-mono" />
        </div>
      </div>
    );
  }

  const multiline = field.type === "textarea" || field.type === "richtext";
  return (
    <div id={id} className="cms-field space-y-1.5 rounded-lg">
      {label}
      {multiline ? (
        <Textarea id={`${id}-input`} value={str} rows={field.rows || 3} onFocus={focus} onChange={(e) => onChange(e.target.value)} className="resize-y" />
      ) : (
        <Input
          id={`${id}-input`}
          value={str}
          type={field.type === "url" ? "url" : "text"}
          placeholder={field.type === "url" ? "https://" : undefined}
          onFocus={focus}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.type === "richtext" && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 className="size-3" /> Lien vers une page : [texte du lien](/contact)
        </p>
      )}
    </div>
  );
}

function ListEditor({ field, value, onChange, path }: { field: CmsField; value: Item[]; onChange: (v: unknown) => void; path: string }) {
  const ui = useContext(EditorUi);
  const min = field.min ?? 0;
  const max = field.max ?? 50;
  const fixed = min === max;
  const fields = field.fields || [];
  const set = (i: number, item: Item) => onChange(value.map((x, j) => (j === i ? item : x)));
  const move = (i: number, d: number) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const add = () => {
    onChange([...value, emptyItem(fields)]);
    ui.setOpen(`${path}.${value.length}`, true);
  };

  return (
    <div id={fieldDomId(path)} className="cms-field space-y-2 rounded-lg">
      <div className="flex items-baseline justify-between">
        <Label className="leading-snug">{field.label}</Label>
        <span className="text-xs text-muted-foreground">{fixed ? `${max} éléments` : `${value.length} / ${max}`}</span>
      </div>
      <ul className="space-y-2">
        {value.map((item, i) => {
          const itemPath = `${path}.${i}`;
          const open = ui.isOpen(itemPath, value.length <= 2);
          return (
            <li key={i} id={fieldDomId(itemPath)} className="cms-field rounded-lg border bg-background">
              <div className="flex items-center gap-1 pr-1">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm"
                  onClick={() => {
                    ui.setOpen(itemPath, !open);
                    ui.onFocusPath(itemPath);
                  }}
                  aria-expanded={open}
                >
                  <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
                  <span className="truncate font-medium">{itemSummary(field, item, i)}</span>
                </button>
                {!fixed && (
                  <>
                    <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter">
                      <ArrowUp />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Descendre">
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={value.length <= min}
                      onClick={() => onChange(value.filter((_, j) => j !== i))}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </>
                )}
              </div>
              {open && (
                <div className="space-y-3 border-t px-3 pt-3 pb-3">
                  {fields.map((sub) => (
                    <FieldEditor key={sub.id} field={sub} value={item[sub.id]} path={`${itemPath}.${sub.id}`} onChange={(v) => set(i, { ...item, [sub.id]: v })} />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!fixed && value.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus /> {field.itemLabel || "Ajouter"}
        </Button>
      )}
    </div>
  );
}
