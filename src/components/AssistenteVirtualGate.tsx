"use client";

import { usePathname } from "next/navigation";
import AssistenteVirtual from "./AssistenteVirtual";

const ROTAS_SEM_ASSISTENTE = ["/login", "/definir-senha"];

export default function AssistenteVirtualGate() {
  const pathname = usePathname();
  if (ROTAS_SEM_ASSISTENTE.some((rota) => pathname?.startsWith(rota))) {
    return null;
  }
  return <AssistenteVirtual />;
}
