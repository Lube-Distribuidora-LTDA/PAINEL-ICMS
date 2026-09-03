"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { brl, mi, pct } from "@/lib/formato";
import { montarDatasets } from "@/lib/montarDatasets";
import Chart3D from "@/components/Chart3D";
import type { Periodo } from "@/lib/tipos";
import type { User } from "@supabase/supabase-js";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}
function primeiroDiaMesISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

const MONO = "var(--font-jetbrains-mono),ui-monospace,Menlo,monospace";
const SANS = "var(--font-archivo),'Helvetica Neue',Arial,sans-serif";

const BTN: React.CSSProperties = {
  fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em",
  textTransform: "uppercase", padding: "7px 11px", borderRadius: 7, cursor: "pointer",
  transition: "background .2s,color .2s", border: "1px solid transparent",
};
const ON: React.CSSProperties = {
  ...BTN, border: "1px solid rgba(255,255,255,.35)",
  background: "linear-gradient(180deg,#3546e0,#1a2493)", color: "#fff",
  boxShadow: "0 6px 16px rgba(30,45,190,.55),inset 0 1px 0 rgba(255,255,255,.3)",
};
const OFF: React.CSSProperties = {
  ...BTN, border: "1px solid rgba(130,148,255,.28)", background: "rgba(255,255,255,.04)", color: "#98a3dc",
};

export default function Dashboard({ user }: { user: User }) {
  const supabase = createClient();

  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [carregandoPeriodo, setCarregandoPeriodo] = useState(true);
  const [ini, setIni] = useState(primeiroDiaMesISO());
  const [fim, setFim] = useState(hojeISO());
  const [status, setStatus] = useState("");
  const [erroStatus, setErroStatus] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [modo, setModo] = useState<"aliq" | "icms" | "uf" | "base">("aliq");
  const [serie, setSerie] = useState<"both" | "ent" | "sai">("both");

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
    if (!ini || !fim) { setErroStatus(true); setStatus("Informe as duas datas."); return; }
    if (ini > fim) { setErroStatus(true); setStatus("A data inicial é posterior à final."); return; }

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

    setStatus("Consultando o WinThor...");

    const limite = Date.now() + 3 * 60 * 1000;
    const intervalo = setInterval(async () => {
      const { data: p } = await supabase.from("pedidos_atualizacao").select("*").eq("id", pedido.id).single();
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
        setStatus("Demorou demais — a ponte local pode estar desligada.");
        setAtualizando(false);
      }
    }, 3000);
  }

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (carregandoPeriodo) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050818", color: "#7d8ad0", fontFamily: MONO }}>Carregando...</div>;
  }

  const d = periodo?.dados;
  const k = d?.kpis;
  const t = d?.totais;
  const ins = d?.insights;
  const datasets = d ? montarDatasets(d) : null;

  const pesoEnt = k && t ? pct((t.ent_icms / (t.ent_icms + t.sai_icms || 1)) * 100, 0) : "0%";
  const pesoSai = k && t ? pct((t.sai_icms / (t.ent_icms + t.sai_icms || 1)) * 100, 0) : "0%";

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(1200px 700px at 78% -10%,#132073 0%,rgba(19,32,115,0) 62%),radial-gradient(900px 600px at 4% 108%,#4a0a12 0%,rgba(74,10,18,0) 60%),#050818", color: "#e9ecfb", fontFamily: SANS, paddingBottom: 70 }}>
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "18px 24px 14px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap", paddingBottom: 14, borderBottom: "1px solid rgba(140,155,255,.18)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: "9px 14px", boxShadow: "0 14px 34px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.28)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-lube.png" alt="Lube Distribuidora" style={{ display: "block", height: 38, width: "auto" }} />
            </div>
            <div>
              <div style={{ fontSize: 23, fontWeight: 900, fontStyle: "italic", letterSpacing: "-.03em", lineHeight: 1.05 }}>Painel de ICMS — Entrada × Saída</div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".18em", color: "#7d8ad0", marginTop: 5 }}>
                KPI&apos;S - INDICADORES DE PERFORMANCE
                {periodo && <> &nbsp;·&nbsp; <span style={{ color: "#e9ecfb", fontWeight: 700 }}>{periodo.titulo}</span></>}
              </div>
            </div>
          </div>
          {k && (
            <div style={{ display: "flex", alignItems: "stretch", gap: 10, flexWrap: "wrap" }}>
              <MiniPill label="ICMS EFETIVO ENTRADA" valor={pct(k.icms_efetivo_entrada)} tom="azul" />
              <MiniPill label="ICMS EFETIVO SAÍDA" valor={pct(k.icms_efetivo_saida)} tom="vermelho" />
              <MiniPill label="DIFERENÇA" valor={pct(k.icms_efetivo_saida - k.icms_efetivo_entrada) + " p.p."} />
            </div>
          )}
        </div>

        {!periodo && (
          <div style={{ borderRadius: 14, padding: 20, background: "rgba(255,255,255,.05)", border: "1px solid rgba(130,148,255,.2)" }}>
            <div style={{ fontWeight: 900, fontStyle: "italic", marginBottom: 6 }}>Nenhum período carregado ainda</div>
            <div style={{ color: "#a3adde", fontSize: 13 }}>Escolha as datas no rodapé e clique em Atualizar.</div>
          </div>
        )}

        {d && k && t && ins && datasets && (
          <>
            {/* KPIs principais */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
              <CardGrande cor="vermelho" titulo="ICMS PRÓPRIO A RECOLHER" valor={brl(k.icms_a_recolher)}
                sub={<>Saída menos entrada · <b>{pct(k.saldo_sobre_faturamento, 1)}</b> do faturamento</>} />
              <CardGrande cor="azul" titulo="DESEMBOLSO DO PERÍODO" valor={brl(k.desembolso)}
                sub={<>ICMS próprio + ST de <b>{brl(t.st)}</b></>} />
              <CardGrande titulo="FATURAMENTO · SAÍDA TOTAL" valor={mi(t.sai_valor)} corTexto="#ff8f96"
                sub={<>{k.lancamentos_saida} lançamentos · ICMS de <b style={{ color: "#e9ecfb" }}>{brl(t.sai_icms)}</b></>} />
              <CardGrande titulo="COMPRAS · ENTRADA TOTAL" valor={mi(t.ent_valor)} corTexto="#aab6ff"
                sub={<>{k.lancamentos_entrada} lançamentos · ICMS de <b style={{ color: "#e9ecfb" }}>{brl(t.ent_icms)}</b></>} />
            </div>

            {/* grafico 3D + lateral */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 14, minHeight: 420 }}>
              <div style={{ position: "relative", minHeight: 420, display: "grid", gridTemplateRows: "auto minmax(0,1fr)", borderRadius: 16, background: "linear-gradient(170deg,rgba(24,34,110,.55),rgba(6,10,32,.75))", border: "1px solid rgba(130,148,255,.22)", boxShadow: "0 26px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.1)", overflow: "hidden" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "13px 18px", borderBottom: "1px solid rgba(130,148,255,.18)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 16, fontWeight: 900, fontStyle: "italic", letterSpacing: "-.025em" }}>Volume comparado em três dimensões</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".15em", color: "#7d8ad0", whiteSpace: "nowrap" }}>ARRASTE PARA GIRAR</div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={modo === "aliq" ? ON : OFF} onClick={() => setModo("aliq")}>Alíquota · valor</button>
                      <button style={modo === "icms" ? ON : OFF} onClick={() => setModo("icms")}>Alíquota · ICMS</button>
                      <button style={modo === "uf" ? ON : OFF} onClick={() => setModo("uf")}>Por UF</button>
                      <button style={modo === "base" ? ON : OFF} onClick={() => setModo("base")}>Composição</button>
                    </div>
                    <div style={{ width: 1, height: 22, background: "rgba(130,148,255,.25)" }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={serie === "both" ? ON : OFF} onClick={() => setSerie("both")}>Ambos</button>
                      <button style={serie === "ent" ? ON : OFF} onClick={() => setSerie("ent")}>Entrada</button>
                      <button style={serie === "sai" ? ON : OFF} onClick={() => setSerie("sai")}>Saída</button>
                    </div>
                  </div>
                </div>
                <div style={{ position: "relative", minHeight: 0 }}>
                  <Chart3D datasets={datasets} mode={modo} series={serie} />
                  <div style={{ position: "absolute", right: 18, top: 14, display: "flex", gap: 18, fontFamily: MONO, fontSize: 10, letterSpacing: ".1em", color: "#93a0dc", pointerEvents: "none" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}><i style={{ display: "inline-block", width: 11, height: 11, borderRadius: 3, background: "#2b3ad6", boxShadow: "0 0 12px rgba(43,58,214,.9)" }} />ENTRADA</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}><i style={{ display: "inline-block", width: 11, height: 11, borderRadius: 3, background: "#f90a19", boxShadow: "0 0 12px rgba(249,10,25,.9)" }} />SAÍDA</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateRows: "auto auto auto", gap: 14, alignContent: "start" }}>
                <div style={{ borderRadius: 14, padding: "14px 16px 16px", background: "linear-gradient(170deg,rgba(255,255,255,.07),rgba(255,255,255,.02))", border: "1px solid rgba(130,148,255,.2)", boxShadow: "0 18px 40px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.12)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 9, letterSpacing: ".15em", marginBottom: 9 }}>
                    <span style={{ color: "#aab6ff" }}>◤ ICMS DE ENTRADA</span><span style={{ color: "#ff8f96" }}>ICMS DE SAÍDA ◥</span>
                  </div>
                  <div style={{ display: "flex", height: 46, borderRadius: 8, overflow: "hidden", boxShadow: "0 10px 24px rgba(0,0,0,.5)" }}>
                    <div style={{ width: pesoEnt, display: "flex", alignItems: "center", padding: "0 12px", background: "linear-gradient(180deg,#3546e0,#161f80)", fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)" }}>{Math.round(t.ent_icms).toLocaleString("pt-BR")}</div>
                    <div style={{ width: pesoSai, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 12px", background: "linear-gradient(180deg,#ff2331,#96070f)", fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)" }}>{Math.round(t.sai_icms).toLocaleString("pt-BR")}</div>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: "#a3adde", marginTop: 10 }}>
                    {t.sai_icms >= t.ent_icms
                      ? <>Saiu <b style={{ color: "#ff8f96" }}>{brl(k.icms_a_recolher)}</b> mais imposto do que entrou. É o que a empresa recolhe.</>
                      : <>Entrou <b style={{ color: "#aab6ff" }}>{brl(Math.abs(k.icms_a_recolher))}</b> mais imposto do que saiu — saldo credor.</>}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <MiniInsight titulo="ECONOMIA COM REDUÇÃO DE BASE" valor={brl(ins.economia_reducao_base)} sub="Imposto que a redução de base evitou" cor="azul" />
                  <MiniInsight titulo="FRETE NA ENTRADA" valor={mi(ins.frete_entrada_valor)} sub={`${pct(ins.frete_entrada_pct_icms, 1)} do ICMS de entrada`} cor="vermelho" />
                  <MiniInsight titulo="PERDAS E DEVOLUÇÕES" valor={brl(ins.perda_devolucao_valor)} sub={`${pct(ins.devolucao_cliente_pct_saida, 1)} devolução · ${pct(ins.perda_pct_saida, 1)} perda`} cor="vermelho" />
                  <MiniInsight titulo="MARKUP APARENTE" valor={(ins.markup_aparente >= 0 ? "+" : "") + pct(ins.markup_aparente, 1)} sub="Venda líquida sobre compra líquida" cor="azul" />
                </div>

                <div style={{ borderRadius: 14, padding: "14px 16px", background: "linear-gradient(170deg,rgba(24,34,110,.42),rgba(6,10,32,.6))", border: "1px solid rgba(130,148,255,.2)", boxShadow: "0 18px 40px rgba(0,0,0,.42)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, fontStyle: "italic", letterSpacing: "-.02em" }}>Onde está o descasamento</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    <BarraDescasamento label="7% ent." valor={ins.faixa7_pct_entrada} cor="#3546e0,#1a2493" corTexto="#aab6ff" />
                    <BarraDescasamento label="7% saí." valor={ins.faixa7_pct_saida} cor="#ff2331,#a10810" corTexto="#ff8f96" />
                    <BarraDescasamento label="17% saí." valor={ins.faixa17_pct_saida} cor="#ff2331,#a10810" corTexto="#ff8f96" opacidade={0.72} />
                    <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "#9aa5d8", marginTop: 2 }}>
                      Pela carga efetiva a empresa compra a {pct(k.icms_efetivo_entrada)} e vende a {pct(k.icms_efetivo_saida)}.
                      A folga real é de <b style={{ color: "#e9ecfb" }}>{pct(k.icms_efetivo_saida - k.icms_efetivo_entrada)} p.p.</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* quanto a lube paga */}
            <div style={{ borderRadius: 16, padding: "16px 18px", background: "linear-gradient(170deg,rgba(24,34,110,.42),rgba(6,10,32,.62))", border: "1px solid rgba(130,148,255,.22)", boxShadow: "0 22px 50px rgba(0,0,0,.45)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, marginBottom: 13, flexWrap: "wrap" }}>
                <div style={{ fontSize: 16, fontWeight: 900, fontStyle: "italic", letterSpacing: "-.025em" }}>Quanto a Lube paga de ICMS</div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".14em", color: "#7d8ad0" }}>DO QUE ENTROU E DO QUE SAIU, O QUE SOBRA PARA O ESTADO</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
                <div style={{ borderRadius: 12, padding: "14px 16px", background: "linear-gradient(160deg,rgba(43,58,214,.3),rgba(19,28,110,.14))", border: "1px solid rgba(120,140,255,.28)" }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".15em", color: "#8b97dd" }}>1 · ENTRADA · O QUE COMPREI</div>
                  <div style={{ fontFamily: MONO, fontSize: 27, fontWeight: 700, color: "#fff", marginTop: 5 }}>{mi(t.ent_valor)}</div>
                  <LinhaKV label="ICMS que veio nas notas" valor={brl(t.ent_icms)} cor="#aab6ff" borda />
                  <LinhaKV label="Carga sobre a compra" valor={pct(k.icms_efetivo_entrada)} cor="#aab6ff" />
                  <div style={{ fontSize: 11.5, lineHeight: 1.45, color: "#8f9ad0", marginTop: 9 }}>Esse imposto a Lube não paga de novo — abate do que deve.</div>
                </div>

                <div style={{ borderRadius: 12, padding: "14px 16px", background: "linear-gradient(160deg,rgba(249,10,25,.26),rgba(120,6,14,.12))", border: "1px solid rgba(255,110,120,.3)" }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".15em", color: "#f0a3a8" }}>2 · SAÍDA · O QUE VENDI</div>
                  <div style={{ fontFamily: MONO, fontSize: 27, fontWeight: 700, color: "#fff", marginTop: 5 }}>{mi(t.sai_valor)}</div>
                  <LinhaKV label="ICMS que saiu nas notas" valor={brl(t.sai_icms)} cor="#ff8f96" borda corLabel="#dcb6ba" />
                  <LinhaKV label="Carga sobre a venda" valor={pct(k.icms_efetivo_saida)} cor="#ff8f96" corLabel="#dcb6ba" />
                  <div style={{ fontSize: 11.5, lineHeight: 1.45, color: "#c39aa0", marginTop: 9 }}>Já com a redução do ES aplicada.</div>
                </div>

                <div style={{ position: "relative", overflow: "hidden", borderRadius: 12, padding: "14px 16px", background: "linear-gradient(155deg,#f90a19 0%,#a20812 60%,#5c060d 100%)", boxShadow: "0 20px 44px rgba(150,8,18,.4),inset 0 1px 0 rgba(255,255,255,.3)" }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".15em", color: "rgba(255,255,255,.85)" }}>3 · O QUE EU PAGO</div>
                  <div style={{ fontFamily: MONO, fontSize: 31, fontWeight: 700, color: "#fff", marginTop: 5 }}>{brl(k.icms_a_recolher)}</div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,.82)", marginTop: 6 }}>
                    {Math.round(t.sai_icms).toLocaleString("pt-BR")} − {Math.round(t.ent_icms).toLocaleString("pt-BR")}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginTop: 11, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,.28)" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,.88)" }}>Sobre o faturamento</span>
                    <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: "#fff" }}>{pct(k.saldo_sobre_faturamento)}</span>
                  </div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.45, color: "rgba(255,255,255,.85)", marginTop: 9 }}>
                    De cada R$ 100 vendidos, R$ {k.por_100_vendidos.toFixed(2).replace(".", ",")} vai ao estado.
                  </div>
                </div>

                <div style={{ borderRadius: 12, padding: "14px 16px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(140,155,255,.22)" }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".15em", color: "#8b97dd" }}>4 · O QUE SAI DO CAIXA</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 12px", marginTop: 9, fontSize: 12, color: "#a3adde", alignItems: "baseline" }}>
                    <span>ICMS próprio</span><span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "#e9ecfb" }}>{brl(k.icms_a_recolher)}</span>
                    <span>ICMS-ST retido do cliente</span><span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "#e9ecfb" }}>{brl(t.st)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginTop: 10, paddingTop: 9, borderTop: "1px solid rgba(140,160,255,.24)" }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".14em", color: "#8b97dd" }}>SAI DO CAIXA</span>
                    <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, color: "#fff" }}>{brl(k.desembolso)}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 11 }}>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: "#aab6ff" }}>{pct(k.peso_st_desembolso, 1)}</div>
                      <div style={{ fontSize: 11, lineHeight: 1.4, color: "#8f9ad0", marginTop: 2 }}>Peso da ST no desembolso</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: "#ff8f96" }}>R$ {ins.desembolso_por_100_vendidos.toFixed(2).replace(".", ",")}</div>
                      <div style={{ fontSize: 11, lineHeight: 1.4, color: "#8f9ad0", marginTop: 2 }}>A cada R$ 100 vendidos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid rgba(140,155,255,.16)", fontFamily: MONO, fontSize: 9, letterSpacing: ".13em", color: "#6b77b4" }}>
              <span>ORIGEM · COLUNA VLICMS DOS LIVROS 8086 (ENTRADA) E 8087 (SAÍDA) · ICMS-ST DA COLUNA VLST</span>
              <span>SAÍDA CLASSIFICADA PELA CARGA EFETIVA</span>
              <span>LEITURA GERENCIAL · NÃO CONSIDERA SALDO CREDOR ANTERIOR NEM AJUSTES LANÇADOS DIRETO NO LIVRO</span>
            </div>
          </>
        )}
      </div>

      {/* barra inferior */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, borderTop: "1px solid rgba(140,155,255,.28)", background: "rgba(5,8,24,.97)", padding: "10px 18px", fontSize: 11, backdropFilter: "blur(8px)", fontFamily: MONO }}>
        <span style={{ letterSpacing: ".14em", color: "#7d8ad0" }}>PERÍODO</span>
        <input type="date" value={ini} onChange={(e) => setIni(e.target.value)} style={{ borderRadius: 6, border: "1px solid rgba(130,148,255,.3)", background: "rgba(255,255,255,.06)", color: "#e9ecfb", padding: "6px 9px", font: "inherit" }} />
        <span style={{ color: "#6b77b4" }}>até</span>
        <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} style={{ borderRadius: 6, border: "1px solid rgba(130,148,255,.3)", background: "rgba(255,255,255,.06)", color: "#e9ecfb", padding: "6px 9px", font: "inherit" }} />
        <button onClick={atualizar} disabled={atualizando} style={{ borderRadius: 7, border: "1px solid rgba(255,255,255,.35)", background: "linear-gradient(180deg,#3546e0,#1a2493)", color: "#fff", padding: "7px 18px", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", font: "inherit", cursor: "pointer", opacity: atualizando ? 0.55 : 1 }}>
          {atualizando ? "Atualizando..." : "Atualizar"}
        </button>
        {status && <span style={{ color: erroStatus ? "#ff8f96" : "#aab6ff" }}>{status}</span>}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, color: "#6b77b4" }}>
          {user.email}
          <button onClick={sair} style={{ background: "none", border: "none", color: "#6b77b4", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>sair</button>
        </span>
      </div>
    </div>
  );
}

function MiniPill({ label, valor, tom }: { label: string; valor: string; tom?: "azul" | "vermelho" }) {
  const bg = tom === "vermelho" ? "linear-gradient(160deg,rgba(249,10,25,.28),rgba(120,6,14,.16))" : tom === "azul" ? "linear-gradient(160deg,rgba(43,58,214,.34),rgba(19,28,110,.18))" : "rgba(255,255,255,.05)";
  const border = tom === "vermelho" ? "1px solid rgba(255,110,120,.32)" : tom === "azul" ? "1px solid rgba(120,140,255,.3)" : "1px solid rgba(140,155,255,.2)";
  const corLabel = tom === "vermelho" ? "#f0a3a8" : "#8b97dd";
  const corValor = tom === "vermelho" ? "#ff8f96" : tom === "azul" ? "#aab6ff" : "#fff";
  return (
    <div style={{ padding: "9px 16px", borderRadius: 8, background: bg, border, boxShadow: "inset 0 1px 0 rgba(255,255,255,.14)" }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".16em", color: corLabel }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: corValor, marginTop: 2 }}>{valor}</div>
    </div>
  );
}

function CardGrande({ titulo, valor, sub, cor, corTexto }: { titulo: string; valor: string; sub: React.ReactNode; cor?: "azul" | "vermelho"; corTexto?: string }) {
  if (cor === "vermelho") {
    return (
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 14, padding: "16px 18px 15px", background: "linear-gradient(155deg,#f90a19 0%,#a20812 58%,#5c060d 100%)", boxShadow: "0 22px 46px rgba(150,8,18,.42),inset 0 1px 0 rgba(255,255,255,.3)" }}>
        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".17em", color: "rgba(255,255,255,.82)" }}>{titulo}</div>
        <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, letterSpacing: "-.03em", marginTop: 6, color: "#fff" }}>{valor}</div>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,.86)", marginTop: 6 }}>{sub}</div>
      </div>
    );
  }
  if (cor === "azul") {
    return (
      <div style={{ borderRadius: 14, padding: "16px 18px 15px", background: "linear-gradient(155deg,#2b3ad6 0%,#151f7d 58%,#0b1046 100%)", boxShadow: "0 22px 46px rgba(18,28,120,.5),inset 0 1px 0 rgba(255,255,255,.26)" }}>
        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".17em", color: "rgba(200,210,255,.9)" }}>{titulo}</div>
        <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, letterSpacing: "-.03em", marginTop: 6, color: "#fff" }}>{valor}</div>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(210,218,255,.85)", marginTop: 6 }}>{sub}</div>
      </div>
    );
  }
  const borderCor = corTexto === "#ff8f96" ? "rgba(255,140,150,.26)" : "rgba(140,160,255,.28)";
  return (
    <div style={{ borderRadius: 14, padding: "16px 18px 15px", background: "linear-gradient(155deg,rgba(255,255,255,.09),rgba(255,255,255,.03))", border: `1px solid ${borderCor}`, boxShadow: "0 18px 40px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.14)" }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".17em", color: corTexto === "#ff8f96" ? "#f0a3a8" : "#8b97dd" }}>{titulo}</div>
      <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, letterSpacing: "-.03em", marginTop: 6, color: corTexto }}>{valor}</div>
      <div style={{ fontSize: 12, lineHeight: 1.45, color: "#a3adde", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function MiniInsight({ titulo, valor, sub, cor }: { titulo: string; valor: string; sub: string; cor: "azul" | "vermelho" }) {
  const corLabel = cor === "vermelho" ? "#f0a3a8" : "#8b97dd";
  const corValor = cor === "vermelho" ? "#ff8f96" : "#aab6ff";
  const border = cor === "vermelho" ? "rgba(255,140,150,.2)" : "rgba(130,148,255,.18)";
  return (
    <div style={{ borderRadius: 12, padding: "13px 14px", background: "rgba(255,255,255,.045)", border: `1px solid ${border}`, boxShadow: "0 12px 28px rgba(0,0,0,.35)" }}>
      <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: ".15em", color: corLabel }}>{titulo}</div>
      <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, color: corValor, marginTop: 5 }}>{valor}</div>
      <div style={{ fontSize: 11.5, lineHeight: 1.45, color: "#8f9ad0", marginTop: 5 }}>{sub}</div>
    </div>
  );
}

function BarraDescasamento({ label, valor, cor, corTexto, opacidade }: { label: string; valor: number; cor: string; corTexto: string; opacidade?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 58, fontFamily: MONO, fontSize: 11, color: corTexto }}>{label}</span>
      <span style={{ flex: 1, height: 13, borderRadius: 4, background: "rgba(255,255,255,.06)", display: "block" }}>
        <span style={{ display: "block", width: `${Math.max(valor, 0.5)}%`, height: 13, borderRadius: 4, background: `linear-gradient(90deg,${cor})`, opacity: opacidade ?? 1, boxShadow: opacidade ? undefined : "0 0 16px rgba(43,58,214,.55)" }} />
      </span>
      <span style={{ fontFamily: MONO, fontSize: 11, color: corTexto, width: 52, textAlign: "right" }}>{pct(valor, 1)}</span>
    </div>
  );
}

function LinhaKV({ label, valor, cor, corLabel, borda }: { label: string; valor: string; cor: string; corLabel?: string; borda?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginTop: borda ? 11 : 5, paddingTop: borda ? 9 : 0, borderTop: borda ? "1px solid rgba(140,160,255,.22)" : undefined }}>
      <span style={{ fontSize: 12, color: corLabel ?? "#a3adde" }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: cor }}>{valor}</span>
    </div>
  );
}
