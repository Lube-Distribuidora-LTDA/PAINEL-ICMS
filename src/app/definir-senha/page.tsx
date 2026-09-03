"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DefinirSenhaPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      setEmail(data.user.email ?? "");
      setPronto(true);
    });
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não são iguais.");
      return;
    }
    setCarregando(true);
    const supabase = createClient();

    const { error: erroSenha } = await supabase.auth.updateUser({ password: senha });
    if (erroSenha) {
      setCarregando(false);
      setErro(erroSenha.message);
      return;
    }

    const { error: erroMarca } = await supabase
      .from("usuarios_permitidos")
      .update({ senha_definida: true })
      .eq("email", email);

    setCarregando(false);
    if (erroMarca) {
      setErro("Senha salva, mas não consegui atualizar o cadastro: " + erroMarca.message);
      return;
    }
    window.location.href = "/";
  }

  if (!pronto) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050818] text-[#7d8ad0] text-sm">
        Carregando...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050818] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#2a3565] bg-[#0a0f2e] p-8 shadow-2xl">
        <h1 className="mb-1 text-center text-lg font-bold tracking-wide text-white">
          Defina sua senha
        </h1>
        <p className="mb-6 text-center text-xs leading-relaxed text-[#7d8ad0]">
          Primeiro acesso de <strong className="text-white">{email}</strong>.
          A partir de agora você entra com e-mail e senha, sem precisar do link.
        </p>
        <form onSubmit={salvar} className="flex flex-col gap-3">
          <input
            type="password"
            required
            placeholder="Nova senha (mín. 8 caracteres)"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="rounded-lg border border-[#2a3565] bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[#5a6494] focus:border-[#3546e0] focus:outline-none"
          />
          <input
            type="password"
            required
            placeholder="Confirme a senha"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="rounded-lg border border-[#2a3565] bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[#5a6494] focus:border-[#3546e0] focus:outline-none"
          />
          <button
            type="submit"
            disabled={carregando}
            className="rounded-lg bg-gradient-to-b from-[#3546e0] to-[#1a2493] px-4 py-2 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50"
          >
            {carregando ? "Salvando..." : "Salvar e entrar"}
          </button>
          {erro && <p className="text-xs text-[#ff8f96]">{erro}</p>}
        </form>
      </div>
    </main>
  );
}
