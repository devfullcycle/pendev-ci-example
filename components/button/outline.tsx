import type { LucideIcon } from "lucide-react";

// Button / Outline — pill com borda (Sign in). O padding horizontal é 15px no
// design: fora da grade de 4, então valor arbitrário (§2.5).
export function ButtonOutline({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-component="Button / Outline"
      className="flex h-10 items-center gap-2 rounded-full border border-border-control px-[15px] text-body font-medium text-text-link hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
    >
      <Icon className="size-6" aria-hidden />
      {children}
    </button>
  );
}
