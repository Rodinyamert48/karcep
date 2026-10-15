import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Sayfa başlığı: tek h1, isteğe bağlı tek satırlık açıklama ve sağda eylemler. */
export function PageTitle({ title, lead, actions }: { title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-fg sm:text-[32px]">{title}</h1>
        {lead && <p className="mt-2 max-w-2xl text-[15px] text-muted">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Üstünde ince bir çizgiyle ayrılan, başlıklı bölüm. Kart yerine "cetvelli" yapı. */
export function Block({
  title,
  aside,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section aria-labelledby={title && id ? id : undefined} className={cn("border-t border-line pt-5", className)}>
      {(title || aside) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          {title && (
            <h2 id={id} className="text-[15px] font-semibold text-fg">
              {title}
            </h2>
          )}
          {aside && <div className="text-sm text-muted">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-lg border border-line bg-raised", className)} {...rest}>
      {children}
    </div>
  );
}

/** Kısa, eyleme dönük boş durum: bir cümle ve en fazla iki eylem. */
export function Empty({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="text-lg font-semibold text-fg">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</p>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

type NoteTone = "info" | "warn" | "loss";
const NOTE: Record<NoteTone, string> = {
  info: "border-info",
  warn: "border-warn",
  loss: "border-loss",
};

/** Sol kenar çizgili not. Ton yalnızca renge bırakılmaz; başlık metni durumu söyler. */
export function Note({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: NoteTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-l-2 bg-raised py-3 pr-4 pl-4 text-sm text-muted", NOTE[tone], className)}>
      {title && <p className="mb-0.5 font-medium text-fg">{title}</p>}
      {children}
    </div>
  );
}

const TAG: Record<string, string> = {
  neutral: "border-line-strong text-muted",
  accent: "border-accent/40 text-accent",
  warn: "border-warn/40 text-warn",
  loss: "border-loss/40 text-loss",
  info: "border-info/40 text-info",
};

export function Tag({ tone = "neutral", children, className }: { tone?: keyof typeof TAG; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs whitespace-nowrap", TAG[tone], className)}>
      {children}
    </span>
  );
}
