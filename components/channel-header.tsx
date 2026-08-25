import Image from "next/image";
import { Link2, Search } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { ButtonPrimary } from "@/components/button/primary";
import { Tab } from "@/components/tab";
import { CHANNEL } from "@/lib/fixtures";

const TABS = ["Home", "Videos", "Shorts", "Live", "Playlists"] as const;
export type ChannelTab = (typeof TABS)[number];

function tabHref(handle: string, tab: ChannelTab) {
  return tab === "Home" ? `/${handle}` : `/${handle}/${tab.toLowerCase()}`;
}

// Channel Header — banner, identidade e a barra de abas.
// O banner tem 172px no design (43 x 4), logo h-43 na escala nativa.
export function ChannelHeader({ handle, activeTab }: { handle: string; activeTab: ChannelTab }) {
  return (
    <div data-component="Channel Header" className="flex w-full flex-col">
      <div className="relative h-43 w-full overflow-hidden rounded-2xl">
        <Image src="/banner.jpg" alt="" fill sizes="100vw" className="object-cover" priority />
      </div>

      <div className="flex w-full items-center gap-4 pt-4 pb-1">
        <Avatar src="/avatar.jpg" alt={CHANNEL.name} />

        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-display font-bold text-text-primary">{CHANNEL.name}</h1>
            <div className="flex items-center gap-1 text-body">
              <span className="font-medium text-text-primary">{CHANNEL.handle}</span>
              <span className="text-text-secondary">•</span>
              <span className="text-text-secondary">{CHANNEL.subscribers}</span>
              <span className="text-text-secondary">•</span>
              <span className="text-text-secondary">{CHANNEL.videoCount}</span>
            </div>
          </div>

          <p className="flex items-end gap-1 text-body">
            <span className="text-text-secondary">{CHANNEL.description}</span>
            <span className="font-medium text-text-primary">...more</span>
          </p>

          <div className="flex items-center gap-1 text-body">
            <span className="flex items-center gap-2">
              <Link2 className="size-4 text-text-secondary" aria-hidden />
              <a href={`https://${CHANNEL.link}`} className="text-text-link">
                {CHANNEL.link}
              </a>
            </span>
            <span className="font-medium text-text-primary">{CHANNEL.moreLinks}</span>
          </div>

          <div className="flex gap-3 pt-0.5">
            <ButtonPrimary>Subscribe</ButtonPrimary>
          </div>
        </div>
      </div>

      <nav aria-label="Channel sections" className="flex h-12 w-full gap-6">
        {TABS.map((tab) => (
          <Tab key={tab} label={tab} href={tabHref(handle, tab)} active={tab === activeTab} />
        ))}
        <button
          type="button"
          aria-label="Search this channel"
          className="flex h-12 items-start px-2 pt-[13px] text-text-secondary focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
        >
          <Search className="size-6" aria-hidden />
        </button>
      </nav>
    </div>
  );
}
