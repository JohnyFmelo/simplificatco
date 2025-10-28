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

export async function downloadTcoDocx(opts: {
  unidade?: string | null;
  cr?: string | null;
  tcoNumber?: string;
  natureza?: string;
  autoresNomes?: string[];
  condutor?: { nome: string; posto: string; rg: string } | undefined;
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
  vitimas?: Array<{ nome: string; sexo: string; estadoCivil: string; profissao: string; endereco: string; dataNascimento: string; naturalidade: string; filiacaoMae: string; filiacaoPai: string; rg: string; cpf: string; celular: string; email: string; semCpf?: string; }>;
}) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, ImageRun, PageBreak } = await import('docx');

  const { unidade, cr, tcoNumber, natureza, autoresNomes, condutor, localRegistro, municipio, tipificacao, dataFato, horaFato, dataInicioRegistro, horaInicioRegistro, dataTerminoRegistro, horaTerminoRegistro, localFato, endereco, comunicante, testemunhas, vitimas } = opts;

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
      children: [new TextRun({ text: '—'.repeat(48), font: 'Times New Roman', size: 20 })],
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

  // ===== Corpo da página: AUTUAÇÃO =====
  const { dia, mes, ano } = obterDataCuiaba();
  const diaExtenso = numeroAte99PorExtenso(dia);
  const mesExtenso = mesPorExtenso(mes);
  const anoExtenso = anoPorExtenso(ano);
  const cidade = extrairCidadeDoMunicipio(municipio);

  const crSemEspaco = (crAbr || '').replace(/\s+/g, '');
  const numeroDisplay = `${(tcoNumber || '').trim()}.${crSemEspaco}.${ano}`;

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
    new Paragraph({ children: [ new TextRun({ text: '2. PESSOAS ENVOLVIDAS', bold: true }) ] }),
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

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 24 }, paragraph: { spacing: { before: 0, after: 0 } } } }
    },
    sections: [
      // Primeira seção: AUTUAÇÃO
      {
        properties: { page: { margin: { top: 720, right: 1134, bottom: 720, left: 1134, header: 240, footer: 360 } } },
        headers: { default: new Header({ children: headerChildren }) },
        footers: { default: new Footer({ children: footerChildren }) },
        children: [
          ...corpoChildren,
          new Paragraph({ children: [ new PageBreak() ] }) // Quebra de página
        ],
      },
      // Segunda seção: DADOS GERAIS
      {
        properties: { page: { margin: { top: 720, right: 1134, bottom: 720, left: 1134, header: 240, footer: 360 } } },
        headers: { default: new Header({ children: headerChildren }) },
        footers: { default: new Footer({ children: footerChildren }) },
        children: segundaPaginaChildren,
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