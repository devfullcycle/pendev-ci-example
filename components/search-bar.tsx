import { Mic, Search } from "lucide-react";

// Search Bar — campo (fill) + submit de 64 + gap 16 + voz de 40, total 656.
// O radius por canto do design vira rounded-l-full / rounded-r-full (§6).
export function SearchBar() {
  return (
    <form data-component="Search Bar" role="search" className="flex w-full items-center gap-4">
      <div className="flex w-full items-center">
        <div className="flex h-10 w-full items-center rounded-l-full border border-border-strong bg-surface-input pr-1 pl-4">
          <input
            type="search"
            placeholder="Search"
            aria-label="Search"
            className="w-full bg-transparent text-title text-text-primary placeholder:text-text-secondary focus-visible:outline-none"
          />
        </div>
        <button
          type="submit"
          aria-label="Search"
          className="flex h-10 w-16 shrink-0 items-center justify-center rounded-r-full border border-border-search-btn bg-surface-search-btn text-text-primary focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
        >
          <Search className="size-6" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        aria-label="Search with your voice"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-text-primary focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
      >
        <Mic className="size-6" aria-hidden />
      </button>
    </form>
  );
}
