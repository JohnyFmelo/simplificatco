// WordTCO - ponto de entrada para geração de documentos DOCX do TCO
// Aqui adicionaremos utilitários e funções de montagem do arquivo .docx

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://duayymaipijodwuzsmbg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1YXl5bWFpcGlqb2R3dXpzbWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODUyNjUsImV4cCI6MjA3NzE2MTI2NX0.MkCye1nIrRlXFM-deePfEuOqPXUHTkgHBv8O1UJzhTI"
);

 

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
  if (/bpmtran|tr[âa]nsito\s+urbano\s+e\s+rodovi[áa]rio/i.test(u)) {
    return [
      "Batalhão de Polícia Militar de Trânsito Urbano e Rodoviário - BPMTRAN",
      "Av. Fernando Corrêa da Costa, nº 4177, Chácara dos Pinheiros",
      "Cuiabá - MT  |  Tel.: (65) 3661-1956  |  E-mail: bpmtran@pm.mt.gov.br",
    ];
  }
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

function cityAcronym(s?: string | null): string {
  const str = (s || '').toUpperCase().trim();
  if (!str) return '';
  const words = str.split(/[\s-]+/).filter(Boolean);
  const stop = new Set(['DE','DA','DO','DAS','DOS']);
  const letters = words.filter(w => !stop.has(w)).map(w => w[0]).join('');
  return letters || (str[0] || '');
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

// Formata "CIDADE-MT, 14 de novembro de 2025" usando a cidade da unidade e data do fato
function formatCidadeDataExtenso(cidade?: string | null, dataStr?: string | null): string {
  const cidadeUpper = (cidade || '').trim().toUpperCase();
  const cidadeMt = cidadeUpper ? `${cidadeUpper}-MT` : '_____-MT';
  const br = formatDateBR(dataStr);
  let dia: number; let mes: number; let ano: number;
  const now = obterDataCuiaba();
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    dia = parseInt(m[1], 10);
    mes = parseInt(m[2], 10);
    ano = parseInt(m[3], 10);
  } else {
    dia = now.dia; mes = now.mes; ano = now.ano;
  }
  const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const mesNome = MESES[(mes - 1) % 12];
  return `${cidadeMt}, ${dia} de ${mesNome} de ${ano}`;
}

export interface TcoDocOptions {
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
  autores?: Array<{ nome: string; sexo: string; estadoCivil: string; profissao: string; endereco: string; dataNascimento: string; naturalidade: string; filiacaoMae: string; filiacaoPai: string; rg: string; cpf: string; celular: string; email: string; semCpf?: string; }>;
  // URLs públicas de imagens anexadas (opcional)
  imageUrls?: string[];
  // Legendas das imagens (na mesma ordem de imageUrls)
  imageCaptions?: string[];
  // Audiência (nova página Termo de Compromisso)
  audienciaData?: string;
  audienciaHora?: string;
  // Apreensões (texto livre) e dados específicos de drogas
  apreensoes?: string;
  drogas?: Array<{ id: string; quantidade: string; substancia: string; cor: string; odor: string; indicios: string; isUnknownMaterial?: boolean; customMaterialDesc?: string; }>;
  lacreNumero?: string;
  numeroRequisicao?: string;
  periciasLesao?: string[];
  periciasGrafotecnica?: string[];
  nomearFielDepositario?: string;
  fielDepositarioSelecionado?: string;
}

export async function generateTcoDocObject(opts: TcoDocOptions) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, ImageRun, PageBreak, BorderStyle, convertMillimetersToTwip, Table, TableRow, TableCell, WidthType, HeightRule, VerticalAlign } = await import('docx');

  const { unidade, cr, tcoNumber, natureza, autoresNomes, relatoPolicial, conclusaoPolicial, autoresDetalhados, condutor, localRegistro, municipio, tipificacao, dataFato, horaFato, dataInicioRegistro, horaInicioRegistro, dataTerminoRegistro, horaTerminoRegistro, localFato, endereco, comunicante, testemunhas, vitimas, autores, audienciaData, audienciaHora, apreensoes, drogas, lacreNumero, numeroRequisicao, nomearFielDepositario, fielDepositarioSelecionado } = opts;
  const vitimasValidas = Array.isArray(vitimas) ? vitimas.filter(v => String((v as any)?.nome || '').trim()) : [];

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

  // carregar brasão empacotado pelo Vite (garante o binário correto em qualquer host)
  let imageParagraph: any = null;
  try {
    const brasaoUrl = (await import('@/assets/brasao-pmmt.png')).default as string;
    const resp = await fetch(brasaoUrl);
    if (resp.ok) {
      const bytes = new Uint8Array(await resp.arrayBuffer());
      // valida magic bytes de PNG (89 50 4E 47)
      const isPng = bytes.length > 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
      if (isPng) {
        imageParagraph = new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [new ImageRun({
            data: bytes,
            transformation: { width: 80, height: 80 },
            type: 'png'
          })],
        });
      }
    }
  } catch { /* segue sem brasão se falhar */ }


  // ===== Corpo da página: AUTUAÇÃO =====
  const { dia, mes, ano } = obterDataCuiaba();
  const diaExtenso = numeroAte99PorExtenso(dia);
  const mesExtenso = mesPorExtenso(mes);
  const anoExtenso = anoPorExtenso(ano);
  const cidade = extrairCidadeDoMunicipio(municipio);
  const cidadeEncAll = extrairCidadeDoMunicipio(municipio) || 'VÁRZEA GRANDE';

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
    new Paragraph({ children: [ new TextRun({ text: '2. DADOS DA OCORRÊNCIA', bold: true, size: 24 }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
  ];

  // ===== Seção de Autores =====
  {
    const listaAutores: any[] = (Array.isArray(autores) && autores.length > 0)
      ? autores
      : (autoresNomes || []).filter(n => n && n.trim()).map(n => ({ nome: n }));

    listaAutores.forEach((a, index) => {
      const nome = (a?.nome || '').trim();
      if (nome) {
        const numeroAutor = `2.${index + 1}`;
        segundaPaginaChildren.push(
          new Paragraph({ children: [ new TextRun({ text: `${numeroAutor} AUTOR ${nome.toUpperCase()}`, bold: true }) ] }),
          new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `NOME: ${toDisplay(a?.nome)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `SEXO: ${toDisplay(a?.sexo)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `ESTADO CIVIL: ${toDisplay(a?.estadoCivil)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `PROFISSÃO: ${toDisplay(a?.profissao)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `ENDEREÇO: ${toDisplay(a?.endereco)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `DATA DE NASCIMENTO: ${toDisplay(a?.dataNascimento)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `NATURALIDADE: ${toDisplay(a?.naturalidade)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `FILIAÇÃO - MÃE: ${toDisplay(a?.filiacaoMae)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `FILIAÇÃO - PAI: ${toDisplay(a?.filiacaoPai)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `RG: ${toDisplay(a?.rg)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `${(String(a?.semCpf || '').toLowerCase() === 'true') ? 'CPF: Não possui CPF' : `CPF: ${toDisplay(a?.cpf)}`}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `CELULAR: ${toDisplay(a?.celular)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: `E-MAIL: ${toDisplay(a?.email)}`, bold: false }) ] }),
          new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        );
      }
    });
  }

  // ===== Seção de Vítimas ===== (antes das testemunhas)
  const totalAutores = (Array.isArray(autores) && autores.length > 0)
    ? autores.filter(a => a?.nome && String(a.nome).trim()).length
    : ((autoresNomes && autoresNomes.length > 0) ? autoresNomes.filter(n => n && n.trim()).length : 0);
  let proximoNumero = totalAutores > 0 ? totalAutores + 1 : 1;
  
  if (vitimasValidas.length > 0) {
    vitimasValidas.forEach((vitima, index) => {
      const numeroVitima = `2.${proximoNumero + index}`;
      const nome = vitima?.nome?.trim();
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
        new Paragraph({ children: [ new TextRun({ text: `${(String(vitima?.semCpf || '').toLowerCase() === 'true') ? 'CPF: Não possui CPF' : `CPF: ${toDisplay(vitima?.cpf)}`}`, bold: false }) ] }),
        new Paragraph({ children: [ new TextRun({ text: `CELULAR: ${toDisplay(vitima.celular)}`, bold: false }) ] }),
        new Paragraph({ children: [ new TextRun({ text: `E-MAIL: ${toDisplay(vitima.email)}`, bold: false }) ] }),
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      );
    });
    proximoNumero += vitimasValidas.length;
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
          new Paragraph({ children: [ new TextRun({ text: `${(String(testemunha?.semCpf || '').toLowerCase() === 'true') ? 'CPF: Não possui CPF' : `CPF: ${toDisplay(testemunha?.cpf)}`}`, bold: false }) ] }),
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
  let historicoSeq = 2;

  if (autoresDetalhados && autoresDetalhados.length > 0) {
    autoresDetalhados.forEach((autor) => {
      const nomeA = (autor?.nome || '').trim();
      if (!nomeA) return;
      const textoA = (autor?.relato && autor.relato.trim().length > 0) ? autor.relato.toUpperCase() : 'NÃO INFORMADO';
      segundaPaginaChildren.push(
        new Paragraph({ children: [ new TextRun({ text: `3.${historicoSeq} RELATO DO AUTOR DO FATO ${nomeA.toUpperCase()}`, bold: true }) ] }),
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: textoA }) ] }),
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `${nomeA.toUpperCase()}`, bold: true }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'AUTOR DO FATO' }) ] }),
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      );
      historicoSeq += 1;
    });
  }

  if (vitimasValidas.length > 0) {
    vitimasValidas.forEach((vit) => {
      const nomeV = (vit?.nome || '').trim();
      if (!nomeV) return;
      const textoV = (vit?.relato && vit.relato.trim().length > 0) ? vit.relato.toUpperCase() : 'NÃO INFORMADO';
      segundaPaginaChildren.push(
        new Paragraph({ children: [ new TextRun({ text: `3.${historicoSeq} RELATO DA VÍTIMA ${nomeV.toUpperCase()}`, bold: true }) ] }),
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: textoV }) ] }),
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `${nomeV.toUpperCase()}`, bold: true }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'VÍTIMA' }) ] }),
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      );
      historicoSeq += 1;
    });
  }

  const conclusaoTexto = (conclusaoPolicial && conclusaoPolicial.trim().length > 0) ? conclusaoPolicial.toUpperCase() : 'NÃO INFORMADO';
  segundaPaginaChildren.push(
    new Paragraph({ children: [ new TextRun({ text: `3.${historicoSeq} CONCLUSÃO DO POLICIAL`, bold: true }) ] }),
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

  // Inserção de imagens juntadas, se disponíveis e carregadas com sucesso
  if (opts.imageUrls && opts.imageUrls.length > 0) {
    let imagensInseridas = 0;
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
    const pairs = (opts.imageUrls || []).map((u, i) => ({ url: u, caption: (opts.imageCaptions || [])[i] || '' }));
    const filteredPairs = pairs
      .filter(p => typeof p.url === 'string' && !/via\.placeholder\.com/i.test(p.url))
      .filter(p => /^(https?:|blob:|data:)/i.test(p.url));
    for (const { url, caption } of filteredPairs) {
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const bytes = new Uint8Array(await resp.arrayBuffer());
          const dims = await getScaledDims(url);
          if (imagensInseridas === 0) {
            segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
            segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: '5.2 IMAGENS', bold: true }) ] }));
          }
          imagensInseridas++;
          const ct = (resp.headers.get('Content-Type') || '').toLowerCase();
          const isPng = ct.includes('png') || /\.png(\?|$)/i.test(url);
          const isJpeg = ct.includes('jpeg') || ct.includes('jpg') || /\.(jpe?g)(\?|$)/i.test(url);
          const imgType = isPng ? 'png' : (isJpeg ? 'jpg' : 'jpg');
          segundaPaginaChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [ new ImageRun({ 
                data: bytes, 
                transformation: { width: (dims?.width || 420), height: (dims?.height || 280) },
                type: imgType
              }) ]
            }),
          );
          const captionText = (caption || '').trim();
          if (captionText) {
            segundaPaginaChildren.push(
              new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: captionText, italics: true }) ] })
            );
          }
          segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
        }
      } catch (e) {
        // falha silenciosa por imagem específica
        console.warn('Falha ao anexar imagem ao DOCX:', e);
      }
    }
  }

  // Bloco de requisições de exame será inserido após o Termo de Compromisso

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
        new Paragraph({ children: [ new TextRun({ text: 'ASSINATURA: ' }), new TextRun({ text: '_'.repeat(27) }) ] }),
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
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'TERMO DE COMPROMISSO DE COMPARECIMENTO', bold: true, size: 28 }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
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
    // espaço entre corpo e data
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ text: String(formatCidadeDataExtenso(cidadeEncAll, dataFato)).toUpperCase() }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: (autorNome || '__________________________'), bold: true }) ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'AUTOR DO FATO' }) ] }),
    // dois espaços entre autor e condutor
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
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

  const isDrogaNatureza = ((natureza || '').toLowerCase().includes('droga')) || ((drogas && drogas.length > 0));
  if (isDrogaNatureza) {
    const cidadeEnc = extrairCidadeDoMunicipio(municipio) || 'VÁRZEA GRANDE';
    const apensoLinhas = (drogas && drogas.length > 0) ? drogas.map((drug) => `${(drug.quantidade || '').trim()} DE SUBSTÂNCIA ${String(drug.substancia || '').toUpperCase()}, DE COR ${String(drug.cor || '').toUpperCase()}, COM ODOR ${String(drug.odor || '').toUpperCase()}${drug.indicios ? `, ${String(drug.indicios || '').toUpperCase()}` : ''}.`) : [(apreensoes || '').trim()].filter(Boolean);

    const brDate = formatDateBR(dataFato);
    const mAno = brDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const anoFato = mAno ? parseInt(mAno[3], 10) : new Date().getFullYear();

    const numReqDisplay = (numeroRequisicao && numeroRequisicao.trim()) ? numeroRequisicao.trim() : ((tcoNumber && tcoNumber.trim()) ? tcoNumber.trim() : '000');

    const tituloRequisicao = `REQUISIÇÃO DE EXAME EM DROGAS DE ABUSO nº ${numReqDisplay}/${unidadeAbr}/${crAbr}/${anoFato}`;

    const nomeAutor = (autores && autores[0]?.nome) ? autores[0].nome : ((autoresNomes && autoresNomes[0]) ? autoresNomes[0] : 'NÃO INFORMADO');
    const cpfAutor = (autores && autores[0]?.cpf) ? autores[0].cpf : 'NÃO INFORMADO';
    const numeroRefTco = `${(tcoNumber || '').trim()}/${unidadeAbr}/${crAbr}/${anoFato}`;
    const dataFatoDisplay = formatDateBR(dataFato) || '__/__/____';

    // ========== CORREÇÃO: HORA FORMATO HH:MM ==========
    const horaBruta = (horaFato || '').trim();
    let hh = '__', mm = '__';
    if (horaBruta.length >= 2) {
      const limpa = horaBruta.replace(/[^0-9]/g, '');
      if (limpa.length >= 4) { hh = limpa.substring(0,2); mm = limpa.substring(2,4); }
      else if (limpa.length === 3) { hh = '0' + limpa.substring(0,1); mm = limpa.substring(1,3); }
      else if (limpa.length === 2) { hh = limpa; mm = '00'; }
      else if (limpa.length === 1) { hh = '0' + limpa; mm = '00'; }
    } else if (horaBruta.includes(':')) {
      const [a,b] = horaBruta.split(':');
      if (a) hh = a.replace(/[^0-9]/g,'').padStart(2,'0');
      if (b) mm = b.replace(/[^0-9]/g,'').padStart(2,'0');
    }
    const horaFatoDisplay = `${hh}:${mm}`;
    // ======================================================

    const corpoLegal = `Requisito a POLITEC - Perícia Oficial e Identificação Técnica, nos termos dos artigos 158 e seguintes do Código de Processo Penal, combinado com o Artigo 69, Caput da Lei 9.099/95, combinado com Artigo 48, § 2º da Lei nº 11.343/06, a realização de exame químico na substância análoga a entorpecente apensada, encontrada em posse do (a) Sr. (a) ${nomeAutor.toUpperCase()}, autor do fato, portador do CPF ${cpfAutor} qualificado no Termo Circunstanciado de Ocorrência nº ${numeroRefTco}, de natureza Posse de Drogas para consumo pessoal, ocorrido na data dia ${dataFatoDisplay} às ${horaFatoDisplay}min.`;

    // (1) TÍTULO + LINHA EM BRANCO ABAIXO
    segundaPaginaChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0, line: 240 },
        children: [ new TextRun({ text: tituloRequisicao, bold: true, font: 'Times New Roman', size: 24 }) ]
      }),
      new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: ' ' }) ] }),
    );

    // CORPO LEGAL (12pt = size 24)
    segundaPaginaChildren.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: convertMillimetersToTwip(25) },
        spacing: { before: 0, after: 30, line: 240 },
        children: [ new TextRun({ text: corpoLegal.toUpperCase(), size: 24 }) ]
      }),
    );

    // APENSOS (1 por droga - GÊNERO FEMININO: UMA porção)
    if (drogas && drogas.length > 0) {
      drogas.forEach((drug) => {
        const qtdNum = parseInt((drug.quantidade || '1').replace(/[^\d]/g, ''), 10) || 1;
        const qtdStr = qtdNum.toString().padStart(2, '0');
        // ============ GARANTE GÊNERO FEMININO =============
        let qtdExtBruto = numeroAte99PorExtenso(qtdNum).toLowerCase();
        // Substitui masculino "um" por feminino "uma" quando substantivo é "porção"
        if (qtdNum === 1) qtdExtBruto = qtdExtBruto.replace(/\bum\b/g, 'uma').replace(/\bhomens?\b/g, 'uma');
        const qtdExt = qtdExtBruto;
        const nomeDroga = (drug.isUnknownMaterial && drug.customMaterialDesc)
          ? drug.customMaterialDesc
          : (drug.substancia || 'substância não identificada');
        const apenso = `Apenso: ${qtdStr} (${qtdExt}) porção de substância análoga ao entorpecente conhecido como ${nomeDroga.toLowerCase()}.`;
        segundaPaginaChildren.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 0, after: 10, line: 240 },
            children: [ new TextRun({ text: apenso.toUpperCase(), size: 24 }) ]
          })
        );
      });
    } else if (apreensoes && apreensoes.trim()) {
      const apenso = `Apenso: 01 (uma) porção de substância análoga ao entorpecente. ${apreensoes.trim()}`;
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 0, after: 10, line: 240 },
          children: [ new TextRun({ text: apenso.toUpperCase(), size: 24 }) ]
        })
      );
    }

    // TEXTO DE SOLICITAÇÃO + (2) LINHA EM BRANCO ANTES DOS QUESITOS
    segundaPaginaChildren.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: convertMillimetersToTwip(25) },
        spacing: { before: 0, after: 0, line: 240 },
        children: [ new TextRun({ text: 'Para tanto, solicito a Vossa senhoria, que seja confeccionado o respectivo Laudo definitivo, devendo os peritos responderem aos quesitos oficiais, conforme abaixo:'.toUpperCase(), size: 24 }) ]
      }),
      new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: ' ' }) ] }),
    );

    // QUESITOS OFICIAIS (SOMENTE size 20 = 10pt, compactos)
    const quesitosDrogasNovos = [
      'Qual a natureza e característica das substâncias enviadas a exame?',
      'Podem as mesmas causar dependência física ou psíquica?',
      'Qual a massa das substâncias enviadas a exame?'
    ];
    quesitosDrogasNovos.forEach((q, i) => {
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: convertMillimetersToTwip(25) },
          spacing: { before: 0, after: 10, line: 226 },
          children: [ new TextRun({ text: `${i + 1}. ${q.toUpperCase()}`, size: 20 }) ]
        })
      );
    });

    // BLOCO NOTAS + (3) LINHA EM BRANCO ANTES DA DATA
    // DESTINO DO LAUDO = UNIDADE (UNIDADE ABR OU UNIDADE LINHA) — NUNCA CR!
    const destinoDrogas = (unidadeAbr && unidadeAbr.trim()) ? String(unidadeAbr).trim().toUpperCase() : String(unidadeLinha || '').trim().toUpperCase();
    segundaPaginaChildren.push(
      new Paragraph({ spacing: { before: 30, after: 10, line: 240 }, children: [ new TextRun({ text: 'NOTAS:', bold: true, size: 24 }) ] }),
      new Paragraph({ spacing: { before: 0, after: 10, line: 240 }, children: [ new TextRun({ text: `EM REQUISIÇÃO Nº ${numReqDisplay} COM LACRE Nº ${(lacreNumero || '').trim().toUpperCase() || '__________'}`, size: 24 }) ] }),
      new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: 'DESTINO DO LAUDO: ', bold: true, size: 24 }), new TextRun({ text: destinoDrogas || '__________', size: 24 }) ] }),
      new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: ' ' }) ] }),
    );

    // Local e Data (alinhado à direita)
    segundaPaginaChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 80, line: 240 },
        children: [ new TextRun({ text: String(formatCidadeDataExtenso(cidadeEnc || cidadeEncAll || '', dataFato)).toUpperCase(), size: 24 }) ]
      }),
    );

    // ASSINATURA PADRÃO UNIFICADO: Nome/Posto → CONDUTOR → RG Nº XXXX PMMT
    const condutorPosto2 = String(condutor?.graduacao || condutor?.posto || condutorPosto || '').trim().toUpperCase();
    const condutorNome2 = String(condutor?.nome_completo || condutor?.nome || condutorNome || '').trim().toUpperCase();
    const condutorAssinaturaDrogas = [condutorPosto2, condutorNome2].filter(Boolean).join(' ') || '_________________________________';
    const condutorRgDrogas = String(condutor?.rgpm || condutor?.rg || '').trim().toUpperCase() || '____________________';
    segundaPaginaChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 10, line: 240 },
        children: [ new TextRun({ text: condutorAssinaturaDrogas, bold: true, size: 24 }) ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 10, line: 240 },
        children: [ new TextRun({ text: 'CONDUTOR DA OCORRÊNCIA'.toUpperCase(), size: 24 }) ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30, line: 240 },
        children: [ new TextRun({ text: `RG Nº ${condutorRgDrogas} PMMT`.toUpperCase(), size: 24 }) ]
      }),
    );

    // TABELA DE PROTOCOLO DA POLITEC (3 COLUNAS, CABEÇALHOS NEGRITADOS)
    const drgLabel = (t: string) => new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 10, line: 240 },
      children: [ new TextRun({ text: t, bold: true, size: 24 }) ]
    });
    const tabelaReceb = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [3000, 3000, 3000],
      rows: [
        new TableRow({
          height: { value: convertMillimetersToTwip(15), rule: HeightRule.ATLEAST },
          children: [
            new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [ drgLabel('DATA') ] }),
            new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [ drgLabel('POLITEC') ] }),
            new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [ drgLabel('ASSINATURA') ] })
          ]
        }),
        new TableRow({
          height: { value: convertMillimetersToTwip(18), rule: HeightRule.ATLEAST },
          children: [
            new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [ new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: ' ' }) ] }) ] }),
            new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [ new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: ' ' }) ] }) ] }),
            new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [ new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: ' ' }) ] }) ] }),
          ]
        })
      ]
    });
    segundaPaginaChildren.push(tabelaReceb);
    segundaPaginaChildren.push(new Paragraph({ children: [ new PageBreak() ] }));

    segundaPaginaChildren.push(
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'TERMO DE CONSTATAÇÃO PRELIMINAR DE DROGA', bold: true, size: 28 }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: convertMillimetersToTwip(25) }, children: [ new TextRun({ text: `EM RAZÃO DA LAVRATURA DESTE TERMO CIRCUNSTANCIADO DE OCORRÊNCIA, PELO DELITO TIPIFICADO, FOI APREENDIDO O MATERIAL DESCRITO ABAIXO, EM PODER DO AUTOR ABAIXO ASSINADO JÁ QUALIFICADO NOS AUTOS. APÓS CIÊNCIA DAS IMPLICAÇÕES LEGAIS DO ENCARGO ASSUMIDO, FIRMOU-SE O COMPROMISSO LEGAL DE PROCEDER À ANÁLISE PRELIMINAR DOS SEGUINTES MATERIAIS:` }) ] })
    );
    segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
    apensoLinhas.forEach((ln) => {
      segundaPaginaChildren.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: `- ${ln}${(lacreNumero && lacreNumero.trim()) ? ` TUDO ACONDICIONADO SOB O LACRE Nº ${lacreNumero.trim().toUpperCase()}.` : ''}` }) ] }));
    });
    segundaPaginaChildren.push(
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: convertMillimetersToTwip(25) }, children: [ new TextRun({ text: 'O PRESENTE TERMO TEM POR OBJETIVO APENAS A CONSTATAÇÃO PRELIMINAR DA NATUREZA DA SUBSTÂNCIA PARA FINS DE LAVRATURA DO TERMO CIRCUNSTANCIADO, NÃO SUPRINDO O EXAME PERICIAL DEFINITIVO (ART. 50, §1º DA LEI 11.343/2006). PARA A VERIFICAÇÃO PRELIMINAR, FOI REALIZADA ANÁLISE VISUAL E OLFATIVA DO MATERIAL.' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ text: String(formatCidadeDataExtenso(cidadeEncAll, dataFato)).toUpperCase() }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `${(condutorNome || '').trim()} ${condutorPosto ? condutorPosto : ''}`.trim() || '__________________________', bold: true }) ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'CONDUTOR DA OCORRÊNCIA' }) ] })
    );

    segundaPaginaChildren.push(new Paragraph({ children: [ new PageBreak() ] }));

    const horaApreensao = (horaTerminoRegistro || horaFato || '__:__');
    const tableCellBorders = {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    };
    const labelValueParagraph = (label: string, value: string) => new Paragraph({ children: [ new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value }) ] });
    const tituloApreensao = (lacreNumero && lacreNumero.trim()) ? `TERMO DE APREENSÃO LACRE Nº ${lacreNumero.trim().toUpperCase()}` : 'TERMO DE APREENSÃO';
    segundaPaginaChildren.push(
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: tituloApreensao, bold: true, size: 28 }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] })
    );
    const descricaoLinha = (drogas && drogas.length > 0
      ? drogas.map((drug, idx) => `${idx + 1}. ${drug.quantidade} de substância ${String(drug.substancia || '').toLowerCase()} de cor ${String(drug.cor || '').toLowerCase()}, com odor ${String(drug.odor || '').toLowerCase()}${drug.indicios ? `, ${String(drug.indicios || '').toLowerCase()}` : ''}${(idx === drogas.length - 1 && lacreNumero) ? `, tudo acondicionado sob o lacre nº ${lacreNumero}.` : '.'}`).join(' ')
      : ((apreensoes || '').trim() || '—'));
    const tabela = new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: [3000, 3000, 3000],
      rows: [
        new TableRow({
          height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST },
          children: [
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('DATA', formatDateBR(dataFato) || '___/___/______') ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('HORA', horaApreensao) ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('LOCAL', unidadeLinha) ] }),
          ]
        }),
        new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, columnSpan: 3, children: [ labelValueParagraph('NOME DO POLICIAL', `${condutorNome} ${condutorPosto}`.trim()) ] }) ] }),
        new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, columnSpan: 3, children: [ labelValueParagraph('FILIAÇÃO PAI', (condutor?.pai || '').toUpperCase()) ] }) ] }),
        new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, columnSpan: 3, children: [ labelValueParagraph('FILIAÇÃO MÃE', (condutor?.mae || '').toUpperCase()) ] }) ] }),
        new TableRow({
          height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST },
          children: [
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('NATURALIDADE', (condutor?.naturalidade || '').toUpperCase()) ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('RGPM', condutor?.rg || '') ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('CPF', condutor?.cpf || '') ] }),
          ]
        }),
        new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, columnSpan: 3, children: [ labelValueParagraph('END.', (endereco || '').toUpperCase()) ] }) ] }),
        new TableRow({
          height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST },
          children: [
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('MUNICÍPIO', (municipio || '').toUpperCase()) ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('UF', 'MT') ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('TEL', condutor?.telefone || '') ] }),
          ]
        }),
        new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, columnSpan: 3, children: [ new Paragraph({ children: [ new TextRun({ text: 'FICA APREENDIDO O DESCRITO ABAIXO: ', bold: true }), new TextRun({ text: descricaoLinha }) ] }) ] }) ] }),
        new TableRow({ height: { value: convertMillimetersToTwip(20.7), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, columnSpan: 3, children: [ new Paragraph({ children: [ new TextRun({ text: 'O PRESENTE TERMO TEM POR OBJETIVO APENAS A CONSTATAÇÃO PRELIMINAR DA NATUREZA DA SUBSTÂNCIA PARA FINS DE LAVRATURA DO TERMO CIRCUNSTANCIADO, NÃO SUPRINDO O EXAME PERICIAL DEFINITIVO (ART. 50, §1º DA LEI 11.343/2006).' }) ] }) ] }) ] })
      ]
    });
    segundaPaginaChildren.push(tabela);
    segundaPaginaChildren.push(
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: (autoresNomes && autoresNomes[0]) ? autoresNomes[0].toUpperCase() : '__________________________', bold: true }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'AUTOR DOS FATOS' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `${(condutorNome || '').trim()} ${condutorPosto ? condutorPosto : ''}`.trim() || '__________________________', bold: true }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'CONDUTOR DA OCORRÊNCIA' }) ] })
    );
    segundaPaginaChildren.push(new Paragraph({ children: [ new PageBreak() ] }));
  }

  // O bloco de requisição de lesão será posicionado após o Termo da Vítima

  // ===== TERMO DE MANIFESTAÇÃO DA VÍTIMA (um por vítima) =====
  const buildVictimManifesto = (vitimaNome: string, representacao?: string) => {
    const nomeVitima = (vitimaNome || '').toUpperCase() || '__________________________';
    const rep = (representacao || '').toLowerCase();
    const marcarRepresentar = rep === 'representar';
    const marcarPosterior = rep === 'decidir_posteriormente' || rep === 'decidir posteriormente' || rep === 'posterior';
    const opcao1 = `( ${marcarRepresentar ? 'X' : ' '} ) EXERCER O DIREITO DE REPRESENTAÇÃO OU QUEIXA CONTRA O AUTOR DO FATO, JÁ QUALIFICADO NESTE TCO/PM (FICA CIENTIFICADA QUE EM CASO DE QUEIXA-CRIME, A VÍTIMA DEVERÁ CONSTITUIR ADVOGADO).`;
    const opcao2 = `( ${marcarPosterior ? 'X' : ' '} ) DECIDIR POSTERIORMENTE, ESTANDO CIENTE, PARA OS FINS PREVISTOS NO ART. 103 DO CÓDIGO PENAL E ART. 38 DO CÓDIGO DE PROCESSO PENAL QUE DEVO EXERCER O DIREITO DE REPRESENTAÇÃO OU DE QUEIXA, NO PRAZO DE 06 (SEIS) MESES, A CONTAR DESTA DATA, SENDO CERTO QUE MEU SILÊNCIO, ACARRETARÁ A EXTINÇÃO DE PUNIBILIDADE, NA FORMA DO ART. 107, INC. IV, DO CÓDIGO PENAL.`;
    const children: any[] = [
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `TERMO DE MANIFESTAÇÃO DA VÍTIMA ${nomeVitima}`, bold: true, size: 28 }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: convertMillimetersToTwip(25) }, children: [ new TextRun({ text: 'EU, VÍTIMA ABAIXO ASSINADA, POR ESTE INSTRUMENTO MANIFESTO O MEU INTERESSE EM:' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: opcao1 }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [ new TextRun({ text: opcao2 }) ] }),
      // O parágrafo de ciência da audiência só aparece quando a vítima decide representar imediatamente
      ...(marcarRepresentar ? [
        new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: convertMillimetersToTwip(25) }, children: [ new TextRun({ text: `ESTOU CIENTE DE QUE A AUDIÊNCIA OCORRERÁ NO DIA ${audienciaDataDisplay}, ÀS ${audienciaHoraDisplay} HORAS, NAS DEPENDÊNCIAS DO JUIZADO ESPECIAL CRIMINAL DE ${cidadeAudiencia} - MT, E QUE O NÃO COMPARECIMENTO IMPORTARÁ EM RENÚNCIA À REPRESENTAÇÃO.` }) ] }),
      ] : []),
      // Espaço adicional antes da identificação
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ text: String(formatCidadeDataExtenso(cidadeEncAll, dataFato)).toUpperCase() }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: nomeVitima, bold: true }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'VÍTIMA' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `${(condutorNome || '').trim()} ${condutorPosto ? condutorPosto : ''}`.trim() || '__________________________', bold: true }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'CONDUTOR DA OCORRÊNCIA' }) ] }),
    ];

    return children;
  };

  if (vitimasValidas.length > 0) {
    vitimasValidas.forEach((v, idx) => {
      const manifestoChildren = buildVictimManifesto(v?.nome || '', v?.representacao);
      manifestoChildren.forEach((p) => segundaPaginaChildren.push(p));
      // Nova página para próxima vítima, se houver
      if (idx < vitimasValidas.length - 1) {
        segundaPaginaChildren.push(new Paragraph({ children: [ new PageBreak() ] }));
      }
    });
  }

  // ===== REQUISIÇÃO DE EXAME DE LESÃO CORPORAL (nova versão - uma página por pessoa) =====
  if (opts.periciasLesao && opts.periciasLesao.length > 0) {
    const vitimasArr = Array.isArray(opts.vitimas) ? opts.vitimas : [];
    const autoresArr = Array.isArray(opts.autores) ? opts.autores : [];
    const condutorNomeStr = String(condutor?.nome_completo || condutor?.nome || condutorNome || '').trim().toUpperCase();
    const condutorPostoStr = String(condutor?.graduacao || condutor?.posto || condutorPosto || '').trim().toUpperCase();
    const condutorRgPM = String(condutor?.rgpm || condutor?.rg || '').trim().toUpperCase();
    const condutorAssinatura = [condutorPostoStr, condutorNomeStr].filter(Boolean).join(' ') || '_________________________________';
    const numReq = String(opts.numeroRequisicao || opts.tcoNumber || '000').trim().replace(/\s+/g, ' ');
    const anoFato = (() => { try { const d = String(dataFato || '').trim(); const m = d.match(/(\d{4})/); if (m) return m[1]; } catch (e) {} const hoje = new Date(); return String(hoje.getFullYear()); })();

    const tableCellBordersReq = {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    };

    const quesitos = [
      'Houve ofensa à integridade corporal ou à saúde do(a) periciando(a) que possa estar relacionada ao delito em apuração?',
      'Qual o agente vulnerante ou meio empregado para produzi-la?',
      'A ofensa foi produzida com o emprego de veneno, fogo, explosivo, tortura ou outro meio insidioso ou cruel, ou de que possa resultar perigo comum? Especificar.',
      'Resultou perigo de vida?',
      'Resultou incapacidade para as ocupações habituais, por mais de 30 (trinta) dias?',
      'Resultou debilidade permanente de membro, sentido ou função? Se sexo feminino, resultou em aceleração de parto? (Especificar)',
      'Resultou incapacidade permanente para o trabalho, ou enfermidade incurável, ou perda ou inutilização de membro, sentido ou função, ou deformidade permanente? Se sexo feminino, resultou em aborto? Especificar.',
    ];

    opts.periciasLesao.forEach((nomePessoa, idx) => {
      const nomePessoaUpper = String(nomePessoa || '').trim().toUpperCase() || 'NOME NÃO INFORMADO';
      let pessoa: any = null;
      let papelPessoa = 'vítima';
      let tituloTabelaNome = 'Nome da Vítima';
      for (const v of vitimasArr) {
        if (String(v?.nome || '').toUpperCase() === nomePessoaUpper) {
          pessoa = v;
          papelPessoa = 'vítima';
          tituloTabelaNome = 'Nome da Vítima';
          break;
        }
      }
      if (!pessoa) {
        for (const a of autoresArr) {
          if (String(a?.nome || '').toUpperCase() === nomePessoaUpper) {
            pessoa = a;
            papelPessoa = 'autor do fato';
            tituloTabelaNome = 'Nome Autor do Fato';
            break;
          }
        }
      }
      const cpfPessoa = pessoa?.cpf ? String(pessoa.cpf).trim() : 'NÃO INFORMADO';
      const nomeMaePessoa = (pessoa?.filiacaoMae || '').trim().toUpperCase() || 'NÃO INFORMADO';
      const relatoPessoa = (pessoa?.relato || opts.relatoPolicial || 'foi vítima de agressão física').trim();
      const naturezaStr = String(natureza || '').trim() || 'LESÃO CORPORAL';
      const dataFatoBR = formatDateBR(dataFato) || '__/__/____';
      const cidade = (extrairCidadeDoMunicipio(municipio) || 'VÁRZEA GRANDE').toUpperCase();
      const dataExt = formatCidadeDataExtenso(cidade, dataFato).toUpperCase();

      // Pula de página antes de cada requisição (exceto se for a primeira e não tiver conteúdo anterior)
      if (idx > 0 || segundaPaginaChildren.length > 0) {
        segundaPaginaChildren.push(new Paragraph({ children: [ new PageBreak() ] }));
      }

      // 3. Título (12pt = size 24, negrito) + LINHA EM BRANCO ABAIXO (1)
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0, line: 240 },
          children: [
            new TextRun({
              text: `REQUISIÇÃO DE EXAME DE LESÃO CORPORAL nº ${numReq}/${unidadeAbr}/${crAbr}/${anoFato}`,
              bold: true,
              size: 24
            })
          ]
        }),
        new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: ' ' }) ] }),
      );

      // 4. Corpo legal (12pt = size 24)
      const corpoLegal = `Requisito a POLITEC - Perícia Oficial e Identificação Técnica, nos termos dos artigos 158 e seguintes do Código de Processo Penal e artigo 69 Caput da Lei n.º 9.099/1995, a realização de exame de corpo de delito no (a) Sr. (a) ${nomePessoaUpper}, ${papelPessoa}, portador(a) do CPF ${cpfPessoa} qualificado no Termo Circunstanciado de Ocorrência nº ${numeroDisplay}, por ter relatado que: ${relatoPessoa} de natureza ${naturezaStr}, ocorrido na data ${dataFatoBR}, respondendo para tal os seguintes quesitos:`;
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: convertMillimetersToTwip(25) },
          spacing: { before: 0, after: 0, line: 240 },
          children: [ new TextRun({ text: corpoLegal.toUpperCase(), size: 24 }) ]
        }),
      );

      // 5. Texto de solicitação (12pt) + LINHA EM BRANCO ABAIXO (2)
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: convertMillimetersToTwip(25) },
          spacing: { before: 0, after: 0, line: 240 },
          children: [ new TextRun({ text: 'Para tanto, solicito que Vossa Senhoria responda aos quesitos oficiais, conforme abaixo:'.toUpperCase(), size: 24 }) ]
        }),
        new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: ' ' }) ] }),
      );

      // 6. 7 Quesitos (10pt - compactos para manter em 1 página)
      quesitos.forEach((q, i) => {
        segundaPaginaChildren.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: convertMillimetersToTwip(25) },
            spacing: { before: 0, after: 10, line: 226 },
            children: [ new TextRun({ text: `${i + 1}. ${q.toUpperCase()}`, size: 20 }) ]
          })
        );
      });

      // 7. DESTINO DO LAUDO + observação em VERMELHO + LINHA EM BRANCO ABAIXO (3) - USA UNIDADE, NUNCA CR!
      const destinoLaudo = (unidadeAbr && unidadeAbr.trim()) ? String(unidadeAbr).trim().toUpperCase() : String(unidadeLinha || '').trim().toUpperCase();
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 10, line: 240 },
          children: [
            new TextRun({ text: 'DESTINO DO LAUDO: ', bold: true, size: 24 }),
            new TextRun({ text: destinoLaudo, size: 24 })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 0, line: 240 },
          children: [ new TextRun({ text: '(verificar quais quesitos são aplicáveis ao fato)'.toUpperCase(), italics: true, size: 24, color: "FF0000" }) ]
        }),
        new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: ' ' }) ] }),
      );

      // 8. Data / Cidade (12pt)
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 0, after: 80, line: 240 },
          children: [ new TextRun({ text: dataExt, size: 24 }) ]
        }),
      );

      // 9. ASSINATURA (ORDEM EXATA): Nome+Posto → CONDUTOR → RG Nº XXXX PMMT
      const rgpmFinal = condutorRgPM || '____________________';
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 10, line: 240 },
          children: [ new TextRun({ text: condutorAssinatura, bold: true, size: 24 }) ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 10, line: 240 },
          children: [ new TextRun({ text: 'CONDUTOR DA OCORRÊNCIA'.toUpperCase(), size: 24 }) ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 20, line: 240 },
          children: [ new TextRun({ text: `RG Nº ${rgpmFinal} PMMT`.toUpperCase(), size: 24 }) ]
        }),
      );

      // 10. Tabela de protocolo (compacta: margens menores para manter em 1 página)
      const cellLabelPara = (texto: string) => new Paragraph({
        spacing: { before: 0, after: 10, line: 236 },
        children: [ new TextRun({ text: `${texto}:`, bold: true, size: 24 }) ]
      });
      const cellValuePara = (texto: string) => new Paragraph({
        spacing: { before: 0, after: 0, line: 236 },
        children: [ new TextRun({ text: texto.toUpperCase(), size: 24 }) ]
      });
      const tabelaProtocolo = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [3000, 3000, 3000],
        rows: [
          new TableRow({
            height: { value: convertMillimetersToTwip(20), rule: HeightRule.ATLEAST },
            children: [
              new TableCell({
                borders: tableCellBordersReq,
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 40, bottom: 40, left: 80, right: 80 },
                children: [
                  cellLabelPara('DATA'),
                  cellValuePara(dataFatoBR)
                ]
              }),
              new TableCell({
                borders: tableCellBordersReq,
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 40, bottom: 40, left: 80, right: 80 },
                children: [
                  cellLabelPara(tituloTabelaNome),
                  cellValuePara(nomePessoaUpper)
                ]
              }),
              new TableCell({
                borders: tableCellBordersReq,
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 40, bottom: 40, left: 80, right: 80 },
                children: [
                  cellLabelPara('Nome da Mãe'),
                  cellValuePara(nomeMaePessoa)
                ]
              }),
            ]
          })
        ]
      });
      segundaPaginaChildren.push(tabelaProtocolo);
    });
  }

  // ===== REQUISIÇÃO DE EXAME DE GRAFOTÉCNICO =====
  if (opts.periciasGrafotecnica && opts.periciasGrafotecnica.length > 0) {
    const autoresArr = Array.isArray(opts.autores) ? opts.autores : [];
    const condutorNomeStr = String(condutor?.nome_completo || condutor?.nome || condutorNome || '').trim().toUpperCase();
    const condutorPostoStr = String(condutor?.graduacao || condutor?.posto || condutorPosto || '').trim().toUpperCase();
    const condutorRgPM = String(condutor?.rgpm || condutor?.rg || '').trim().toUpperCase();
    const condutorAssinaturaG = [condutorPostoStr, condutorNomeStr].filter(Boolean).join(' ') || '_________________________________';
    const numReq = String(opts.numeroRequisicao || opts.tcoNumber || '000').trim().replace(/\s+/g, ' ');
    const anoFato = (() => { try { const d = String(dataFato || '').trim(); const m = d.match(/(\d{4})/); if (m) return m[1]; } catch (e) {} return String(new Date().getFullYear()); })();

    const tableCellBordersGraf = {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    };

    const quesitosGraf = (nomeA: string) => [
      `A assinatura ou grafismo (identificar) lançada no documento encaminhado é autêntica ou falsa?`,
      `Sendo falsa, a assinatura ou grafismo lançada (identificar) no documento encaminhado a exame proveio do punho escritor de ${nomeA} que forneceu material gráfico padrão?`,
      `O grafismo questionado lançado no documento encaminhado a exame proveio do punho escritor de ${nomeA} que forneceu material gráfico padrão?`,
    ];

    opts.periciasGrafotecnica.forEach((nomeAutor, idx) => {
      const nomeAutorUpper = String(nomeAutor || '').trim().toUpperCase() || 'NOME NÃO INFORMADO';
      let pessoa: any = null;
      for (const a of autoresArr) {
        if (String(a?.nome || '').toUpperCase() === nomeAutorUpper) { pessoa = a; break; }
      }
      const cpfAutor = pessoa?.cpf ? String(pessoa.cpf).trim() : 'NÃO INFORMADO';
      const nomeMaeAutor = (pessoa?.filiacaoMae || '').trim().toUpperCase() || 'NÃO INFORMADO';
      const naturezaStr = String(natureza || 'Falsa identidade').trim();
      const dataFatoBR = formatDateBR(dataFato) || '__/__/____';
      const cidade = (extrairCidadeDoMunicipio(municipio) || 'VÁRZEA GRANDE').toUpperCase();
      const dataExt = formatCidadeDataExtenso(cidade, dataFato).toUpperCase();
      const quesitos = quesitosGraf(nomeAutorUpper);

      if (idx > 0 || segundaPaginaChildren.length > 0) {
        segundaPaginaChildren.push(new Paragraph({ children: [ new PageBreak() ] }));
      }

      // Título Grafotécnico 12pt negrito + (1) LINHA EM BRANCO ABAIXO
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0, line: 240 },
          children: [
            new TextRun({
              text: `REQUISIÇÃO DE EXAME DE GRAFOTÉCNICO nº ${numReq}/${unidadeAbr}/${crAbr}/${anoFato}`,
              bold: true,
              size: 24
            })
          ]
        }),
        new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: ' ' }) ] }),
      );

      // Corpo legal (12pt)
      const corpoGraf = `Requisito a POLITEC - Perícia Oficial e Identificação Técnica, nos termos dos artigos 174 e 235 do Código de Processo Penal e artigo 69 Caput da Lei n.º 9.099/1995, a realização de exame grafotécnico no (a) Sr. (a) ${nomeAutorUpper}, autor do fato, portador(a) do CPF ${cpfAutor}, qualificado no Termo Circunstanciado de Ocorrência nº ${numeroDisplay}, de natureza ${naturezaStr}, ocorrido na data ${dataFatoBR}, respondendo para tal os seguintes quesitos:`;
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: convertMillimetersToTwip(25) },
          spacing: { before: 0, after: 0, line: 240 },
          children: [ new TextRun({ text: corpoGraf.toUpperCase(), size: 24 }) ]
        }),
        // (2) LINHA EM BRANCO ENTRE CORPO LEGAL E QUESITO 1
        new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: ' ' }) ] }),
      );

      // 3 Quesitos (SOMENTE aqui 10pt = size 20, compactos)
      quesitos.forEach((q, i) => {
        segundaPaginaChildren.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: convertMillimetersToTwip(25) },
            spacing: { before: 0, after: 10, line: 226 },
            children: [ new TextRun({ text: `${i + 1}. ${q.toUpperCase()}`, size: 20 }) ]
          })
        );
      });

      // DESTINO DO LAUDO + observação VERMELHA itálico + (3) LINHA EM BRANCO ANTES DA DATA - USA UNIDADE, NUNCA CR!
      const destinoLaudoG = (unidadeAbr && unidadeAbr.trim()) ? String(unidadeAbr).trim().toUpperCase() : String(unidadeLinha || '').trim().toUpperCase();
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 10, line: 240 },
          children: [
            new TextRun({ text: 'DESTINO DO LAUDO: ', bold: true, size: 24 }),
            new TextRun({ text: destinoLaudoG, size: 24 })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 0, line: 240 },
          children: [ new TextRun({ text: '(verificar quais quesitos são aplicáveis ao fato)'.toUpperCase(), italics: true, size: 24, color: "FF0000" }) ]
        }),
        new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [ new TextRun({ text: ' ' }) ] }),
      );

      // Local e data (12pt)
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 0, after: 80, line: 240 },
          children: [ new TextRun({ text: dataExt, size: 24 }) ]
        }),
      );

      // PADRÃO OFICIAL DE ASSINATURA: Nome+Posto → CONDUTOR → RG Nº XXXX PMMT
      const rgpmGraf = condutorRgPM || '____________________';
      segundaPaginaChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 10, line: 240 },
          children: [ new TextRun({ text: condutorAssinaturaG, bold: true, size: 24 }) ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 10, line: 240 },
          children: [ new TextRun({ text: 'CONDUTOR DA OCORRÊNCIA'.toUpperCase(), size: 24 }) ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 20, line: 240 },
          children: [ new TextRun({ text: `RG Nº ${rgpmGraf} PMMT`.toUpperCase(), size: 24 }) ]
        }),
      );

      // Tabela Inferior (3 colunas, 2 linhas / célula) - COMPACTA
      const gLabel = (txt: string) => new Paragraph({
        spacing: { before: 0, after: 10, line: 236 },
        children: [ new TextRun({ text: `${txt}:`, bold: true, size: 24 }) ]
      });
      const gValue = (txt: string) => new Paragraph({
        spacing: { before: 0, after: 0, line: 236 },
        children: [ new TextRun({ text: txt.toUpperCase(), size: 24 }) ]
      });
      const tabelaGraf = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [3000, 3000, 3000],
        rows: [
          new TableRow({
            height: { value: convertMillimetersToTwip(20), rule: HeightRule.ATLEAST },
            children: [
              new TableCell({
                borders: tableCellBordersGraf,
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 40, bottom: 40, left: 80, right: 80 },
                children: [ gLabel('DATA'), gValue(dataFatoBR) ]
              }),
              new TableCell({
                borders: tableCellBordersGraf,
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 40, bottom: 40, left: 80, right: 80 },
                children: [ gLabel('Nome Autor do Fato'), gValue(nomeAutorUpper) ]
              }),
              new TableCell({
                borders: tableCellBordersGraf,
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 40, bottom: 40, left: 80, right: 80 },
                children: [ gLabel('Nome da Mãe'), gValue(nomeMaeAutor) ]
              }),
            ]
          })
        ]
      });
      segundaPaginaChildren.push(tabelaGraf);
    });
  }
  // ===== TERMO DE APREENSÃO (somente se houver apreensões ou drogas) =====
  const hasSeizure = (apreensoes && apreensoes.trim() !== '') || (drogas && drogas.length > 0);
  const isDrogaNatureza2 = ((natureza || '').toLowerCase().includes('droga')) || ((drogas && drogas.length > 0));
  if (hasSeizure && !isDrogaNatureza2) {
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
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: tituloApreensao, bold: true, size: 28 }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
    );

    // Tabela principal (linhas essenciais)
    const horaApreensao = (horaTerminoRegistro || horaFato || '__:__');
    const descricaoLinha2 = (drogas && drogas.length > 0
      ? drogas.map((drug, idx) => `${idx + 1}. ${drug.quantidade} de substância ${drug.substancia.toLowerCase()} de cor ${drug.cor.toLowerCase()}, com odor ${drug.odor.toLowerCase()}${drug.indicios ? `, ${drug.indicios.toLowerCase()}` : ''}${(idx === drogas.length - 1 && lacreNumero) ? `, tudo acondicionado sob o lacre nº ${lacreNumero}.` : '.'}`).join(' ')
      : ((apreensoes || '').trim() || '—'));
    const tabela = new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: [3000, 3000, 3000],
      rows: [
        new TableRow({
          height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST },
          children: [
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('DATA', formatDateBR(dataFato) || '___/___/______') ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('HORA', horaApreensao) ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('LOCAL', unidadeLinha) ] }),
          ]
        }),
        new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, columnSpan: 3, children: [ labelValueParagraph('NOME DO POLICIAL', `${condutorNome} ${condutorPosto}`.trim()) ] }) ] }),
        new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, columnSpan: 3, children: [ labelValueParagraph('FILIAÇÃO PAI', (condutor?.pai || '').toUpperCase()) ] }) ] }),
        new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, columnSpan: 3, children: [ labelValueParagraph('FILIAÇÃO MÃE', (condutor?.mae || '').toUpperCase()) ] }) ] }),
        new TableRow({
          height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST },
          children: [
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('NATURALIDADE', (condutor?.naturalidade || '').toUpperCase()) ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('RGPM', condutor?.rg || '') ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('CPF', condutor?.cpf || '') ] }),
          ]
        }),
        new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, columnSpan: 3, children: [ labelValueParagraph('END.', (endereco || '').toUpperCase()) ] }) ] }),
        new TableRow({
          height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST },
          children: [
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('MUNICÍPIO', (municipio || '').toUpperCase()) ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('UF', 'MT') ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('TEL', condutor?.telefone || '') ] }),
          ]
        }),
        new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, columnSpan: 3, children: [ new Paragraph({ children: [ new TextRun({ text: 'FICA APREENDIDO O DESCRITO ABAIXO: ', bold: true }), new TextRun({ text: descricaoLinha2 }) ] }) ] }) ] }),
        new TableRow({ height: { value: convertMillimetersToTwip(15), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, columnSpan: 3, children: [
          new Paragraph({ children: [ new TextRun({ text: (drogas && drogas.length > 0)
            ? 'O PRESENTE TERMO TEM POR OBJETIVO APENAS A CONSTATAÇÃO PRELIMINAR DA NATUREZA DA SUBSTÂNCIA PARA FINS DE LAVRATURA DO TERMO CIRCUNSTANCIADO, NÃO SUPRINDO O EXAME PERICIAL DEFINITIVO (ART. 50, §1º DA LEI 11.343/2006).' 
            : 'O PRESENTE TERMO DE APREENSÃO FOI LAVRADO COM BASE NO ART. 6º, II, DO CÓDIGO DE PROCESSO PENAL.' }) ] })
        ] }) ] })
      ]
    });

    segundaPaginaChildren.push(tabela);
    // Data e identificação do condutor
    segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
    segundaPaginaChildren.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ text: String(formatCidadeDataExtenso(extrairCidadeDoMunicipio(municipio) || 'VÁRZEA GRANDE', dataFato)).toUpperCase() }) ] }));
    segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
    segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
    segundaPaginaChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: `${(condutorNome || '').trim()} ${condutorPosto ? condutorPosto : ''}`.trim() || '__________________________', bold: true }) ] }));
    segundaPaginaChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'CONDUTOR DA OCORRÊNCIA' }) ] }));
    
  }

  {
    const shouldDeposit = (String(nomearFielDepositario || '').trim().toLowerCase() === 'sim') && !!fielDepositarioSelecionado && ((apreensoes && apreensoes.trim() !== '') || (drogas && drogas.length > 0));
    if (shouldDeposit) {
      const parts = String(fielDepositarioSelecionado).split('-');
      const tipo = parts[0];
      const idx = parseInt(parts[1] || '0', 10);
      let pessoa: any = null;
      if (tipo === 'autor' && Array.isArray(autores) && autores[idx]) pessoa = autores[idx];
      if (tipo === 'vitima' && Array.isArray(vitimas) && vitimas[idx]) pessoa = vitimas[idx];
      if (tipo === 'testemunha' && Array.isArray(testemunhas) && testemunhas[idx]) pessoa = testemunhas[idx];
      const nomeFiel = (pessoa?.nome || parts.slice(2).join('-') || '').toUpperCase();
      const cpfFiel = pessoa?.cpf || '';
      const paiFiel = (pessoa?.filiacaoPai || '').toUpperCase();
      const maeFiel = (pessoa?.filiacaoMae || '').toUpperCase();
      const enderecoFiel = (pessoa?.endereco || '').toUpperCase();
      const telFiel = pessoa?.celular || '';
      const municipioFiel = (municipio || '').toUpperCase();
      const horaDep = (horaTerminoRegistro || horaFato || '__:__');
      const dataDep = formatDateBR(dataTerminoRegistro) || formatDateBR(dataFato) || '___/___/______';
      const tableCellBorders = {
        top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      };
      const labelValueParagraph = (label: string, value: string) => new Paragraph({ children: [ new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value }) ] });
      const descricaoBem = (drogas && drogas.length > 0)
        ? drogas.map((drug, idx) => `${idx + 1}. ${drug.quantidade} de substância ${String(drug.substancia || '').toLowerCase()} de cor ${String(drug.cor || '').toLowerCase()}, com odor ${String(drug.odor || '').toLowerCase()}${drug.indicios ? `, ${String(drug.indicios).toLowerCase()}` : ''}${(idx === drogas.length - 1 && lacreNumero) ? `, acondicionado sob o lacre nº ${lacreNumero}.` : '.'}`).join(' ')
        : ((apreensoes || '').trim() || '—');
      segundaPaginaChildren.push(new Paragraph({ children: [ new PageBreak() ] }));
      segundaPaginaChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'TERMO DE DEPÓSITO', bold: true, size: 28 }) ] }));
      segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
      segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
      segundaPaginaChildren.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: convertMillimetersToTwip(25) }, children: [ new TextRun({ text: 'NOMEIO COMO FIEL DEPOSITÁRIO, FICANDO CIENTE DE QUE NÃO PODERÁ VENDER, USUFRUIR, EMPRESTAR OS BENS MENCIONADOS, CONFORME OS ARTIGOS 647 E 648 DO CÓDIGO CIVIL.' }) ] }));
      segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
      const tabelaDep = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('NOME OU RAZÃO SOCIAL', nomeFiel) ] }) ] }),
          new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('CPF/CNPJ', cpfFiel) ] }) ] }),
          new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('FILIAÇÃO PAI', paiFiel) ] }) ] }),
          new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('FILIAÇÃO MÃE', maeFiel) ] }) ] }),
          new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('ENDEREÇO', enderecoFiel) ] }) ] }),
          new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('MUNICÍPIO', municipioFiel) ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('UF', 'MT') ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('TELEFONE', telFiel) ] })
          ] }),
          new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('LOCAL DO DEPÓSITO', enderecoFiel) ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('DATA', dataDep) ] }),
            new TableCell({ borders: tableCellBorders, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('HORA', horaDep) ] })
          ] }),
          new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('DESCRIÇÃO DO BEM', descricaoBem) ] }) ] }),
          new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [ new TableCell({ borders: tableCellBorders, columnSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [ labelValueParagraph('RECEBI OS BENS DEPOSITADOS EM', dataDep) ] }) ] })
        ]
      });
      segundaPaginaChildren.push(tabelaDep);
      const pmIdent = `${(condutor?.graduacao || condutorPosto || '').toUpperCase()} ${((condutor?.rgpm || condutor?.rg || '')).toUpperCase()} ${(condutor?.nome_completo || condutorNome || '').toUpperCase()}`.trim();
      segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
      segundaPaginaChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: nomeFiel, bold: true }) ] }));
      segundaPaginaChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'FIEL DEPOSITÁRIO' }) ] }));
      segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
      segundaPaginaChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: pmIdent || '', bold: true }) ] }));
      segundaPaginaChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'CONDUTOR DA OCORRÊNCIA' }) ] }));
      const tabelaTestemunha = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ height: { value: convertMillimetersToTwip(6.2), rule: HeightRule.ATLEAST }, children: [
            new TableCell({ borders: tableCellBorders, columnSpan: 2, children: [ new Paragraph({ children: [ new TextRun({ text: 'Testemunha', bold: true }) ] }) ] })
          ] }),
          new TableRow({ height: { value: convertMillimetersToTwip(13), rule: HeightRule.ATLEAST }, children: [
            new TableCell({ borders: tableCellBorders, children: [ labelValueParagraph('Nome', '') ] }),
            new TableCell({ borders: tableCellBorders, children: [ labelValueParagraph('Assinatura', '') ] })
          ] })
        ]
      });
      segundaPaginaChildren.push(new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }));
      segundaPaginaChildren.push(tabelaTestemunha);
      
    }
  }

  {
    const d = obterDataCuiaba();
    const cidadeEnc = (extrairCidadeDoMunicipio(municipio) || 'VÁRZEA GRANDE').toUpperCase();
    const texto = `AOS ${numeroAte99PorExtenso(d.dia)} DIAS DO MÊS DE ${mesPorExtenso(d.mes)} DO ANO DE ${anoPorExtenso(d.ano)}, NESTA CIDADE DE ${cidadeEnc}, ESTADO DE MATO GROSSO, DOU POR ENCERRADA A LAVRATURA DO PRESENTE TERMO CIRCUNSTANCIADO DE OCORRÊNCIA Nº ${numeroDisplay}, PARA AS PROVIDÊNCIAS DE REMESSA DOS AUTOS PARA APRECIAÇÃO DO NÚCLEO DE JUSTIÇA DIGITAL DOS JUIZADOS ESPECIAIS.`;
    segundaPaginaChildren.push(
      new Paragraph({ children: [ new PageBreak() ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'TERMO DE ENCERRAMENTO E REMESSA', bold: true, size: 28 }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: convertMillimetersToTwip(25) }, children: [ new TextRun({ text: texto }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ text: String(formatCidadeDataExtenso(cidadeEncAll, dataFato)).toUpperCase() }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
      new Paragraph({ children: [ new TextRun({ text: ' ' }) ] }),
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

  return { doc, filename: `TCO_${(tcoNumber || '').trim() || 'DOCUMENTO'}.docx` };
}

export async function downloadTcoDocx(opts: TcoDocOptions): Promise<{ blob: Blob; filename: string }> {
  const { Packer } = await import('docx');
  const { doc, filename } = await generateTcoDocObject(opts);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { blob, filename };
}

export async function generateTcoBase64(opts: TcoDocOptions) {
  const { Packer } = await import('docx');
  const { doc, filename } = await generateTcoDocObject(opts);
  const base64 = await Packer.toBase64String(doc);
  return { base64, filename };
}