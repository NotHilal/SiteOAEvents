import { cn } from "@/lib/utils";

/** Title block at the top of every admin page; `actions` sits on the right
 *  (e.g. "+ Nouvelle commande"). */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold md:text-[1.7rem]">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
