import Image from "next/image";
import { BadgeOverlay } from "@/components/badge/overlay";
import type { Video } from "@/lib/fixtures";

// Card / Video — variante do grid.
//
// A altura de 201px da thumbnail no .pen é 16:9 da largura do card congelada
// (357.33 x 9/16). O formato não tem primitiva de proporção; o código tem, e o
// layout é fluido — então aspect-video, nunca h-[201px] (§8).
//
// Os insets de 26px e 24px no bloco de texto fazem o título quebrar antes da
// metadata. São valores do design fora da grade de 4 (§2.5).
export function CardVideo({ video }: { video: Video }) {
  return (
    <article data-component="Card / Video" className="flex w-full flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
        <Image
          src={`/thumbs/${video.id}.jpg`}
          alt=""
          fill
          sizes="(max-width: 1100px) 50vw, 33vw"
          className="object-cover"
        />
        <div className="absolute right-0 bottom-0 p-2">
          <BadgeOverlay>{video.duration}</BadgeOverlay>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 pr-[26px]">
        <h3 className="pr-6 text-title font-medium text-text-primary">{video.title}</h3>
        <p className="text-body text-text-secondary">{video.meta}</p>
      </div>
    </article>
  );
}
