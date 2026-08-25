import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

// O .pen declara font-sans: "Roboto". O contrato com globals.css é o nome da
// variável: $font-X <-> var(--font-<slug(X)>). Ver DESIGN-SYSTEM.md §5.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Full Cycle",
  description: "A Full Cycle ajuda desenvolvedores a desenvolverem aplicações de grande porte!",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${roboto.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
