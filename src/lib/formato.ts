export function brl(v: number): string {
  return "R$ " + Math.round(v).toLocaleString("pt-BR");
}

export function mi(v: number): string {
  return "R$ " + (v / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " mi";
}

export function pct(v: number, casas = 2): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) + "%";
}

export function numero(v: number): string {
  return Math.round(v).toLocaleString("pt-BR");
}
