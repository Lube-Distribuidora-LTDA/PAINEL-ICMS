import type { Dados } from "./tipos";
import type { Datasets3D } from "@/components/Chart3D";

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

export function montarDatasets(dados: Dados): Datasets3D {
  const g = dados.grafico;
  const t = dados.totais;
  return {
    aliq: {
      axis: "FAIXA DE ALÍQUOTA REAL · VALOR DA OPERAÇÃO · SAÍDA CLASSIFICADA PELA CARGA EFETIVA",
      cats: g.cats,
      ent: g.aliq_valor.ent,
      sai: g.aliq_valor.sai,
    },
    icms: {
      axis: "FAIXA DE ALÍQUOTA REAL · ICMS GERADO · SAÍDA CLASSIFICADA PELA CARGA EFETIVA",
      cats: g.cats,
      ent: g.aliq_icms.ent,
      sai: g.aliq_icms.sai,
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
