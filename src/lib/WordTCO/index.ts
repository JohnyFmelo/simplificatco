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

// Utilitários para texto por extenso em PT-BR
function numeroAte99PorExtenso(n: number): string {
  const UNIDADES = [
    "ZERO","UM","DOIS","TRÊS","QUATRO","CINCO","SEIS","SETE","OITO","NOVE",
    "DEZ","ONZE","DOZE","TREZE","QUATORZE","QUINZE","DEZESSEIS","DEZESSETE","DEZOITO","DEZENOVE"
  ];
  const DEZENAS = ["","","VINTE","TRINTA","QUARENTA","CINQUENTA","SESSENTA","SETENTA","OITENTA","NOVENTA"];
  if (n < 20) return UNIDADES[n];
  const dezenas = Math.floor(n / 10);
  const unidades = n % 10;
  if (unidades === 0) return DEZENAS[dezenas];
  return `${DEZENAS[dezenas]} E ${UNIDADES[unidades]}`;
}

function numeroAte999PorExtenso(n: number): string {
  if (n === 0) return "";
  if (n < 100) return numeroAte99PorExtenso(n);
  const CENTENAS = [
    "", "CENTO", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"
  ];
  if (n === 100) return "CEM";
  const centenas = Math.floor(n / 100);
  const resto = n % 100;
  if (resto === 0) return CENTENAS[centenas];
  return `${CENTENAS[centenas]} E ${numeroAte99PorExtenso(resto)}`;
}

function anoPorExtenso(ano: number): string {
  if (ano < 1000 || ano > 9999) return `${ano}`;
  const milhares = Math.floor(ano / 1000);
  const resto = ano % 1000;
  const prefixoMil = milhares === 1 ? "MIL" : `${numeroAte99PorExtenso(milhares)} MIL`;
  if (resto === 0) return prefixoMil;
  // uso de "E" entre milhar e resto
  return `${prefixoMil} E ${numeroAte999PorExtenso(resto)}`;
}

function obterDataCuiaba(): { dia: number; mes: number; ano: number } {
  // Constrói uma Date no fuso de Cuiabá via toLocaleString
  const nowStr = new Date().toLocaleString('en-US', { timeZone: 'America/Cuiaba' });
  const now = new Date(nowStr);
  return { dia: now.getDate(), mes: now.getMonth() + 1, ano: now.getFullYear() };
}

function mesPorExtenso(mes: number): string {
  const MESES = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
  return MESES[(mes - 1) % 12];
}

function extrairCidadeDoMunicipio(municipio?: string | null): string {
  if (!municipio) return "";
  
  const municipioUpper = municipio.toUpperCase().trim();
  
  // Se contém "DISTRITO DE", extrair o nome do distrito
  if (municipioUpper.includes("DISTRITO DE")) {
    const partes = municipioUpper.split("DISTRITO DE");
    if (partes.length > 1) {
      // Pega a parte após "DISTRITO DE" e remove possíveis separadores
      const distrito = partes[1].trim().split('-')[0].trim();
      return distrito || municipioUpper.split('-')[0].trim();
    }
  }
  
  // Se contém hífen, pega a primeira parte (cidade principal)
  if (municipioUpper.includes('-')) {
    return municipioUpper.split('-')[0].trim();
  }
  
  // Caso padrão: retorna o município como está
  return municipioUpper;
}

// Converte 'YYYY-MM-DD' para 'DD/MM/YYYY' se aplicável
function formatDateBR(s?: string | null): string {
  const str = (s || '').trim();
  if (!str) return '';
  const mIso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mIso) return `${mIso[3]}/${mIso[2]}/${mIso[1]}`;
  // Se já vier em DD/MM/YYYY, mantém
  const mBr = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mBr) return str;
  return str; // fallback: retorna como informado
}

export async function downloadTcoDocx(opts: {
  unidade?: string | null;
  cr?: string | null;
  tcoNumber?: string;
  natureza?: string;
  autoresNomes?: string[];
  // Campos de HISTÓRICO
  relatoPolicial?: string;
  conclusaoPolicial?: string;
  providencias?: string;
  documentosAnexos?: string;
  guarnicaoLista?: Array<{ nome: string; posto: string; rg: string }>;
  autoresDetalhados?: Array<{ nome: string; relato?: string }>;
  condutor?: { nome: string; posto: string; rg: string; pai?: string; mae?: string; naturalidade?: string; cpf?: string; telefone?: string; nome_completo?: string; graduacao?: string; rgpm?: string; nome_pai?: string; nome_mae?: string; } | undefined;
  localRegistro?: string;
  municipio?: string;
  tipificacao?: string;
  dataFato?: string;
  horaFato?: string;
  dataInicioRegistro?: string;
  horaInicioRegistro?: string;
  dataTerminoRegistro?: string;
  horaTerminoRegistro?: string;
  localFato?: string;
  endereco?: string;
  comunicante?: string;
  testemunhas?: Array<{ nome: string; sexo: string; estadoCivil: string; profissao: string; endereco: string; dataNascimento: string; naturalidade: string; filiacaoMae: string; filiacaoPai: string; rg: string; cpf: string; celular: string; email: string; semCpf?: string; }>;
  vitimas?: Array<{ nome: string; sexo: string; estadoCivil: string; profissao: string; endereco: string; dataNascimento: string; naturalidade: string; filiacaoMae: string; filiacaoPai: string; rg: string; cpf: string; celular: string; email: string; semCpf?: string; relato?: string; representacao?: string; }>;
  // URLs públicas de imagens anexadas (opcional)
  imageUrls?: string[];
  // Audiência (nova página Termo de Compromisso)
  audienciaData?: string;
  audienciaHora?: string;
  // Apreensões (texto livre) e dados específicos de drogas
  apreensoes?: string;
  drogas?: Array<{ id: string; quantidade: string; substancia: string; cor: string; odor: string; indicios: string; isUnknownMaterial?: boolean; customMaterialDesc?: string; }>;
  lacreNumero?: string;
  numeroRequisicao?: string;
  periciasLesao?: string[];
}) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, ImageRun, PageBreak, BorderStyle, convertMillimetersToTwip, Table, TableRow, TableCell, WidthType } = await import('docx');

  const { unidade, cr, tcoNumber, natureza, autoresNomes, relatoPolicial, conclusaoPolicial, autoresDetalhados, condutor, localRegistro, municipio, tipificacao, dataFato, horaFato, dataInicioRegistro, horaInicioRegistro, dataTerminoRegistro, horaTerminoRegistro, localFato, endereco, comunicante, testemunhas, vitimas, audienciaData, audienciaHora, apreensoes, drogas, lacreNumero, numeroRequisicao } = opts;

  // Buscar dados da unidade no banco de dados
  let unidadeAbr = '***';
  let crAbr = '2º CR';
  
  if (unidade) {
    try {
      const fullName = formatUnitFooterName(unidade);
      const abbr = abbreviateUnidade(unidade);
      
      // Tenta buscar por abreviação exata
      let { data, error } = await supabase
        .from("unidades" as any)
        .select("abreviacao, cr")
        .eq("abreviacao", abbr)
        .limit(1);
      
      if (error || !data || data.length === 0) {
        // Tenta buscar por abreviação com LIKE
        const result = await supabase
          .from("unidades" as any)
          .select("abreviacao, cr")
          .ilike("abreviacao", `${abbr}%`)
          .limit(1);
        data = result.data;
        error = result.error;
      }
      
      if (error || !data || data.length === 0) {
        // Tenta buscar por nome oficial
        const result = await supabase
          .from("unidades" as any)
          .select("abreviacao, cr")
          .ilike("nome_oficial", `%${fullName}%`)
          .limit(1);
        data = result.data;
        error = result.error;
      }
      
      if (!error && data && data.length > 0) {
        unidadeAbr = data[0].abreviacao || abbr;
        crAbr = data[0].cr || crAbr;
      } else {
        // Fallback para valores calculados
        unidadeAbr = abbr;
        if (cr) crAbr = abbreviateCr(cr);
      }
    } catch (e) {
      console.error("Erro ao buscar unidade:", e);
      unidadeAbr = abbreviateUnidade(unidade);
      if (cr) crAbr = abbreviateCr(cr);
    }
  }
  
  const unidadeLinha = unidadeAbr || '***';
  const crParte = crAbr ? ` / ${crAbr}` : '';

  // carregar brasão do diretório public, opcional (lida com acento e extensão)
  let imageParagraph: any = null;
  const logoCandidates = [
    '/Brasão.png', '/Bras%C3%A3o.png', '/brasao.png', '/Brasao.png',
    '/Brasão.jpg', '/Bras%C3%A3o.jpg', '/brasao.jpg', '/Brasao.jpg',
    '/Brasão', '/Bras%C3%A3o', '/brasao', '/Brasao'
  ];
  for (const url of logoCandidates) {
    try {
      const resp = await fetch(encodeURI(url));
      if (!resp.ok) continue;
      const bytes = new Uint8Array(await resp.arrayBuffer());
      const ct = (resp.headers.get('Content-Type') || '').toLowerCase();
      const isPng = ct.includes('png') || url.toLowerCase().endsWith('.png');
      const isJpeg = ct.includes('jpeg') || ct.includes('jpg') || url.toLowerCase().endsWith('.jpg');
      const imgType = isPng ? 'png' : 'jpg';
      imageParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new ImageRun({ 
          data: bytes, 
          transformation: { width: 80, height: 80 },
          type: imgType
        })],
      });
      break;
    } catch { /* tenta próximo candidato */ }
  }

  // ===== Corpo da página: AUTUAÇÃO =====
  const { dia, mes, ano } = obterDataCuiaba();
  const diaExtenso = numeroAte99PorExtenso(dia);
  const mesExtenso = mesPorExtenso(mes);
  const anoExtenso = anoPorExtenso(ano);
  const cidade = extrairCidadeDoMunicipio(municipio);

  const crSemEspaco = (crAbr || '').replace(/\s+/g, '');
  const numeroDisplay = `${(tcoNumber || '').trim()}.${crSemEspaco}.${ano}`;
  const numeroRefDisplay = `${(tcoNumber || '').trim()}/${(crAbr || '').trim()}/${ano}`;

  // Cabeçalho para primeira página (sem linha REF)
  const firstPageHeaderChildren: any[] = [
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
      children: [new TextRun({ text: '—'.repeat(48), font: 'Times New Roman', size: 20 })],
    }),
  ];

  // Cabeçalho para páginas subsequentes (com linha REF)
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
      children: [new TextRun({ text: '—'.repeat(48), font: 'Times New Roman', size: 20 })],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 120 },
      children: [new TextRun({ text: `REF.: TERMO CIRCUNSTANCIADO DE OCORRÊNCIA Nº ${numeroRefDisplay}`, font: 'Times New Roman', size: 20 })]
    }),
  ];

  // Rodapé com endereço dinâmico (fonte 10)
  const dbLines = await getUnitAddressLinesFromDb(unidade);
  const [addr1, addr2, addr3] = dbLines || getUnitAddressLines(unidade);

  const footerChildren: any[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [new TextRun({ text: '—'.repeat(48), font: 'Times New Roman', size: 20 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [new TextRun({ text: addr1, font: 'Times New Roman', size: 20 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [new TextRun({ text: addr2, font: 'Times New Roman', size: 20 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [new TextRun({ text: addr3, font: 'Times New Roman', size: 20 })] }),
  ];



  const autoresDisplay = (autoresNomes && autoresNomes.length > 0) ? autoresNomes.filter(Boolean).map(n => n.toUpperCase()).join(' + ') : "NÃO INFORMADO";
  const naturezaDisplay = (natureza || '').toUpperCase();
  const localRegistroDisplay = (localRegistro || '').toUpperCase();

  const corpoChildren: any[] = [
    // Título centralizado
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `TERMO CIRCUNSTANCIADO DE OCORRÊNCIA Nº ${numeroDisplay}`, bold: true }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),

    // Natureza
    new Paragraph({ children: [ new TextRun({ text: 'NATUREZA: ', bold: true }), new TextRun({ text: naturezaDisplay }) ] }),
    // Autor do fato
    new Paragraph({ children: [ new TextRun({ text: 'AUTOR DO FATO: ', bold: true }), new TextRun({ text: autoresDisplay }) ] }),

    // Espaços
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),

    // Título AUTUAÇÃO
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'AUTUAÇÃO', bold: true, size: 28 }) ] }), // 28 = 14pt * 2 (docx usa half-points)
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),

    // Parágrafo principal
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: {
        firstLine: 1417 // 2,5cm em twips (2.5 * 567 = 1417.5, arredondado para 1417)
      },
      children: [
        new TextRun({
          text: `AOS ${diaExtenso} DIAS DO MÊS DE ${mesExtenso} DO ANO DE ${anoExtenso}, NESTA CIDADE DE ${cidade}, ESTADO DE MATO GROSSO, NO ${localRegistroDisplay}, AUTUO AS PEÇAS QUE ADIANTE SE SEGUEM, DO QUE PARA CONSTAR, LAVREI E ASSINO ESTE TERMO.`,
        })
      ]
    }),

    // Espaços antes da assinatura
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
  ];

  // Bloco de assinatura do condutor
  if (condutor) {
    corpoChildren.push(
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: '—'.repeat(36) }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `${condutor.nome.toUpperCase()} - ${condutor.posto.toUpperCase()}`, bold: true }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `RG PMMT: ${condutor.rg}` }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'CONDUTOR DA OCORRÊNCIA' }) ] }),
    );
  } else {
    corpoChildren.push(
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'CONDUTOR NÃO CADASTRADO. VÁ EM GUARNIÇÃO E CADASTRE O CONDUTOR.', bold: true }) ] })
    );
  }

  // ===== Segunda página: DADOS GERAIS E IDENTIFICADORES =====
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const now = new Date();
  const nowDate = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
  const nowTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const toDisplay = (v?: string) => (v && v.trim().length > 0 ? v.toUpperCase() : 'Não informado');

  const inicioData = dataInicioRegistro && dataInicioRegistro.trim() ? dataInicioRegistro : nowDate;
  const inicioHora = horaInicioRegistro && horaInicioRegistro.trim() ? horaInicioRegistro : nowTime;
  // Término deve refletir o momento da geração do arquivo
  const terminoData = nowDate;
  const terminoHora = nowTime;

  const naturezaGeral = toDisplay(natureza);
  const tipificacaoGeral = toDisplay(tipificacao);
  const dataHoraFato = `${toDisplay(dataFato)} - ${toDisplay(horaFato)}`;
  const localFatoDisplay = toDisplay(localFato);
  const enderecoDisplay = toDisplay(endereco);
  const municipioDisplay = toDisplay(municipio);
  const comunicanteDisplay = toDisplay(comunicante);

  const segundaPaginaChildren: any[] = [
    new Paragraph({ children: [ new TextRun({ text: '1. DADOS GERAIS E IDENTIFICADORES DA OCORRÊNCIA', bold: true, size: 24 }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: 'NATUREZA DA OCORRÊNCIA: ' }), new TextRun({ text: naturezaGeral }) ] }),
    new Paragraph({ children: [ new TextRun({ text: 'TIPIFICAÇÃO LEGAL: ' }), new TextRun({ text: tipificacaoGeral }) ] }),
    new Paragraph({ children: [ new TextRun({ text: `DATA E HORA DO FATO: ${dataHoraFato}` }) ] }),
    new Paragraph({ children: [ new TextRun({ text: `DATA E HORA DO INÍCIO DO REGISTRO: ${inicioData} - ${inicioHora}` }) ] }),
    new Paragraph({ children: [ new TextRun({ text: `DATA E HORA DO TÉRMINO DO REGISTRO: ${terminoData} - ${terminoHora}` }) ] }),
    new Paragraph({ children: [ new TextRun({ text: `LOCAL DO FATO: ${localFatoDisplay}` }) ] }),
    new Paragraph({ children: [ new TextRun({ text: `ENDEREÇO: ${enderecoDisplay}` }) ] }),
    new Paragraph({ children: [ new TextRun({ text: `MUNICÍPIO: ${municipioDisplay}` }) ] }),
    new Paragraph({ children: [ new TextRun({ text: `COMUNICANTE: ${comunicanteDisplay}` }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: '2. PESSOAS ENVOLVIDAS', bold: true, size: 24 }) ] }),
+    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
  ];

  // ===== Seção de Autores =====
  if (autoresNomes && autoresNomes.length > 0) {
    autoresNomes.forEach((autor, index) => {
      if (autor && autor.trim()) {
        const numeroAutor = `2.${index + 1}`;
        segundaPaginaChildren.push(
          new Paragraph({ children: [ new TextRun({ text: `${numeroAutor} AUTOR ${autor.toUpperCase()}`, bold: true }) ] }),
          new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `NOME: ${toDisplay(autor)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `SEXO: ${toDisplay('')}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `ESTADO CIVIL: ${toDisplay('')}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `PROFISSÃO: ${toDisplay('')}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `ENDEREÇO: ${toDisplay('')}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `DATA DE NASCIMENTO: ${toDisplay('')}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `NATURALIDADE: ${toDisplay('')}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `FILIAÇÃO - MÃE: ${toDisplay('')}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `FILIAÇÃO - PAI: ${toDisplay('')}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `RG: ${toDisplay('')}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `CPF: ${toDisplay('')}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `CELULAR: ${toDisplay('')}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `E-MAIL: ${toDisplay('')}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        );
      }
    });
  }

  // ===== Seção de Vítimas ===== (antes das testemunhas)
  let proximoNumero = (autoresNomes && autoresNomes.length > 0) ? autoresNomes.length + 1 : 1;
  
  if (vitimas && vitimas.length > 0) {
    vitimas.forEach((vitima, index) => {
      const numeroVitima = `2.${proximoNumero + index}`;
      const nome = vitima?.nome?.trim();
      if (!nome) {
        segundaPaginaChildren.push(
          new Paragraph({ children: [ new TextRun({ text: `${numeroVitima} Vítima não informada`, bold: true }) ] }),
           new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        );
      } else {
        segundaPaginaChildren.push(
          new Paragraph({ children: [ new TextRun({ text: `${numeroVitima} VÍTIMA ${nome.toUpperCase()}`, bold: true }) ] }),
          new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `NOME: ${toDisplay(vitima.nome)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `SEXO: ${toDisplay(vitima.sexo)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `ESTADO CIVIL: ${toDisplay(vitima.estadoCivil)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `PROFISSÃO: ${toDisplay(vitima.profissao)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `ENDEREÇO: ${toDisplay(vitima.endereco)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `DATA DE NASCIMENTO: ${toDisplay(vitima.dataNascimento)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `NATURALIDADE: ${toDisplay(vitima.naturalidade)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `FILIAÇÃO - MÃE: ${toDisplay(vitima.filiacaoMae)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `FILIAÇÃO - PAI: ${toDisplay(vitima.filiacaoPai)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `RG: ${toDisplay(vitima.rg)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `${vitima.semCpf === 'true' ? 'Não possui CPF ' : ''}CPF: ${toDisplay(vitima.cpf)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `CELULAR: ${toDisplay(vitima.celular)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `E-MAIL: ${toDisplay(vitima.email)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        );
      }
    });
    proximoNumero += vitimas.length;
  }

  // ===== Seção de Testemunhas =====
  if (testemunhas && testemunhas.length > 0) {
    testemunhas.forEach((testemunha, index) => {
      const numeroTestemunha = `2.${proximoNumero + index}`;
      const nomeT = testemunha?.nome?.trim();
      if (!nomeT) {
        segundaPaginaChildren.push(
          new Paragraph({ children: [ new TextRun({ text: `${numeroTestemunha} Testemunha não informada`, bold: true }) ] }),
          new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        );
      } else {
        segundaPaginaChildren.push(
          new Paragraph({ children: [ new TextRun({ text: `${numeroTestemunha} TESTEMUNHA ${nomeT.toUpperCase()}`, bold: true }) ] }),
          new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
          
          new Paragraph({ children: [ new TextRun({ text: `NOME: ${toDisplay(testemunha.nome)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `SEXO: ${toDisplay(testemunha.sexo)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `ESTADO CIVIL: ${toDisplay(testemunha.estadoCivil)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `PROFISSÃO: ${toDisplay(testemunha.profissao)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `ENDEREÇO: ${toDisplay(testemunha.endereco)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `DATA DE NASCIMENTO: ${toDisplay(testemunha.dataNascimento)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `NATURALIDADE: ${toDisplay(testemunha.naturalidade)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `FILIAÇÃO - MÃE: ${toDisplay(testemunha.filiacaoMae)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `FILIAÇÃO - PAI: ${toDisplay(testemunha.filiacaoPai)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `RG: ${toDisplay(testemunha.rg)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `${testemunha.semCpf === 'true' ? 'Não possui CPF ' : ''}CPF: ${toDisplay(testemunha.cpf)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `CELULAR: ${toDisplay(testemunha.celular)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `E-MAIL: ${toDisplay(testemunha.email)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        );
      }
    });
    proximoNumero += testemunhas.length;
  }

  // ===== 3. HISTÓRICO =====
  segundaPaginaChildren.push(
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: '3. HISTÓRICO', bold: true, size: 24 }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
  );

  // 3.1 RELATO DO POLICIAL MILITAR
  const relatoPmTexto = (relatoPolicial && relatoPolicial.trim().length > 0) ? relatoPolicial.toUpperCase() : 'NÃO INFORMADO';
  segundaPaginaChildren.push(
    new Paragraph({ children: [ new TextRun({ text: '3.1 RELATO DO POLICIAL MILITAR', bold: true }) ] }),
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: relatoPmTexto }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
  );

  // 3.2 RELATO DO AUTOR DO FATO <NOME>
  if (autoresDetalhados && autoresDetalhados.length > 0) {
    autoresDetalhados.forEach((autor) => {
      const nomeA = (autor?.nome || '').trim();
      if (!nomeA) return;
      const textoA = (autor?.relato && autor.relato.trim().length > 0) ? autor.relato.toUpperCase() : 'NÃO INFORMADO';
      segundaPaginaChildren.push(
        new Paragraph({ children: [ new TextRun({ text: `3.2 RELATO DO AUTOR DO FATO ${nomeA.toUpperCase()}`, bold: true }) ] }),
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: textoA }) ] }),
        // Linhas de assinatura
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: '—'.repeat(36) }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `${nomeA.toUpperCase()}`, bold: true }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'AUTOR DO FATO' }) ] }),
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      );
    });
  }

  // 3.2 RELATO DA VÍTIMA <NOME>
  if (vitimas && vitimas.length > 0) {
    vitimas.forEach((vit) => {
      const nomeV = (vit?.nome || '').trim();
      if (!nomeV) return;
      const textoV = (vit?.relato && vit.relato.trim().length > 0) ? vit.relato.toUpperCase() : 'NÃO INFORMADO';
      segundaPaginaChildren.push(
        new Paragraph({ children: [ new TextRun({ text: `3.2 RELATO DA VÍTIMA ${nomeV.toUpperCase()}`, bold: true }) ] }),
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: textoV }) ] }),
        // Linhas de assinatura
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: '—'.repeat(36) }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `${nomeV.toUpperCase()}`, bold: true }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'VÍTIMA' }) ] }),
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      );
    });
  }

  // 3.3 CONCLUSÃO DO POLICIAL (extraída do campo histórico)
  const conclusaoTexto = (conclusaoPolicial && conclusaoPolicial.trim().length > 0) ? conclusaoPolicial.toUpperCase() : 'NÃO INFORMADO';
  segundaPaginaChildren.push(
    new Paragraph({ children: [ new TextRun({ text: '3.3 CONCLUSÃO DO POLICIAL', bold: true }) ] }),
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: conclusaoTexto }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
  );

  // ===== 4. PROVIDÊNCIAS =====
  const providenciasTexto = (opts.providencias && opts.providencias.trim().length > 0) ? opts.providencias.toUpperCase() : 'NÃO INFORMADO';
  segundaPaginaChildren.push(
    new Paragraph({ children: [ new TextRun({ text: '4. PROVIDÊNCIAS', bold: true, size: 24 }) ] }),
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: providenciasTexto }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
  );

  // ===== 5. ANEXOS =====
  const anexosTexto = (opts.documentosAnexos && opts.documentosAnexos.trim().length > 0) ? opts.documentosAnexos.toUpperCase() : 'NENHUM.';
  // Título principal com uma linha em branco após
  segundaPaginaChildren.push(
    new Paragraph({ children: [ new TextRun({ text: '5. ANEXOS', bold: true, size: 24 }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: '5.1 DOCUMENTOS JUNTADOS', bold: true }) ] }),
  );

  // Quebra os documentos juntados em linhas separadas (suporta \n e ponto-e-vírgula)
  const anexosLinhas = anexosTexto
    .split(/\r?\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (anexosLinhas.length === 0) {
    segundaPaginaChildren.push(new Paragraph({ alignment: AlignmentType.LEFT, children: [ new TextRun({ text: 'NENHUM.' }) ] }));
  } else {
    anexosLinhas.forEach((linha) => {
      segundaPaginaChildren.push(new Paragraph({ alignment: AlignmentType.LEFT, children: [ new TextRun({ text: linha }) ] }));
    });
  }
  // Espaço após 5.1 para não grudar com a próxima seção
  segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));

  // Inserção de imagens juntadas, se disponíveis
  if (opts.imageUrls && opts.imageUrls.length > 0) {
    segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
    segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: '5.2 IMAGENS', bold: true }) ] }));
    // Helper para obter dimensões naturais e manter proporção dentro de um box
    const getScaledDims = async (url: string): Promise<{ width: number; height: number } | null> => {
      const MAX_W = 420;
      const MAX_H = 280;
      try {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const nw = img.naturalWidth || img.width;
            const nh = img.naturalHeight || img.height;
            const scale = Math.min(MAX_W / nw, MAX_H / nh);
            const w = Math.max(1, Math.round(nw * scale));
            const h = Math.max(1, Math.round(nh * scale));
            (img as any).__dims = { width: w, height: h };
            resolve();
          };
          img.onerror = () => reject(new Error('Falha ao carregar imagem para medir dimensões'));
          img.src = url;
        });
        const dims = (globalThis as any).document?.images?.length ? undefined : undefined; // noop para bundlers
      } catch { /* ignore */ }
      // Carrega novamente para garantir obtencao; fallback para tamanho padrão
      try {
        const tmp = new Image();
        tmp.src = url;
        const nw = tmp.naturalWidth || tmp.width || 420;
        const nh = tmp.naturalHeight || tmp.height || 280;
        const scale = Math.min(420 / nw, 280 / nh);
        return { width: Math.max(1, Math.round(nw * scale)), height: Math.max(1, Math.round(nh * scale)) };
      } catch {
        return { width: 420, height: 280 };
      }
    };
    for (const url of opts.imageUrls) {
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const bytes = new Uint8Array(await resp.arrayBuffer());
          const dims = await getScaledDims(url);
          segundaPaginaChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [ new ImageRun({ 
                data: bytes, 
                transformation: { width: (dims?.width || 420), height: (dims?.height || 280) },
                type: "png"
              }) ]
            }),
            new Paragraph({ children: [ new TextRun({ text: ' ' }) ] })
          );
        }
      } catch (e) {
        // falha silenciosa por imagem específica
        console.warn('Falha ao anexar imagem ao DOCX:', e);
      }
    }
  }

  // ===== 7. REQUISIÇÃO DE EXAME DE LESÃO CORPORAL =====
  if (opts.periciasLesao && opts.periciasLesao.length > 0) {
    segundaPaginaChildren.push(new Paragraph({ children: [ new PageBreak() ] }));
    opts.periciasLesao.forEach((nome, idx) => {
      const titulo = `REQUISIÇÃO DE EXAME DE LESÃO CORPORAL`;
      const corpo = `REQUISITO EXAME DE CORPO DE DELITO EM FAVOR DE ${String(nome || '').toUpperCase()}, QUE SEJA SUBMETIDO AO EXAME PERICIAL, CONSIGNANDO-SE OS QUESITOS PERTINENTES.`;
      segundaPaginaChildren.push(
        new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: titulo, bold: true, size: 28 }) ] }),
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: corpo }) ] }),
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      );
    });
  }

  // ===== 6. IDENTIFICAÇÃO DA GUARNIÇÃO =====
  // Garantir separação visual da seção anterior
  segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
  segundaPaginaChildren.push(
    new Paragraph({ children: [ new TextRun({ text: '6. IDENTIFICAÇÃO DA GUARNIÇÃO', bold: true, size: 24 }) ] }),
  );
  if (opts.guarnicaoLista && opts.guarnicaoLista.length > 0) {
    opts.guarnicaoLista.forEach((g) => {
      const nome = (g?.nome || '').trim().toUpperCase() || 'NÃO INFORMADO';
      const posto = (g?.posto || '').trim().toUpperCase() || 'NÃO INFORMADO';
      const rg = (g?.rg || '').trim() || 'NÃO INFORMADO';
      segundaPaginaChildren.push(
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        new Paragraph({ children: [ new TextRun({ text: `NOME COMPLETO: ${nome}` }) ] }),
        new Paragraph({ children: [ new TextRun({ text: `POSTO/GRADUAÇÃO: ${posto}` }) ] }),
        new Paragraph({ children: [ new TextRun({ text: `RG PMMT: ${rg}` }) ] }),
        // Assinatura com sublinhado contínuo (underscores), sem autoformatação do Word
        new Paragraph({ children: [ new TextRun({ text: 'ASSINATURA: ' }), new TextRun({ text: '_'.repeat(40) }) ] }),
      );
    });
  } else {
    segundaPaginaChildren.push(
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.LEFT, children: [ new TextRun({ text: 'GUARNIÇÃO NÃO INFORMADA' }) ] })
    );
  }

  // ===== Quebra de página e TERMO DE COMPROMISSO DE COMPARECIMENTO =====
  const audienciaDataDisplay = formatDateBR(audienciaData) || '___/___/______';
  const audienciaHoraDisplay = (audienciaHora && audienciaHora.trim()) ? audienciaHora : '__:__';
  const cidadeAudiencia = extrairCidadeDoMunicipio(municipio) || 'VÁRZEA GRANDE';
  const autorNome = (autoresNomes && autoresNomes.length > 0) ? (autoresNomes[0] || '').toUpperCase() : '';
  const condutorNome = (condutor?.nome || '').toUpperCase();
  const condutorPosto = (condutor?.posto || '').toUpperCase();

  const termoCompromissoChildren: any[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'TERMO DE COMPROMISSO DE COMPARECIMENTO', bold: true, size: 28 }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: convertMillimetersToTwip(25) },
      children: [
        new TextRun({
          text: `POR ESTE INSTRUMENTO, EU, AUTOR DOS FATOS ABAIXO ASSINADO, JÁ QUALIFICADO NOS AUTOS, ASSUMO, NOS TERMOS DO PARÁGRAFO ÚNICO DO ART. 69 DA LEI Nº 9.099/95, O COMPROMISSO DE COMPARECER AO JUIZADO ESPECIAL CRIMINAL DE ${cidadeAudiencia} - MT, NO DIA ${audienciaDataDisplay} ÀS ${audienciaHoraDisplay}, EM VIRTUDE DOS FATOS REGISTRADOS NO TERMO CIRCUNSTANCIADO DE OCORRÊNCIA ACIMA REFERENCIADO, CONFORME NOTIFICADO ABAIXO. FICO CIENTE DE QUE A CONCORDÂNCIA EM COMPARECER AO JUIZADO ESPECIAL CRIMINAL NÃO IMPLICA CONFISSÃO DE QUALQUER NATUREZA, ADMISSÃO DE CULPA OU ANUÊNCIA ÀS DECLARAÇÕES DA PARTE CONTRÁRIA E QUE O NÃO COMPARECIMENTO NO DIA E HORA AJUSTADOS NESTE TERMO SUJEITARÁ ÀS MEDIDAS PREVISTAS NA LEI Nº 9.099/95. FICO CIENTE, TAMBÉM, QUE DEVEREI COMPARECER ACOMPANHADO DE ADVOGADO E QUE NA AUSÊNCIA DESTE SERÁ NOMEADO UM DEFENSOR PÚBLICO.`
        })
      ]
    }),
    // Espaçamento adicional antes da assinatura do Autor (+3)
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    // Assinatura do Autor do Fato (centralizada)
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: '_'.repeat(42) }) ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: (autorNome || '__________________________'), bold: true }) ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'AUTOR DO FATO' }) ] }),
    // Espaçamento adicional antes da assinatura do Condutor (+2)
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    // Assinatura do Condutor da Ocorrência (centralizada)
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: '_'.repeat(42) }) ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `${(condutorNome || '').trim()} ${condutorPosto ? condutorPosto : ''}`.trim() || '__________________________', bold: true }) ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'CONDUTOR DA OCORRÊNCIA' }) ] }),
  ];

  // adiciona quebra de página e conteúdo do termo
  segundaPaginaChildren.push(new Paragraph({ children: [ new PageBreak() ] }));
  termoCompromissoChildren.forEach((p) => segundaPaginaChildren.push(p));

  // Após o Termo de Compromisso: inserir 5 linhas em branco e nova quebra de página
  segundaPaginaChildren.push(
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new PageBreak() ] })
  );

  // ===== TERMO DE MANIFESTAÇÃO DA VÍTIMA (um por vítima) =====
  const buildVictimManifesto = (vitimaNome: string, representacao?: string) => {
    const nomeVitima = (vitimaNome || '').toUpperCase() || '__________________________';
    const rep = (representacao || '').toLowerCase();
    const marcarRepresentar = rep === 'representar';
    const marcarPosterior = rep === 'decidir_posteriormente' || rep === 'decidir posteriormente' || rep === 'posterior';
    const opcao1 = `( ${marcarRepresentar ? 'X' : ' '} ) EXERCER O DIREITO DE REPRESENTAÇÃO OU QUEIXA CONTRA O AUTOR DO FATO, JÁ QUALIFICADO NESTE TCO/PM (FICA CIENTIFICADA QUE EM CASO DE QUEIXA-CRIME, A VÍTIMA DEVERÁ CONSTITUIR ADVOGADO).`;
    const opcao2 = `( ${marcarPosterior ? 'X' : ' '} ) DECIDIR POSTERIORMENTE, ESTANDO CIENTE, PARA OS FINS PREVISTOS NO ART. 103 DO CÓDIGO PENAL E ART. 38 DO CÓDIGO DE PROCESSO PENAL QUE DEVO EXERCER O DIREITO DE REPRESENTAÇÃO OU DE QUEIXA, NO PRAZO DE 06 (SEIS) MESES, A CONTAR DESTA DATA, SENDO CERTO QUE MEU SILÊNCIO, ACARRETARÁ A EXTINÇÃO DE PUNIBILIDADE, NA FORMA DO ART. 107, INC. IV, DO CÓDIGO PENAL.`;

    const children: any[] = [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `TERMO DE MANIFESTAÇÃO DA VÍTIMA ${nomeVitima}`, bold: true, size: 28 }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: 'EU, VÍTIMA ABAIXO ASSINADA, POR ESTE INSTRUMENTO MANIFESTO O MEU INTERESSE EM:' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: opcao1 }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: opcao2 }) ] }),
      // O parágrafo de ciência da audiência só aparece quando a vítima decide representar imediatamente
      ...(marcarRepresentar ? [
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: `ESTOU CIENTE DE QUE A AUDIÊNCIA OCORRERÁ NO DIA ${audienciaDataDisplay}, ÀS ${audienciaHoraDisplay} HORAS, NAS DEPENDÊNCIAS DO JUIZADO ESPECIAL CRIMINAL DE ${cidadeAudiencia} - MT, E QUE O NÃO COMPARECIMENTO IMPORTARÁ EM RENÚNCIA À REPRESENTAÇÃO.` }) ] }),
      ] : []),
      // Espaço adicional antes da assinatura da vítima
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      // Assinatura da Vítima (centralizada)
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: '_'.repeat(46) }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: nomeVitima, bold: true }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'VÍTIMA' }) ] }),
      // Espaço adicional antes da assinatura do Condutor
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      // Assinatura do Condutor da Ocorrência (centralizada)
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: '_'.repeat(46) }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `${(condutorNome || '').trim()} ${condutorPosto ? condutorPosto : ''}`.trim() || '__________________________', bold: true }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'CONDUTOR DA OCORRÊNCIA' }) ] }),
    ];

    return children;
  };

  if (vitimas && vitimas.length > 0) {
    vitimas.forEach((v, idx) => {
      const manifestoChildren = buildVictimManifesto(v?.nome || '', v?.representacao);
      manifestoChildren.forEach((p) => segundaPaginaChildren.push(p));
      // Nova página para próxima vítima, se houver
      if (idx < vitimas.length - 1) {
        segundaPaginaChildren.push(new Paragraph({ children: [ new PageBreak() ] }));
      }
    });
  }

  // ===== TERMO DE APREENSÃO (somente se houver apreensões ou drogas) =====
  const hasSeizure = (apreensoes && apreensoes.trim() !== '') || (drogas && drogas.length > 0);
  if (hasSeizure) {
    // Quebra de página antes do termo
    segundaPaginaChildren.push(new Paragraph({ children: [ new PageBreak() ] }));

    const tableCellBorders = {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    };

    const labelValueParagraph = (label: string, value: string) => new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true }),
        new TextRun({ text: value })
      ]
    });

    const tituloApreensao = (natureza || '').toLowerCase().includes('droga') && (lacreNumero && lacreNumero.trim())
      ? `TERMO DE APREENSÃO LACRE Nº ${lacreNumero.trim().toUpperCase()}`
      : 'TERMO DE APREENSÃO';

    // Título
    segundaPaginaChildren.push(
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: tituloApreensao, bold: true, size: 28 }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    );

    // Tabela principal (linhas essenciais)
    const horaApreensao = (horaTerminoRegistro || horaFato || '__:__');
    const tabela = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // DATA / HORA / LOCAL
        new TableRow({
          children: [
            new TableCell({ borders: tableCellBorders, children: [ labelValueParagraph('DATA', formatDateBR(dataFato) || '___/___/______') ] }),
            new TableCell({ borders: tableCellBorders, children: [ labelValueParagraph('HORA', horaApreensao) ] }),
            new TableCell({ borders: tableCellBorders, children: [ labelValueParagraph('LOCAL', unidadeLinha) ] }),
          ]
        }),
        // NOME DO POLICIAL
        new TableRow({ children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, children: [ labelValueParagraph('NOME DO POLICIAL', `${condutorNome} ${condutorPosto}`.trim()) ] }) ] }),
        // FILIAÇÃO PAI
        new TableRow({ children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, children: [ labelValueParagraph('FILIAÇÃO PAI', (condutor?.pai || '').toUpperCase()) ] }) ] }),
        // FILIAÇÃO MÃE
        new TableRow({ children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, children: [ labelValueParagraph('FILIAÇÃO MÃE', (condutor?.mae || '').toUpperCase()) ] }) ] }),
        // NATURALIDADE | RGPM | CPF
        new TableRow({
          children: [
            new TableCell({ borders: tableCellBorders, children: [ labelValueParagraph('NATURALIDADE', (condutor?.naturalidade || '').toUpperCase()) ] }),
            new TableCell({ borders: tableCellBorders, children: [ labelValueParagraph('RGPM', condutor?.rg || '') ] }),
            new TableCell({ borders: tableCellBorders, children: [ labelValueParagraph('CPF', condutor?.cpf || '') ] }),
          ]
        }),
        // END.
        new TableRow({ children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, children: [ labelValueParagraph('END.', (endereco || '').toUpperCase()) ] }) ] }),
        // MUNICÍPIO | UF | TEL
        new TableRow({
          children: [
            new TableCell({ borders: tableCellBorders, children: [ labelValueParagraph('MUNICÍPIO', (municipio || '').toUpperCase()) ] }),
            new TableCell({ borders: tableCellBorders, children: [ labelValueParagraph('UF', 'MT') ] }),
            new TableCell({ borders: tableCellBorders, children: [ labelValueParagraph('TEL', condutor?.telefone || '') ] }),
          ]
        }),
        // FICA APREENDIDO O DESCRITO ABAIXO
        new TableRow({ children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, children: [ labelValueParagraph('FICA APREENDIDO O DESCRITO ABAIXO', '') ] }) ] }),
        // Conteúdo da apreensão
        new TableRow({ children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, children: [
          ...(drogas && drogas.length > 0
            ? drogas.map((drug, idx) => new Paragraph({ children: [
                new TextRun({ text: `${idx + 1}. ${drug.quantidade} de substância ${drug.substancia.toLowerCase()} de cor ${drug.cor.toLowerCase()}, com odor ${drug.odor.toLowerCase()}${drug.indicios ? `, ${drug.indicios.toLowerCase()}` : ''}${(idx === drogas.length - 1 && lacreNumero) ? `, tudo acondicionado sob o lacre nº ${lacreNumero}.` : '.'}` })
              ] }))
            : [ new Paragraph({ children: [ new TextRun({ text: (apreensoes || '').trim() || '—' }) ] }) ]
          )
        ] }) ] }),
        // Texto legal de base
        new TableRow({ children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, children: [
          new Paragraph({ children: [ new TextRun({ text: (drogas && drogas.length > 0)
            ? 'O PRESENTE TERMO TEM POR OBJETIVO APENAS A CONSTATAÇÃO PRELIMINAR DA NATUREZA DA SUBSTÂNCIA PARA FINS DE LAVRATURA DO TERMO CIRCUNSTANCIADO, NÃO SUPRINDO O EXAME PERICIAL DEFINITIVO (ART. 50, §1º DA LEI 11.343/2006).' 
            : 'O PRESENTE TERMO DE APREENSÃO FOI LAVRADO COM BASE NO ART. 6º, II, DO CÓDIGO DE PROCESSO PENAL.' }) ] })
        ] }) ] })
      ]
    });

    segundaPaginaChildren.push(tabela);

    // Espaço e assinaturas
    segundaPaginaChildren.push(
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: '_'.repeat(46) }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: (autoresNomes && autoresNomes[0]) ? autoresNomes[0].toUpperCase() : '__________________________', bold: true }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'AUTOR DOS FATOS' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: '_'.repeat(46) }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `${(condutorNome || '').trim()} ${condutorPosto ? condutorPosto : ''}`.trim() || '__________________________', bold: true }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'CONDUTOR DA OCORRÊNCIA' }) ] })
    );
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 24 }, paragraph: { spacing: { before: 0, after: 0 } } } }
    },
    sections: [
      // Seção única com cabeçalhos diferentes para primeira página e páginas subsequentes
      {
        properties: { 
          page: { 
            margin: { top: 720, right: 1134, bottom: 720, left: 1134, header: 240, footer: 360 },
            pageNumbers: { start: 1 }
          },
          titlePage: true
        },
        headers: { 
          first: new Header({ children: firstPageHeaderChildren }),
          default: new Header({ children: headerChildren })
        },
        footers: { first: new Footer({ children: footerChildren }), default: new Footer({ children: footerChildren }) },
        children: [
          ...corpoChildren,
          new Paragraph({ children: [ new PageBreak() ] }), // Quebra de página
          ...segundaPaginaChildren
        ],
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TCO_${(tcoNumber || '').trim() || 'DOCUMENTO'}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}