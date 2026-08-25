import { CardVideo } from "@/components/card/video";
import { ChannelHeader } from "@/components/channel-header";
import { Chip } from "@/components/chip";
import { VIDEOS } from "@/lib/fixtures";

// Channel — Videos.
//
// O Header Region usa $space-14, que é 58px — NÃO os 56px de p-14 (§4).
// O grid do design tem 3 linhas de 3 cards; em código isso vira auto-fill sobre
// a largura medida do card (357px), com gap-x-4 dentro da linha e gap-y-8 entre
// linhas, que são os dois gaps do .pen (§8).
export default async function ChannelVideosPage({ params }: PageProps<"/[handle]/videos">) {
  const { handle } = await params;

  return (
    <>
      <div className="w-full px-[58px]">
        <ChannelHeader handle={handle} activeTab="Videos" />
      </div>

      <hr className="w-full border-0 border-t border-border-divider" />

      <div className="flex w-full flex-col px-12 pb-12">
        <div className="flex w-full gap-2 pt-4">
          <Chip label="Latest" active />
          <Chip label="Popular" />
          <Chip label="Oldest" />
        </div>

        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(357px,1fr))] gap-x-4 gap-y-8 pt-6">
          {VIDEOS.map((video) => (
            <CardVideo key={video.id} video={video} />
          ))}
        </div>
      </div>
    </>
  );
}
