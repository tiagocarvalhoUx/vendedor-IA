import { cn } from "@/lib/utils";

type Tom = "neutro" | "verde" | "ambar" | "vermelho" | "azul";

const TONS: Record<Tom, string> = {
  neutro: "bg-muted text-muted-foreground",
  verde: "bg-primary/15 text-primary",
  ambar: "bg-accent/20 text-accent-foreground",
  vermelho: "bg-destructive/15 text-destructive",
  azul: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

/** Selo compacto para status/rótulos densos nas tabelas e cards. */
export function Badge({
  children,
  tom = "neutro",
  className,
}: {
  readonly children: React.ReactNode;
  readonly tom?: Tom;
  readonly className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONS[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}
