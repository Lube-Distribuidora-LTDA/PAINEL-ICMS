"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { brl, mi, pct, numero } from "@/lib/formato";
import type { Periodo } from "@/lib/tipos";
import type { User } from "@supabase/supabase-js";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}
function primeiroDiaMesISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function Dashboard({ user }: { user: User }) {
  const supabase = createClient();

  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [carregandoPeriodo, setCarregandoPeriodo] = useState(true);
  const [ini, setIni] = useState(primeiroDiaMesISO());
  const [fim, setFim] = useState(hojeISO());
  const [status, setStatus] = useState("");
  const [erroStatus, setErroStatus] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregarMaisRecente = useCallback(async () => {
    setCarregandoPeriodo(true);
    const { data } = await supabase
      .from("periodos")
      .select("*")
      .order("atualizado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setPeriodo(data as Periodo);
      setIni(data.inicio);
      setFim(data.fim);
    }
    setCarregandoPeriodo(false);
  }, [supabase]);

  useEffect(() => {
    carregarMaisRecente();
  }, [carregarMaisRecente]);

  async function atualizar() {
    if (!ini || !fim) {
      setErroStatus(true);
      setStatus("Informe as duas datas.");
      return;
    }
    if (ini > fim) {
      setErroStatus(true);
      setStatus("A data inicial é posterior à final.");
      return;
    }

    setAtualizando(true);
    setErroStatus(false);
    setStatus("Enviando pedido...");

    const { data: pedido, error } = await supabase
      .from("pedidos_atualizacao")
      .insert({ inicio: ini, fim, solicitado_por: user.email })
      .select()
      .single();

    if (error || !pedido) {
      setErroStatus(true);
      setStatus("Não consegui enviar o pedido: " + (error?.message ?? "erro desconhecido"));
      setAtualizando(false);
      return;
    }

    setStatus("Consultando o WinThor (a máquina da Lube precisa estar ligada e com a ponte rodando)...");

    const limite = Date.now() + 3 * 60 * 1000; // 3 minutos
    const intervalo = setInterval(async () => {
      const { data: p } = await supabase
        .from("pedidos_atualizacao")
        .select("*")
        .eq("id", pedido.id)
        .single();

      if (p?.status === "concluido") {
        clearInterval(intervalo);
        await carregarMaisRecente();
        setStatus("Atualizado.");
        setAtualizando(false);
      } else if (p?.status === "erro") {
        clearInterval(intervalo);
        setErroStatus(true);
        setStatus("Não foi possível atualizar: " + (p.erro_msg ?? "erro desconhecido"));
        setAtualizando(false);
      } else if (Date.now() > limite) {
        clearInterval(intervalo);
        setErroStatus(true);
        setStatus("Demorou demais — a máquina da Lube pode estar desligada. Tente de novo mais tarde.");
        setAtualizando(false);
      }
    }, 3000);
  }

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (carregandoPeriodo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050818] text-[#7d8ad0]">
        Carregando...
      </div>
    );
  }

  const d = periodo?.dados;
  const k = d?.kpis;
  const t = d?.totais;
  const ins = d?.insights;
  const g = d?.grafico;

  return (
    <div className="min-h-screen bg-[#050818] pb-20 font-mono text-[#e9ecfb]">
      {/* topo */}
      <div className="border-b border-[#2a3565] bg-[#0a0f2e] px-6 py-3 text-center">
        <div className="text-sm font-extrabold tracking-widest text-white">
          {periodo?.titulo ?? "Nenhum período carregado ainda"}
        </div>
        <div className="mt-0.5 text-[11px] text-[#6b77b4]">
          Painel de ICMS — Lube Distribuidora, Filial 1
          {periodo && ` · atualizado ${new Date(periodo.atualizado_em).toLocaleString("pt-BR")}`}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {!periodo && (
          <p className="mb-6 rounded-lg border border-[#2a3565] bg-white/5 p-4 text-sm text-[#aab6ff]">
            Ainda não há nenhum período calculado. Escolha as datas abaixo e
            clique em Atualizar.
          </p>
        )}

        {periodo?.status === "erro" && (
          <p className="mb-6 rounded-lg border border-[#5c2b2e] bg-[#2a1215] p-4 text-sm text-[#ff8f96]">
            {periodo.erro_msg}
          </p>
        )}

        {d && k && t && (
          <>
            {/* KPIs principais */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card cor="vermelho" titulo="ICMS PRÓPRIO A RECOLHER" valor={brl(k.icms_a_recolher)}
                sub={`Saída menos entrada · ${pct(k.saldo_sobre_faturamento, 1)} do faturamento`} />
              <Card cor="azul" titulo="DESEMBOLSO DO PERÍODO" valor={brl(k.desembolso)}
                sub={`ICMS próprio + ST de ${brl(t.st)}`} />
              <Card titulo="FATURAMENTO · SAÍDA TOTAL" valor={mi(t.sai_valor)}
                sub={`${k.lancamentos_saida} lançamentos · ICMS de ${brl(t.sai_icms)}`} />
              <Card titulo="COMPRAS · ENTRADA TOTAL" valor={mi(t.ent_valor)}
                sub={`${k.lancamentos_entrada} lançamentos · ICMS de ${brl(t.ent_icms)}`} />
            </div>

            {/* cargas efetivas */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MiniCard titulo="ICMS EFETIVO ENTRADA" valor={pct(k.icms_efetivo_entrada)} cor="azul" />
              <MiniCard titulo="ICMS EFETIVO SAÍDA" valor={pct(k.icms_efetivo_saida)} cor="vermelho" />
              <MiniCard titulo="DIFERENÇA"
                valor={pct(k.icms_efetivo_saida - k.icms_efetivo_entrada) + " p.p."} />
            </div>

            {/* faixas de aliquota */}
            {g && (
              <div className="mb-6 rounded-xl border border-[#2a3565] bg-[#0a0f2e] p-5">
                <div className="mb-4 text-xs font-bold uppercase tracking-widest text-[#aab6ff]">
                  Faixas de alíquota
                </div>
                <div className="flex flex-col gap-2">
                  {g.cats.map((cat, i) => {
                    const ve = g.aliq_valor.ent[i];
                    const vs = g.aliq_valor.sai[i];
                    const max = Math.max(...g.aliq_valor.ent, ...g.aliq_valor.sai) || 1;
                    return (
                      <div key={cat} className="flex items-center gap-3 text-[11px]">
                        <span className="w-12 text-[#7d8ad0]">{cat}</span>
                        <div className="flex flex-1 flex-col gap-1">
                          <Barra frac={ve / max} cor="#2b3ad6" rotulo={`Ent. ${brl(ve)}`} />
                          <Barra frac={vs / max} cor="#f90a19" rotulo={`Saí. ${brl(vs)}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* insights */}
            {ins && (
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MiniCard titulo="ECONOMIA COM REDUÇÃO DE BASE" valor={brl(ins.economia_reducao_base)} />
                <MiniCard titulo="FRETE NA ENTRADA" valor={mi(ins.frete_entrada_valor)}
                  sub={`${pct(ins.frete_entrada_pct_icms, 1)} do ICMS de entrada`} />
                <MiniCard titulo="PERDAS E DEVOLUÇÕES" valor={brl(ins.perda_devolucao_valor)}
                  sub={`${pct(ins.devolucao_cliente_pct_saida, 1)} devolução · ${pct(ins.perda_pct_saida, 1)} perda`} />
                <MiniCard titulo="MARKUP APARENTE"
                  valor={(ins.markup_aparente >= 0 ? "+" : "") + pct(ins.markup_aparente, 1)}
                  sub="Comparação de fluxo, não é margem" />
              </div>
            )}

            <div className="rounded-xl border border-[#2a3565] bg-[#0a0f2e] p-5 text-[11px] text-[#7d8ad0]">
              ICMS-ST retido do cliente: {brl(t.st)} · {pct(k.peso_st_desembolso, 1)} do desembolso total
              (imposto de terceiro passando pelo caixa, não é imposto próprio da Lube).
            </div>
          </>
        )}
      </div>

      {/* barra inferior */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-wrap items-center gap-3 border-t border-[#2a3565] bg-[#050818]/95 px-5 py-3 text-[11px] backdrop-blur">
        <span className="tracking-widest text-[#7d8ad0]">PERÍODO</span>
        <input type="date" value={ini} onChange={(e) => setIni(e.target.value)}
          className="rounded-md border border-[#2a3565] bg-white/5 px-2 py-1.5 text-[#e9ecfb]" />
        <span className="text-[#6b77b4]">até</span>
        <input type="date" value={fim} onChange={(e) => setFim(e.target.value)}
          className="rounded-md border border-[#2a3565] bg-white/5 px-2 py-1.5 text-[#e9ecfb]" />
        <button onClick={atualizar} disabled={atualizando}
          className="rounded-md bg-gradient-to-b from-[#3546e0] to-[#1a2493] px-4 py-1.5 font-bold uppercase tracking-widest text-white disabled:opacity-50">
          {atualizando ? "Atualizando..." : "Atualizar"}
        </button>
        {status && <span className={erroStatus ? "text-[#ff8f96]" : "text-[#aab6ff]"}>{status}</span>}
        <span className="ml-auto flex items-center gap-3 text-[#6b77b4]">
          {user.email}
          <button onClick={sair} className="underline hover:text-[#aab6ff]">sair</button>
        </span>
      </div>
    </div>
  );
}

function Barra({ frac, cor, rotulo }: { frac: number; cor: string; rotulo: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 flex-1 rounded bg-white/5">
        <div className="h-3 rounded" style={{ width: `${Math.max(frac * 100, 0.5)}%`, background: cor }} />
      </div>
      <span className="w-32 shrink-0 text-[#8f9ad0]">{rotulo}</span>
    </div>
  );
}

function Card({ titulo, valor, sub, cor }: { titulo: string; valor: string; sub?: string; cor?: "azul" | "vermelho" }) {
  const fundo = cor === "vermelho"
    ? "bg-gradient-to-br from-[#f90a19]/25 to-[#a10810]/10 border-[#a10810]/40"
    : cor === "azul"
    ? "bg-gradient-to-br from-[#3546e0]/25 to-[#1a2493]/10 border-[#1a2493]/40"
    : "bg-[#0a0f2e] border-[#2a3565]";
  return (
    <div className={`rounded-xl border p-4 ${fundo}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#8f9ad0]">{titulo}</div>
      <div className="mt-1 text-2xl font-extrabold text-white">{valor}</div>
      {sub && <div className="mt-1 text-[11px] text-[#9aa5d8]">{sub}</div>}
    </div>
  );
}

function MiniCard({ titulo, valor, sub, cor }: { titulo: string; valor: string; sub?: string; cor?: "azul" | "vermelho" }) {
  const corTexto = cor === "vermelho" ? "text-[#ff8f96]" : cor === "azul" ? "text-[#aab6ff]" : "text-white";
  return (
    <div className="rounded-xl border border-[#2a3565] bg-[#0a0f2e] p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#8f9ad0]">{titulo}</div>
      <div className={`mt-1 text-lg font-bold ${corTexto}`}>{valor}</div>
      {sub && <div className="mt-1 text-[11px] text-[#7d8ad0]">{sub}</div>}
    </div>
  );
}
