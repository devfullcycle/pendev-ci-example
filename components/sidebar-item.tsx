import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// Sidebar Item — 40px, rounded-nav (10px, o único radius fora da escala nativa).
export function SidebarItem({
  icon: Icon,
  label,
  href,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      data-component="Sidebar Item"
      aria-current={active ? "page" : undefined}
      className={[
        "flex h-10 w-full items-center gap-6 rounded-nav px-3 text-body text-text-primary",
        "hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
        active ? "bg-surface-hover font-medium" : "font-normal",
      ].join(" ")}
    >
      <Icon className="size-6 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}
