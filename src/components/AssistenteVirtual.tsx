"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Mensagem {
  papel: "user" | "model";
  texto: string;
}

const SAUDACAO: Mensagem = {
  papel: "model",
  texto: "Oi! Sou o assistente do Painel de ICMS. Pode perguntar sobre os números, as regras fiscais ou como o sistema funciona por dentro.",
};

export default function AssistenteVirtual() {
  const [aberto, setAberto] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([SAUDACAO]);
  const [entrada, setEntrada] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [grande, setGrande] = useState(false);
  const fimRef = useRef<HTMLDivElement | null>(null);

  function fecharComAnimacao() {
    setFechando(true);
    setTimeout(() => {
      setAberto(false);
      setFechando(false);
    }, 240);
  }

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
    // janela cresce sozinha quando a resposta tem tabela ou é longa
    const ultima = mensagens[mensagens.length - 1];
    if (ultima?.papel === "model" && (ultima.texto.includes("|") || ultima.texto.length > 400)) {
      setGrande(true);
    }
  }, [mensagens]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const texto = entrada.trim();
    if (!texto || carregando) return;

    const novas = [...mensagens, { papel: "user" as const, texto }];
    setMensagens(novas);
    setEntrada("");
    setCarregando(true);

    try {
      const resp = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: novas }),
      });
      const dados = await resp.json();
      if (!resp.ok || dados.erro) {
        setMensagens((m) => [...m, { papel: "model", texto: "Não consegui responder agora: " + (dados.erro ?? "erro desconhecido") }]);
      } else {
        setMensagens((m) => [...m, { papel: "model", texto: dados.texto }]);
      }
    } catch (err) {
      setMensagens((m) => [...m, { papel: "model", texto: "Falha de conexão: " + String(err) }]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes respirar {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.045); }
        }
        @keyframes brilhar {
          0%, 100% { box-shadow: 0 8px 28px rgba(43,58,214,.55), 0 0 0 0 rgba(255,255,255,.25); }
          50% { box-shadow: 0 10px 34px rgba(43,58,214,.75), 0 0 0 8px rgba(255,255,255,0); }
        }
        .bolha-assistente { animation: respirar 3.2s ease-in-out infinite, brilhar 3.2s ease-in-out infinite; }
        .bolha-assistente:active { transform: scale(.92); }
        @keyframes abrirJanela {
          from { opacity: 0; transform: scale(.82) translateY(18px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fecharJanela {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(.82) translateY(18px); }
        }
        @keyframes surgirMensagem {
          from { opacity: 0; transform: translateY(8px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulsarPonto {
          0%, 60%, 100% { opacity: .3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
        .janela-assistente {
          transition: height .35s cubic-bezier(.2,.8,.2,1), width .35s cubic-bezier(.2,.8,.2,1);
          transform-origin: bottom right;
        }
        .janela-assistente.abrindo { animation: abrirJanela .32s cubic-bezier(.2,.8,.2,1) both; }
        .janela-assistente.fechando { animation: fecharJanela .24s cubic-bezier(.4,0,1,1) both; }
        .msg-linha { animation: surgirMensagem .28s cubic-bezier(.2,.8,.2,1) both; }
        .ponto-digitando { display: inline-block; width: 6px; height: 6px; margin: 0 2px; border-radius: 50%; background: #8f9dff; animation: pulsarPonto 1.1s ease-in-out infinite; }
        .msg-assistente p { margin: 0 0 8px; }
        .msg-assistente p:last-child { margin-bottom: 0; }
        .msg-assistente strong { color: #fff; }
        .msg-assistente table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 12px; }
        .msg-assistente th, .msg-assistente td { border: 1px solid rgba(140,155,255,.25); padding: 5px 8px; text-align: left; }
        .msg-assistente th { background: rgba(43,58,214,.25); }
        .msg-assistente ul, .msg-assistente ol { margin: 4px 0 8px 18px; padding: 0; }
        .msg-assistente a { color: #8f9dff; text-decoration: underline; }
        .msg-assistente code { background: rgba(255,255,255,.08); padding: 1px 5px; border-radius: 4px; font-size: 11px; }
      `}</style>

      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="bolha-assistente"
          style={{
            position: "fixed", right: 22, bottom: 22, zIndex: 100,
            width: 66, height: 66, borderRadius: "50%", border: "2px solid rgba(255,255,255,.4)",
            padding: 0, cursor: "pointer", overflow: "hidden", background: "#0a0f2e",
          }}
          aria-label="Abrir assistente virtual"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assistente-sergio.png" alt="Assistente virtual" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
        </button>
      )}

      {(aberto || fechando) && (
        <div
          className={`janela-assistente ${fechando ? "fechando" : "abrindo"}`}
          style={{
            position: "fixed", right: 22, bottom: 22, zIndex: 100,
            width: grande ? 440 : 360, height: grande ? 560 : 440,
            maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 32px)",
            background: "linear-gradient(170deg,#0d1340,#050818)",
            border: "1px solid rgba(130,148,255,.28)", borderRadius: 16,
            boxShadow: "0 30px 70px rgba(0,0,0,.6)", display: "flex", flexDirection: "column", overflow: "hidden",
            fontFamily: "var(--font-archivo),'Helvetica Neue',Arial,sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid rgba(130,148,255,.2)" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,.3)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assistente-sergio.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Assistente do Painel</div>
              <div style={{ fontSize: 10, color: "#7d8ad0", letterSpacing: ".06em" }}>ICMS · LUBE DISTRIBUIDORA</div>
            </div>
            <button onClick={fecharComAnimacao} style={{ background: "none", border: "none", color: "#7d8ad0", fontSize: 18, cursor: "pointer", padding: 4 }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {mensagens.map((m, i) => (
              <div key={i} className="msg-linha" style={{ display: "flex", justifyContent: m.papel === "user" ? "flex-end" : "flex-start" }}>
                <div
                  className={m.papel === "model" ? "msg-assistente" : undefined}
                  style={{
                    maxWidth: "88%", padding: "9px 12px", borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                    background: m.papel === "user" ? "linear-gradient(180deg,#3546e0,#1a2493)" : "rgba(255,255,255,.06)",
                    color: "#e9ecfb", border: m.papel === "model" ? "1px solid rgba(130,148,255,.18)" : undefined,
                  }}
                >
                  {m.papel === "model" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.texto}</ReactMarkdown>
                  ) : (
                    m.texto
                  )}
                </div>
              </div>
            ))}
            {carregando && (
              <div className="msg-linha" style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.06)", border: "1px solid rgba(130,148,255,.18)" }}>
                  <span className="ponto-digitando" style={{ animationDelay: "0s" }} />
                  <span className="ponto-digitando" style={{ animationDelay: ".15s" }} />
                  <span className="ponto-digitando" style={{ animationDelay: ".3s" }} />
                </div>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          <form onSubmit={enviar} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid rgba(130,148,255,.2)" }}>
            <input
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Pergunte algo..."
              disabled={carregando}
              style={{ flex: 1, borderRadius: 8, border: "1px solid rgba(130,148,255,.3)", background: "rgba(255,255,255,.06)", color: "#e9ecfb", padding: "8px 10px", fontSize: 13, outline: "none" }}
            />
            <button
              type="submit"
              disabled={carregando || !entrada.trim()}
              style={{ borderRadius: 8, border: "none", background: "linear-gradient(180deg,#3546e0,#1a2493)", color: "#fff", padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: carregando || !entrada.trim() ? 0.5 : 1 }}
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
