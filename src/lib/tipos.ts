export interface Totais {
  ent_valor: number; ent_icms: number; ent_base: number;
  ent_isentas: number; ent_outras: number;
  sai_valor: number; sai_icms: number; sai_base: number;
  sai_isentas: number; sai_outras: number; st: number;
  sai_valor_reduzido: number; sai_icms_reduzido: number;
}

export interface Kpis {
  icms_efetivo_entrada: number; icms_efetivo_saida: number;
  icms_a_recolher: number; desembolso: number;
  saldo_sobre_faturamento: number; por_100_vendidos: number;
  peso_st_desembolso: number; lancamentos_entrada: number; lancamentos_saida: number;
}

export interface Insights {
  frete_entrada_valor: number; frete_entrada_pct_icms: number;
  economia_reducao_base: number;
  devolucao_cliente_valor: number; devolucao_cliente_pct_saida: number;
  perda_valor: number; perda_pct_saida: number; perda_devolucao_valor: number;
  markup_aparente: number; desembolso_por_100_vendidos: number;
  faixa7_pct_entrada: number; faixa7_pct_saida: number; faixa17_pct_saida: number;
}

export interface Grafico {
  cats: string[];
  aliq_valor: { ent: number[]; sai: number[] };
  aliq_icms: { ent: number[]; sai: number[] };
  uf: {
    ent: { cats: string[]; valores: number[] };
    sai: { cats: string[]; valores: number[] };
  };
}

export interface Dados {
  totais: Totais;
  kpis: Kpis;
  insights: Insights;
  grafico: Grafico;
  periodo?: { inicio: string; fim: string; atualizado_em: string };
}

export interface Periodo {
  id: string;
  inicio: string;
  fim: string;
  titulo: string;
  dados: Dados;
  atualizado_em: string;
  status: "ok" | "erro";
  erro_msg: string | null;
  planilha_path: string | null;
}

export interface Pedido {
  id: string;
  inicio: string;
  fim: string;
  solicitado_por: string;
  solicitado_em: string;
  status: "pendente" | "processando" | "concluido" | "erro";
  erro_msg: string | null;
}
