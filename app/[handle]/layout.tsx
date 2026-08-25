import { Masthead } from "@/components/masthead";
import { Sidebar } from "@/components/sidebar";

// A moldura do canal: Masthead + Body(Sidebar, Main), igual nas duas telas.
export default function ChannelLayout({ children }: LayoutProps<"/[handle]">) {
  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      <Masthead />
      <div className="flex w-full flex-1">
        <Sidebar />
        <main className="flex w-full min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
