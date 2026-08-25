import Link from "next/link";

// Tab — 48px de altura, indicador de 2px rente à base. O padding [13,0,1,0] do
// design está fora da grade de 4 (§2.5).
export function Tab({ label, href, active = false }: { label: string; href: string; active?: boolean }) {
  return (
    <Link
      href={href}
      data-component="Tab"
      aria-current={active ? "page" : undefined}
      className="flex h-12 flex-col items-center justify-between pt-[13px] pb-px focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
    >
      <span className={`text-title font-medium ${active ? "text-text-primary" : "text-text-secondary"}`}>
        {label}
      </span>
      <span
        aria-hidden
        className={`h-0.5 w-full rounded-[1px] ${active ? "bg-text-primary" : "bg-transparent"}`}
      />
    </Link>
  );
}
