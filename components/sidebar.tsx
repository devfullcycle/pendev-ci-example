import {
  ChevronDown, CircleUserRound, Clapperboard, Film, Flag, History,
  House, Music, Radio, SquarePlay, Tv, type LucideIcon,
} from "lucide-react";
import { ButtonOutline } from "@/components/button/outline";
import { SidebarItem } from "@/components/sidebar-item";

// O design passa o glyph como dado. O mapa explícito mantém só os ícones usados
// no bundle e torna um nome inválido erro de tipo (§11).
type NavItem = { icon: LucideIcon; label: string; href: string };

const PRIMARY: NavItem[] = [
  { icon: House, label: "Home", href: "/" },
  { icon: Clapperboard, label: "Shorts", href: "/shorts" },
  { icon: Tv, label: "Subscriptions", href: "/feed/subscriptions" },
  { icon: CircleUserRound, label: "You", href: "/feed/you" },
  { icon: History, label: "History", href: "/feed/history" },
];

const EXPLORE: NavItem[] = [
  { icon: Music, label: "Music", href: "/music" },
  { icon: Film, label: "Movies", href: "/movies" },
  { icon: Radio, label: "Live", href: "/live" },
  { icon: ChevronDown, label: "Show more", href: "/explore" },
];

// DIVERGE DO DESIGN: o .pen pede o glyph `youtube` da lucide para Premium e
// Kids, mas ícones de marca saíram da biblioteca (não existe em lucide-react
// 1.34). SquarePlay é a forma mais próxima. Precisa de decisão de design.
const MORE: NavItem[] = [
  { icon: SquarePlay, label: "YouTube Premium", href: "/premium" },
  { icon: Music, label: "YouTube Music", href: "/music" },
  { icon: SquarePlay, label: "YouTube Kids", href: "/kids" },
];

const REPORT: NavItem[] = [{ icon: Flag, label: "Report history", href: "/report" }];

function Group({ title, items }: { title?: string; items: NavItem[] }) {
  return (
    <div className="flex w-full flex-col pr-3">
      {title ? (
        <div className="px-3 pt-1.5 pb-1">
          <h2 className="text-title font-medium text-text-primary">{title}</h2>
        </div>
      ) : null}
      {items.map((item) => (
        <SidebarItem key={item.label} {...item} />
      ))}
    </div>
  );
}

function Divider() {
  return <hr className="w-full border-0 border-t border-border-subtle" />;
}

export function Sidebar() {
  return (
    <nav
      data-component="Sidebar"
      aria-label="Guide"
      className="flex w-60 shrink-0 flex-col gap-3 bg-surface-page p-3"
    >
      <Group items={PRIMARY} />
      <Divider />

      <div className="flex w-full flex-col gap-3 px-3 py-4">
        <p className="text-body text-text-primary">
          Sign in to like videos, comment, and subscribe.
        </p>
        <div className="flex">
          <ButtonOutline icon={CircleUserRound}>Sign in</ButtonOutline>
        </div>
      </div>

      <Divider />
      <Group title="Explore" items={EXPLORE} />
      <Divider />
      <Group title="More from YouTube" items={MORE} />
      <Divider />
      <Group items={REPORT} />
    </nav>
  );
}
