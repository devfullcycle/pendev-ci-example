import Image from "next/image";

// Avatar — 160x160 circular, recortado.
export function Avatar({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      data-component="Avatar"
      className="relative size-40 shrink-0 overflow-hidden rounded-full"
    >
      <Image src={src} alt={alt} fill sizes="160px" className="object-cover" priority />
    </div>
  );
}
