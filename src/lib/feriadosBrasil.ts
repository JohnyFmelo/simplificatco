export type TipoFeriado =
  | "FERIADO_NACIONAL"
  | "FERIADO_MOVEL"
  | "FERIADO_ESTADUAL_MT"
  | "FERIADO_LOCAL"
  | "PONTO_FACULTATIVO"
  | "EMENDA";

export interface FeriadoVigente {
  data: string; // ISO date only (YYYY-MM-DD)
  nome: string;
  tipo: TipoFeriado;
  origem: "CALCULO_NACIONAL" | "CADASTRO_LOCAL";
  descricao?: string;
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ================================================================
// Fórmula de Gauss para Páscoa (válido p/ anos 1900-2099)
// ================================================================
const dataPascoa = (ano: number): Date => {
  const Y = ano;
  const a = Y % 19;
  const b = Math.floor(Y / 100);
  const c = Y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const mes = Math.floor((h + L - 7 * m + 114) / 31);
  const dia = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(Y, mes - 1, dia);
};

const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

// Feriados nacionais fixos (todos os anos)
const feriadosFixosNacionais = (ano: number): FeriadoVigente[] => [
  { data: `${ano}-01-01`, nome: "Ano Novo / Confraternização Universal", tipo: "FERIADO_NACIONAL", origem: "CALCULO_NACIONAL" },
  { data: `${ano}-04-21`, nome: "Tiradentes", tipo: "FERIADO_NACIONAL", origem: "CALCULO_NACIONAL" },
  { data: `${ano}-05-01`, nome: "Dia Mundial do Trabalho", tipo: "FERIADO_NACIONAL", origem: "CALCULO_NACIONAL" },
  { data: `${ano}-09-07`, nome: "Independência do Brasil", tipo: "FERIADO_NACIONAL", origem: "CALCULO_NACIONAL" },
  { data: `${ano}-10-12`, nome: "Nossa Senhora Aparecida", tipo: "FERIADO_NACIONAL", origem: "CALCULO_NACIONAL" },
  { data: `${ano}-11-02`, nome: "Finados", tipo: "FERIADO_NACIONAL", origem: "CALCULO_NACIONAL" },
  { data: `${ano}-11-15`, nome: "Proclamação da República", tipo: "FERIADO_NACIONAL", origem: "CALCULO_NACIONAL" },
  { data: `${ano}-12-25`, nome: "Natal", tipo: "FERIADO_NACIONAL", origem: "CALCULO_NACIONAL" },
];

// Feriados estaduais Mato Grosso (fixos por lei)
const feriadosEstaduaisMT = (ano: number): FeriadoVigente[] => [
  { data: `${ano}-03-14`, nome: "Aniversário de Mato Grosso (1748)", tipo: "FERIADO_ESTADUAL_MT", origem: "CALCULO_NACIONAL" },
  { data: `${ano}-08-06`, nome: "Dia da Nossa Senhora da Assunção — MT", tipo: "FERIADO_ESTADUAL_MT", origem: "CALCULO_NACIONAL" },
];

// Feriados MÓVEIS (baseados na Páscoa) — inclui Pontos Facultativos federais
const feriadosMoveis = (ano: number): FeriadoVigente[] => {
  const pascoa = dataPascoa(ano);
  const itens: FeriadoVigente[] = [
    { data: toISO(addDays(pascoa, -48)), nome: "4ª-feira de Cinzas (Ponto Facultativo até às 14h)", tipo: "PONTO_FACULTATIVO", origem: "CALCULO_NACIONAL", descricao: "Trabalho facultativo na 1ª metade do dia. O 2º CR considera o dia inteiro como sem audiência por padrão." },
    { data: toISO(addDays(pascoa, -2)), nome: "Sexta-feira Santa", tipo: "FERIADO_MOVEL", origem: "CALCULO_NACIONAL" },
    { data: toISO(pascoa), nome: "Páscoa", tipo: "FERIADO_MOVEL", origem: "CALCULO_NACIONAL" },
    { data: toISO(addDays(pascoa, 60)), nome: "Corpus Christi", tipo: "PONTO_FACULTATIVO", origem: "CALCULO_NACIONAL" },
    { data: toISO(addDays(pascoa, 59)), nome: "Véspera de Corpus Christi (Emenda facultativa)", tipo: "EMENDA", origem: "CALCULO_NACIONAL" },
    { data: `${ano}-12-24`, nome: "Véspera de Natal (Ponto Facultativo)", tipo: "PONTO_FACULTATIVO", origem: "CALCULO_NACIONAL" },
    { data: `${ano}-12-31`, nome: "Véspera de Ano Novo (Ponto Facultativo)", tipo: "PONTO_FACULTATIVO", origem: "CALCULO_NACIONAL" },
  ];
  // Emenda opcional: feriado fixo caiu terça -> segunda vira emenda; caiu quinta -> sexta vira emenda
  const base = [...feriadosFixosNacionais(ano), ...feriadosEstaduaisMT(ano)];
  for (const f of base) {
    const [aa, mm, dd] = f.data.split("-").map(Number);
    const d = new Date(aa, mm - 1, dd);
    const dw = d.getDay();
    if (dw === 2) {
      // Terça → Emenda (segunda)
      itens.push({
        data: toISO(addDays(d, -1)),
        nome: `Emenda de ${f.nome} (segunda-feira)`,
        tipo: "EMENDA",
        origem: "CALCULO_NACIONAL",
        descricao: "Emenda automática para feriado na terça — pode ser desativada por portaria.",
      });
    } else if (dw === 4) {
      // Quinta → Emenda (sexta)
      itens.push({
        data: toISO(addDays(d, 1)),
        nome: `Emenda de ${f.nome} (sexta-feira)`,
        tipo: "EMENDA",
        origem: "CALCULO_NACIONAL",
        descricao: "Emenda automática para feriado na quinta — pode ser desativada por portaria.",
      });
    }
  }
  return itens;
};

export const obterFeriadosIntervalo = (
  dtInicio: Date,
  dtFim: Date
): FeriadoVigente[] => {
  const m = new Map<string, FeriadoVigente>();
  const anoInicio = dtInicio.getFullYear();
  const anoFim = dtFim.getFullYear();
  for (let a = anoInicio; a <= anoFim; a++) {
    const lista = [
      ...feriadosFixosNacionais(a),
      ...feriadosEstaduaisMT(a),
      ...feriadosMoveis(a),
    ];
    for (const f of lista) {
      // Só inclui se estiver no intervalo pedido
      const [aa, mm, dd] = f.data.split("-").map(Number);
      const d = new Date(aa, mm - 1, dd);
      if (d.getTime() < dtInicio.getTime() || d.getTime() > dtFim.getTime()) continue;
      // Em caso de colisão: preferência p/ tipo mais "forte"
      const ordemForca: Record<TipoFeriado, number> = {
        FERIADO_NACIONAL: 6,
        FERIADO_MOVEL: 5,
        FERIADO_ESTADUAL_MT: 4,
        FERIADO_LOCAL: 3,
        PONTO_FACULTATIVO: 2,
        EMENDA: 1,
      };
      const ja = m.get(f.data);
      if (!ja || ordemForca[f.tipo] > ordemForca[ja.tipo]) m.set(f.data, f);
    }
  }
  return Array.from(m.values()).sort((a, b) => a.data.localeCompare(b.data));
};

export const isFimDeSemana = (iso: string) => {
  const [a, mm, dd] = iso.split("-").map(Number);
  const d = new Date(a, mm - 1, dd);
  const dw = d.getDay();
  return dw === 0 || dw === 6;
};
