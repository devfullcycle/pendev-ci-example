import type { LucideIcon } from "lucide-react";

// Button / Icon — 40x40, circular. §9: hover e foco são acréscimo de
// engenharia; o design não os define.
export function ButtonIcon({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      data-component="Button / Icon"
      className="flex size-10 items-center justify-center rounded-full text-text-primary hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
    >
      <Icon className="size-6" aria-hidden />
    </button>
  );
}
