import { redirect } from "next/navigation";

// Só existe a tela do canal por enquanto. O feed de home não foi desenhado.
export default function RootPage() {
  redirect("/@FullCycle/videos");
}
