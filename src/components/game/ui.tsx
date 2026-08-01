// Wiederverwendbare UI-Primitives im Design-System (keine Ad-hoc-Farben).
import type { ReactNode } from "react";

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string | undefined;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel stripe-top p-4 pt-5 ${className}`}>
      {title && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-bold uppercase tracking-wide">{title}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="panel px-3 py-3">
      <div className="label-xs">{label}</div>
      <div className="font-display text-xl font-bold leading-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Bar({ value, max = 100, tone = "speed" }: { value: number; max?: number; tone?: "speed" | "muted" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all duration-500 ${tone === "speed" ? "speed-fill" : "bg-accent"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

type BtnVariant = "primary" | "ghost" | "accent" | "danger";
const btn: Record<BtnVariant, string> = {
  primary: "speed-fill text-primary-foreground hover:brightness-110",
  ghost: "bg-secondary text-secondary-foreground hover:bg-elevated",
  accent: "bg-accent text-accent-foreground hover:brightness-110",
  danger: "bg-destructive text-destructive-foreground hover:brightness-110",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: (() => void) | undefined;
  variant?: BtnVariant;
  disabled?: boolean | undefined;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 font-display text-sm font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40 ${btn[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label-xs mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-ring";

export function Chip({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "primary" }) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    accent: "bg-accent/20 text-accent",
    primary: "bg-primary/20 text-primary",
  } as const;
  return (
    <span className={`rounded px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Avatar({ initials, color }: { initials: string; color?: string | undefined }) {
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-primary-foreground"
      style={{ background: color ?? "var(--primary)" }}
    >
      {initials}
    </span>
  );
}
