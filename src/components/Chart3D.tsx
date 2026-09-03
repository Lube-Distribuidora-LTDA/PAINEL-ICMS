"use client";

import { useEffect, useRef } from "react";
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
  const carregado = useRef(false);

  useEffect(() => {
    if (ref.current) ref.current.datasets = datasets;
  }, [datasets]);

  useEffect(() => {
    if (ref.current) ref.current.mode = mode;
  }, [mode]);

  useEffect(() => {
    if (ref.current) ref.current.series = series;
  }, [series]);

  return (
    <>
      <Script
        src="/icms3d.js"
        strategy="afterInteractive"
        onReady={() => {
          carregado.current = true;
          if (ref.current) {
            ref.current.datasets = datasets;
            ref.current.mode = mode;
            ref.current.series = series;
          }
        }}
      />
      {/* @ts-expect-error web component sem tipagem própria */}
      <icms-3d ref={ref} style={{ position: "absolute", inset: 0 }} />
    </>
  );
}
