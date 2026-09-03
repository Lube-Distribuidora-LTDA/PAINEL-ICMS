"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [modo, setModo] = useState<"senha" | "link">("senha");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrarComSenha(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      setErro("E-mail ou senha incorretos. Se é seu primeiro acesso, use a opção abaixo.");
      return;
    }
    window.location.href = "/";
  }

  async function pedirLink(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setEnviado(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050818] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#2a3565] bg-[#0a0f2e] p-8 shadow-2xl">
        <h1 className="mb-1 text-center text-lg font-bold tracking-wide text-white">
          Painel de ICMS
        </h1>
        <p className="mb-6 text-center text-xs tracking-widest text-[#7d8ad0]">
          LUBE DISTRIBUIDORA — FILIAL 1
        </p>

        {enviado ? (
          <p className="text-center text-sm leading-relaxed text-[#aab6ff]">
            Enviamos um link de acesso para <strong>{email}</strong>. Abra o
            e-mail e clique no link — na primeira vez, você vai definir uma
            senha para usar daqui pra frente.
          </p>
        ) : modo === "senha" ? (
          <form onSubmit={entrarComSenha} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="seu@lube.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[#2a3565] bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[#5a6494] focus:border-[#3546e0] focus:outline-none"
            />
            <input
              type="password"
              required
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="rounded-lg border border-[#2a3565] bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[#5a6494] focus:border-[#3546e0] focus:outline-none"
            />
            <button
              type="submit"
              disabled={carregando}
              className="rounded-lg bg-gradient-to-b from-[#3546e0] to-[#1a2493] px-4 py-2 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>
            {erro && <p className="text-xs text-[#ff8f96]">{erro}</p>}
            <button
              type="button"
              onClick={() => { setErro(""); setModo("link"); }}
              className="mt-1 text-center text-[11px] text-[#8f9dff] underline"
            >
              Primeiro acesso? Entrar por e-mail e criar senha
            </button>
          </form>
        ) : (
          <form onSubmit={pedirLink} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="seu@lube.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[#2a3565] bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[#5a6494] focus:border-[#3546e0] focus:outline-none"
            />
            <button
              type="submit"
              disabled={carregando}
              className="rounded-lg bg-gradient-to-b from-[#3546e0] to-[#1a2493] px-4 py-2 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              {carregando ? "Enviando..." : "Enviar link de acesso"}
            </button>
            {erro && <p className="text-xs text-[#ff8f96]">{erro}</p>}
            <button
              type="button"
              onClick={() => { setErro(""); setModo("senha"); }}
              className="mt-1 text-center text-[11px] text-[#8f9dff] underline"
            >
              Já tenho senha
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-[11px] text-[#5a6494]">
          Só e-mails autorizados da Lube conseguem entrar.
        </p>
      </div>
    </main>
  );
}
