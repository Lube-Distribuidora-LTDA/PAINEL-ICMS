"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

export interface ConjuntoDados {
  axis: string;
  cats: string[];
  ent: number[];
  sai: number[];
}

export type Datasets3D = Record<"aliq" | "icms" | "uf" | "base", ConjuntoDados>;

interface Icms3DElement extends HTMLElement {
  mode: string;
  series: string;
  datasets: Datasets3D | null;
}

export default function Chart3D({
  datasets,
  mode,
  series,
}: {
  datasets: Datasets3D;
  mode: string;
  series: string;
}) {
  const ref = useRef<Icms3DElement | null>(null);
  // Só mexe nas propriedades do <icms-3d> depois que a classe REALMENTE
  // registrou (customElements.whenDefined) — setar antes disso grava uma
  // propriedade "solta" na instância que o "upgrade" do Custom Element
  // depois ignora, e o gráfico fica em branco até algo forçar um novo
  // render (por isso só aparecia depois de clicar Atualizar).
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let cancelado = false;
    customElements.whenDefined("icms-3d").then(() => {
      if (!cancelado) setPronto(true);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (pronto && ref.current) ref.current.datasets = datasets;
  }, [datasets, pronto]);

  useEffect(() => {
    if (pronto && ref.current) ref.current.mode = mode;
  }, [mode, pronto]);

  useEffect(() => {
    if (pronto && ref.current) ref.current.series = series;
  }, [series, pronto]);

  return (
    <>
      <Script src="/icms3d.js" strategy="afterInteractive" />
      {/* @ts-expect-error web component sem tipagem própria */}
      <icms-3d ref={ref} style={{ position: "absolute", inset: 0 }} />
    </>
  );
}
