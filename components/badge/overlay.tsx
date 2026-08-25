// Badge / Overlay — duração sobre a thumbnail. $radius-xs é 4px = rounded-sm.
export function BadgeOverlay({ children }: { children: React.ReactNode }) {
  return (
    <span
      data-component="Badge / Overlay"
      className="flex items-center justify-center rounded-sm bg-surface-overlay px-1 py-px text-caption font-medium text-text-on-overlay"
    >
      {children}
    </span>
  );
}
