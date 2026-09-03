import type { Dados } from "./tipos";
import type { Datasets3D } from "@/components/Chart3D";

export type FiltroReducao = "todos" | "com" | "sem";

function montarUf(dados: Dados) {
  const e = dados.grafico.uf.ent;
  const s = dados.grafico.uf.sai;
  const cats = Array.from(new Set([...e.cats, ...s.cats]));
  // ordena pelo maior valor combinado, como o painel original (maior primeiro)
  cats.sort((a, b) => {
    const va = (e.valores[e.cats.indexOf(a)] || 0) + (s.valores[s.cats.indexOf(a)] || 0);
    const vb = (e.valores[e.cats.indexOf(b)] || 0) + (s.valores[s.cats.indexOf(b)] || 0);
    return vb - va;
  });
  return {
    axis: "UNIDADE FEDERATIVA · VALOR DA OPERAÇÃO",
    cats,
    ent: cats.map((c) => e.valores[e.cats.indexOf(c)] || 0),
    sai: cats.map((c) => s.valores[s.cats.indexOf(c)] || 0),
  };
}

function escolherPar(
  reducao: FiltroReducao,
  total: { ent: number[]; sai: number[] },
  comReducao?: { ent: number[]; sai: number[] },
  semReducao?: { ent: number[]; sai: number[] }
) {
  if (reducao === "com" && comReducao) return comReducao;
  if (reducao === "sem" && semReducao) return semReducao;
  return total;
}

export function montarDatasets(dados: Dados, reducao: FiltroReducao = "todos"): Datasets3D {
  const g = dados.grafico;
  const t = dados.totais;

  const aliqValor = escolherPar(reducao, g.aliq_valor, g.aliq_valor_com_reducao, g.aliq_valor_sem_reducao);
  const aliqIcms = escolherPar(reducao, g.aliq_icms, g.aliq_icms_com_reducao, g.aliq_icms_sem_reducao);
  const rotulo =
    reducao === "com" ? "SOMENTE LINHAS COM REDUÇÃO DE BASE (CST 20/70)"
      : reducao === "sem" ? "SOMENTE LINHAS SEM REDUÇÃO DE BASE"
        : "SAÍDA CLASSIFICADA PELA CARGA EFETIVA";

  return {
    aliq: {
      axis: `FAIXA DE ALÍQUOTA REAL · VALOR DA OPERAÇÃO · ${rotulo}`,
      cats: g.cats,
      ent: aliqValor.ent,
      sai: aliqValor.sai,
    },
    icms: {
      axis: `FAIXA DE ALÍQUOTA REAL · ICMS GERADO · ${rotulo}`,
      cats: g.cats,
      ent: aliqIcms.ent,
      sai: aliqIcms.sai,
    },
    uf: montarUf(dados),
    base: {
      axis: "COMPOSIÇÃO DO VALOR · TRIBUTADA, ISENTA, OUTRAS",
      cats: ["TRIBUTADA", "ISENTA / RED.", "OUTRAS"],
      ent: [t.ent_base, t.ent_isentas, t.ent_outras],
      sai: [t.sai_base, t.sai_isentas, t.sai_outras],
    },
  };
}
