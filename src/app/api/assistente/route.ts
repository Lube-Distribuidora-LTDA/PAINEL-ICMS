import { NextResponse } from "next/server";
import { PROMPT_SISTEMA } from "@/lib/assistenteSistema";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELO = "gemini-3.6-flash";

interface MensagemEntrada {
  papel: "user" | "model";
  texto: string;
}

export async function POST(request: Request) {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) {
    return NextResponse.json({ erro: "GEMINI_API_KEY não configurada no servidor." }, { status: 500 });
  }

  let mensagens: MensagemEntrada[];
  try {
    const body = await request.json();
    mensagens = body.mensagens;
    if (!Array.isArray(mensagens) || mensagens.length === 0) {
      throw new Error("mensagens vazio");
    }
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const contents = mensagens.map((m) => ({
    role: m.papel,
    parts: [{ text: m.texto }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${chave}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: PROMPT_SISTEMA }] },
        contents,
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.3 },
      }),
    });

    const dados = await resp.json();

    if (!resp.ok) {
      if (resp.status === 429) {
        return NextResponse.json(
          {
            erro:
              "A cota gratuita da IA (Google Gemini) foi atingida no momento. Aguarde alguns minutos e tente de novo. Se continuar acontecendo, é preciso checar o plano/limite da chave em ai.dev/rate-limits.",
          },
          { status: 429 }
        );
      }
      const msg = dados?.error?.message || "Erro desconhecido do Gemini.";
      return NextResponse.json({ erro: msg }, { status: resp.status });
    }

    const texto = dados?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
    if (!texto) {
      return NextResponse.json({ erro: "O assistente não retornou uma resposta. Tente de novo." }, { status: 502 });
    }

    return NextResponse.json({ texto });
  } catch (err) {
    return NextResponse.json({ erro: "Falha ao falar com o Gemini: " + String(err) }, { status: 502 });
  }
}
