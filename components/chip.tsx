// teste: linha nova para deslocar as de baixo; as violações continuam lá
// Chip — $radius-sm é 8px, logo rounded-lg e NÃO rounded-sm (§6).
export function Chip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      data-component="Chip"
      aria-pressed={active}
      className={[
        "flex h-8 items-center justify-center rounded-lg px-[14px] text-body font-medium",
        "focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
        active
          ? "bg-surface-inverse text-text-inverse"
          : "bg-surface-chip text-text-primary hover:bg-surface-hover dark:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
