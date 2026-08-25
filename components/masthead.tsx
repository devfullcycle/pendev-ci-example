import Link from "next/link";
import { CircleUserRound, EllipsisVertical, Menu } from "lucide-react";
import { ButtonIcon } from "@/components/button/icon";
import { ButtonOutline } from "@/components/button/outline";
import { SearchBar } from "@/components/search-bar";
import { YouTubeWordmark } from "@/components/logo/youtube";

// Masthead — 56px de altura, três regiões distribuídas.
// O "BR" é 10px literal: o design não o tokeniza, e não existe papel para ele.
export function Masthead() {
  return (
    <header
      data-component="Masthead"
      className="flex h-14 w-full items-center justify-between bg-surface-page px-4"
    >
      <div className="flex items-center gap-4">
        <ButtonIcon icon={Menu} label="Guide" />
        <Link href="/" className="flex items-start gap-[3px]">
          <YouTubeWordmark />
          <span className="text-[10px]/[1.15] text-text-secondary">BR</span>
        </Link>
      </div>

      <div className="flex w-[656px] items-center">
        <SearchBar />
      </div>

      <div className="flex items-center gap-2">
        <ButtonIcon icon={EllipsisVertical} label="Settings" />
        <ButtonOutline icon={CircleUserRound}>Sign in</ButtonOutline>
      </div>
    </header>
  );
}
