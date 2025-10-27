// WordTCO - ponto de entrada para geração de documentos DOCX do TCO
// Aqui adicionaremos utilitários e funções de montagem do arquivo .docx

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://duayymaipijodwuzsmbg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1YXl5bWFpcGlqb2R3dXpzbWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODUyNjUsImV4cCI6MjA3NzE2MTI2NX0.MkCye1nIrRlXFM-deePfEuOqPXUHTkgHBv8O1UJzhTI"
);

export type TcoDocData = {
  tcoNumber: string;
  natureza: string;
  dataFato?: string;
  autores?: Array<{ nome: string; rg?: string; }>
  // TODO: expandir com demais campos necessários
};

// Placeholder para futura implementação de geração DOCX
export async function buildTcoDocx(_data: TcoDocData): Promise<Blob> {
  // Em breve: usar biblioteca como `docx` para montar o documento
  const dummy = new Blob(["Documento TCO (DOCX) em construção"], { type: "application/octet-stream" });
  return dummy;
}

// Utilitário: abrevia unidade a partir do nome completo
export function abbreviateUnidade(unidade?: string): string {
  if (!unidade) return "***";
  const name = unidade.trim();
  const ordinalMatch = name.match(/^(\d+[ºª])/i);
  const ordinal = ordinalMatch ? ordinalMatch[1] : "";

  if (/Batalhão de Polícia Militar/i.test(name)) {
    return ordinal ? `${ordinal} BPM` : "BPM";
  }
  if (/Companhia Independente de Polícia Militar/i.test(name)) {
    const base = ordinal ? `${ordinal} CIPM` : "CIPM";
    return /Força Tática/i.test(name) ? `${base} FT` : base;
  }
  if (/Companhia de Polícia Militar/i.test(name)) {
    return ordinal ? `${ordinal} CPM` : "CPM";
  }
  if (/Núcleo de Polícia Militar/i.test(name)) {
    return "NPM";
  }
  // Fallback: mantém número + sufixo genérico PM se houver número
  return ordinal ? `${ordinal} PM` : name;
}

// Utilitário: abrevia CR
export function abbreviateCr(cr?: string): string {
  if (!cr) return "2º CR"; // padrão do projeto
  const ord = cr.match(/(\d+[ºª])/i)?.[1] || "2º";
  return `${ord} CR`;
}

// Gera e baixa uma página com cabeçalho padrão da PMMT em formato Word (.doc)
export function formatUnitFooterName(unidade?: string | null): string {
  if (!unidade) return "***";
  const name = unidade.trim();
  const ord = name.match(/^(\d+[ºª])/i)?.[1] || name.match(/(\d+[ºª])/i)?.[1] || "";
  if (/Batalh[aã]o de Pol[ií]cia Militar/i.test(name)) return `${ord} Batalhão de Polícia Militar`.trim();
  if (/Companhia Independente de Pol[ií]cia Militar/i.test(name)) return `${ord} Companhia Independente de Polícia Militar`.trim();
  if (/Companhia de Pol[ií]cia Militar/i.test(name)) return `${ord} Companhia de Polícia Militar`.trim();
  if (/N[úu]cleo de Pol[ií]cia Militar/i.test(name)) return `${ord} Núcleo de Polícia Militar`.trim();
  // fallback: retorna o próprio nome informado
  return name;
}

// Fallback local (hardcoded) para casos conhecidos
export function getUnitAddressLines(unidade?: string | null): string[] {
  const u = (unidade || "").toLowerCase();
  // Mapeamentos conhecidos
  if (/25\s*[ºª]?\s*bpm|25\s*[ºª]?\s*batalh[aã]o/i.test(u)) {
    return [
      "25º Batalhão de Polícia Militar",
      "Av. Dr. Paraná, s/nº complexo da Univag, ao lado do núcleo de Pratica Jurídica. Bairro Cristo Rei",
      "CEP 78.110-100, Várzea Grande - MT",
    ];
  }
  // Fallback genérico
  const full = formatUnitFooterName(unidade);
  return [full || "***", "Endereço não cadastrado", "Cidade - UF"];
}

// Busca endereço/contato da unidade no Supabase e retorna linhas do rodapé
async function getUnitAddressLinesFromDb(unidade?: string | null): Promise<string[] | null> {
  if (!unidade) return null;
  
  const fullName = formatUnitFooterName(unidade);
  const abbr = abbreviateUnidade(unidade);
  
  const buildLines = (u: any): string[] => {
    const nomeLinha = u?.nome_oficial || fullName || "***";
    
    // Monta endereço completo: logradouro, numero_endereco, complemento, bairro
    const partes: string[] = [];
    if (u?.logradouro) partes.push(u.logradouro);
    if (u?.numero_endereco) partes.push(u.numero_endereco);
    if (u?.complemento) partes.push(u.complemento);
    if (u?.bairro) partes.push(`Bairro ${u.bairro}`);
    
    const enderecoLinha = partes.length > 0 ? partes.join(", ") : "Endereço não cadastrado";
    
    // Terceira linha: CEP + Cidade - UF
    const cepParte = u?.cep ? `CEP ${u.cep}` : "";
    const cidadeUf = (u?.cidade && u?.uf) ? `${u.cidade} - ${u.uf}` : "";
    const terceiraLinha = [cepParte, cidadeUf].filter(Boolean).join(", ");
    
    return [nomeLinha, enderecoLinha, terceiraLinha || "Cidade - UF"];
  };

  try {
    // 1) Busca por abreviação exata
    const { data, error } = await supabase
      .from("unidades" as any)
      .select("nome_oficial, abreviacao, logradouro, numero_endereco, complemento, bairro, cidade, uf, cep")
      .eq("abreviacao", abbr)
      .limit(1);
    
    if (error) {
      console.error("Erro buscando por abreviação:", error);
    } else if (data && data.length > 0) {
      return buildLines(data[0]);
    }

    // 2) Busca por abreviação com LIKE
    const { data: dataLike, error: errLike } = await supabase
      .from("unidades" as any)
      .select("nome_oficial, abreviacao, logradouro, numero_endereco, complemento, bairro, cidade, uf, cep")
      .ilike("abreviacao", `${abbr}%`)
      .limit(1);
    
    if (errLike) {
      console.error("Erro buscando por abreviação LIKE:", errLike);
    } else if (dataLike && dataLike.length > 0) {
      return buildLines(dataLike[0]);
    }

    // 3) Busca por nome oficial
    const { data: dataName, error: errName } = await supabase
      .from("unidades" as any)
      .select("nome_oficial, abreviacao, logradouro, numero_endereco, complemento, bairro, cidade, uf, cep")
      .ilike("nome_oficial", `%${fullName}%`)
      .limit(1);
    
    if (errName) {
      console.error("Erro buscando por nome:", errName);
    } else if (dataName && dataName.length > 0) {
      return buildLines(dataName[0]);
    }

    return null;
  } catch (e) {
    console.error("Erro ao buscar unidade no Supabase:", e);
    return null;
  }
}

export async function downloadTcoDocx(unidade?: string | null, cr?: string | null) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, ImageRun } = await import('docx');

  const unidadeAbr = abbreviateUnidade(unidade);
  const crAbr = abbreviateCr(cr);
  const unidadeLinha = unidadeAbr || '***';
  const crParte = crAbr ? ` / ${crAbr}` : '';

  // carregar brasão do diretório public, opcional
  let imageParagraph: any = null;
  try {
    const imgResp = await fetch(encodeURI('/brasão.jpg'));
    if (imgResp.ok) {
      const imgArray = new Uint8Array(await imgResp.arrayBuffer());
      imageParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new ImageRun({ 
          data: imgArray, 
          transformation: { width: 80, height: 80 },
          type: 'jpg'
        })],
      });
    }
  } catch (_) {
    // falha silenciosa: sem brasão se não carregar
  }

  const headerChildren: any[] = [
    ...(imageParagraph ? [imageParagraph] : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: 'ESTADO DE MATO GROSSO', bold: true, font: 'Times New Roman', size: 24 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: 'POLÍCIA MILITAR', bold: true, font: 'Times New Roman', size: 24 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: `${unidadeLinha}${crParte}`, bold: true, font: 'Times New Roman', size: 24 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: '—'.repeat(52), font: 'Times New Roman', size: 20 })],
    }),
  ];

  // Rodapé com endereço dinâmico (fonte 10)
  const dbLines = await getUnitAddressLinesFromDb(unidade);
  const [addr1, addr2, addr3] = dbLines || getUnitAddressLines(unidade);

  // Travessões mais curtos e sem espaçamento extra; endereços sem espaço antes/depois
  const footerChildren: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: '—'.repeat(52), font: 'Times New Roman', size: 20 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: addr1, font: 'Times New Roman', size: 20 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: addr2, font: 'Times New Roman', size: 20 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: addr3, font: 'Times New Roman', size: 20 })],
    }),
  ];

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 24 }, paragraph: { spacing: { before: 0, after: 0 } } } }
    },
    sections: [
      {
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720, header: 240, footer: 360 } } },
        headers: { default: new Header({ children: headerChildren }) },
        footers: { default: new Footer({ children: footerChildren }) },
        children: [
          new Paragraph({ children: [new TextRun({ text: ' ', size: 24 })] })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'TCO-em-branco.docx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}