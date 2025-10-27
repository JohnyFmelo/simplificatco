// src/components/tco/PDF/pdfUtils.js

// --- Constantes ---
export const MARGIN_LEFT = 20;
export const MARGIN_RIGHT = 20;
export const MARGIN_TOP = 15;
export const MARGIN_BOTTOM = 15;
export const FOOTER_AREA_HEIGHT = 25; // Estimativa
export const HEADER_AREA_HEIGHT = 28; // Estimativa

// --- Funções Utilitárias Gerais ---

// Helper function to convert number to Portuguese extenso (simplified version)
export const numeroPorExtenso = (num) => {
    const unidades = ["", "UM", "DOIS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE"];
    const especiais = ["DEZ", "ONZE", "DOZE", "TREZE", "CATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZOITO", "DEZENOVE"];
    const dezenas = ["", "", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA"];
    const centenas = ["", "CENTO", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"];

    if (num === 0) return "ZERO";
    if (num === 100) return "CEM";
    if (num === 1000) return "MIL";

    let extenso = "";
    const strNum = String(num).padStart(4, '0'); // Pad for easier handling up to 9999

    // Milhares
    const milhar = parseInt(strNum[0]);
    if (milhar > 0) {
        extenso += (milhar === 1 ? "MIL" : unidades[milhar] + " MIL");
    }

    // Centenas
    const centena = parseInt(strNum[1]);
    if (centena > 0) {
        if (extenso && milhar > 0) extenso += (parseInt(strNum.substring(1)) % 100 !== 0 ? " " : " ");
         else if (extenso && milhar === 0 && parseInt(strNum.substring(1)) !== 0) extenso += " E "; // Adiciona "E" entre centena e dezena/unidade se não houver milhar

        if (centena === 1 && parseInt(strNum.substring(2)) === 0) {
             extenso += "CEM";
        } else {
            extenso += centenas[centena];
        }
    }

    // Dezenas e Unidades
    const dezenaUnidade = parseInt(strNum.substring(2));
    if (dezenaUnidade > 0) {
        // Adiciona "E" se já houver milhar ou centena
        if (extenso && (milhar > 0 || centena > 0) ) extenso += " E ";

        if (dezenaUnidade < 10) {
            extenso += unidades[dezenaUnidade];
        } else if (dezenaUnidade < 20) {
            extenso += especiais[dezenaUnidade - 10];
        } else {
            const dezena = parseInt(strNum[2]);
            const unidade = parseInt(strNum[3]);
            extenso += dezenas[dezena];
            if (unidade > 0) {
                extenso += " E " + unidades[unidade];
            }
        }
    }
    if (num === 2000) return "DOIS MIL"; // Caso especial

    return extenso.trim();
};

// Helper function to get current date in Portuguese extenso format
export const getDataAtualExtenso = () => {
    const hoje = new Date();
    const dia = hoje.getDate();
    const mes = hoje.getMonth();
    const ano = hoje.getFullYear();
    const meses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const diaExtenso = dia === 1 ? "PRIMEIRO" : numeroPorExtenso(dia);
    const mesExtenso = meses[mes];
    const anoExtenso = numeroPorExtenso(ano);
    return `AOS ${diaExtenso} DIAS DO MÊS DE ${mesExtenso} DO ANO DE ${anoExtenso}`;
};

// Helper function to format date as DD/MM/YYYY
export const formatarDataSimples = (dataInput) => {
    if (!dataInput) return "Data não informada";
    try {
        // Tenta criar a data assumindo UTC para evitar problemas de fuso horário
        // que podem mudar o dia dependendo da hora e do fuso local
        const [year, month, day] = String(dataInput).split('-').map(Number);
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
             // Fallback se o formato não for YYYY-MM-DD
            const dataObj = new Date(dataInput + 'T00:00:00Z'); // Tenta parsear como UTC
            const d = String(dataObj.getUTCDate()).padStart(2, '0');
            const m = String(dataObj.getUTCMonth() + 1).padStart(2, '0');
            const y = dataObj.getUTCFullYear();
             if (isNaN(d) || isNaN(m) || isNaN(y)) return "Data inválida";
             return `${d}/${m}/${y}`;

        } else {
             // Formato YYYY-MM-DD detectado
             const d = String(day).padStart(2, '0');
             const m = String(month).padStart(2, '0');
             const y = year;
             // Verifica validade básica
             if (m < 1 || m > 12 || d < 1 || d > 31) return "Data inválida";
             return `${d}/${m}/${y}`;
        }


    } catch (e) {
        console.error("Erro ao formatar data:", dataInput, e);
        return "Data inválida";
    }
};


// Helper function to format date and time as DD/MM/YYYY - HH:MM
export const formatarDataHora = (dataInput, horaInput) => {
    const dataFormatada = formatarDataSimples(dataInput);
    const horaFormatada = horaInput || "Hora não informada";
    if (dataFormatada.includes("Data") && horaFormatada === "Hora não informada") {
        return "Data e Hora não informadas";
    }
     if (dataFormatada.includes("Data")) {
        return horaFormatada; // Se só a hora foi informada
     }
     if (horaFormatada === "Hora não informada"){
        return dataFormatada; // Se só a data foi informada
     }
    // Remove segundos se existirem na horaInput (ex: HH:MM:SS)
    const horaMinuto = horaFormatada.split(':').slice(0, 2).join(':');
    return `${dataFormatada} - ${horaMinuto}`;
};

/** Adiciona uma linha simples no documento */
export const addLine = (doc, x1, y, x2) => {
    doc.setLineWidth(0.3);
    doc.line(x1, y, x2, y);
};

// --- Funções Auxiliares de Geração de PDF ---

/** Retorna as dimensões e constantes calculadas para a página */
export const getPageConstants = (doc) => {
    const PAGE_WIDTH = doc.internal.pageSize.getWidth();
    const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
    const MAX_LINE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
    // Considera a área efetivamente usável descontando cabeçalho e rodapé fixos
    const USABLE_PAGE_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - HEADER_AREA_HEIGHT - FOOTER_AREA_HEIGHT;
    // A altura *real* onde o conteúdo pode ser escrito na primeira vez, antes de atingir o rodapé
    const MAX_Y_POSITION = PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_AREA_HEIGHT;
    return { PAGE_WIDTH, PAGE_HEIGHT, MAX_LINE_WIDTH, USABLE_PAGE_HEIGHT, MAX_Y_POSITION };
};

/** Adiciona Cabeçalho padrão */
export const addStandardHeaderContent = (doc, data = {}) => {
    const { PAGE_WIDTH } = getPageConstants(doc);
    let headerY = MARGIN_TOP;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("ESTADO DE MATO GROSSO", PAGE_WIDTH / 2, headerY, { align: "center" }); headerY += 4;
    doc.text("POLÍCIA MILITAR", PAGE_WIDTH / 2, headerY, { align: "center" }); headerY += 4;
    doc.text("25º BPM / 2º CR", PAGE_WIDTH / 2, headerY, { align: "center" }); headerY += 5;
    doc.setDrawColor(0); doc.setLineWidth(0.2);
    doc.line(MARGIN_LEFT, headerY, PAGE_WIDTH - MARGIN_RIGHT, headerY); headerY += 4;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const tcoNum = data?.tcoNumber || "Não informado."; // Pega dos dados passados
    const year = new Date().getFullYear(); // Pega o ano atual dinamicamente
    doc.text(`REF.:TERMO CIRCUNSTANCIADO DE OCORRÊNCIA Nº ${tcoNum}/2ºCR/${year}`, MARGIN_LEFT, headerY);
};

/** Adiciona Rodapé padrão */
export const addStandardFooterContent = (doc) => {
    const { PAGE_WIDTH, PAGE_HEIGHT, MAX_LINE_WIDTH } = getPageConstants(doc);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const footerText = "25º Batalhão de Polícia Militar\nAv. Dr. Paraná, s/nº complexo da Univag, ao lado do núcleo de Pratica Jurídica. Bairro Cristo Rei\nCEP 78.110-100, Várzea Grande - MT";
    const footerLines = doc.splitTextToSize(footerText, MAX_LINE_WIDTH);
    // Posiciona o rodapé a partir da margem inferior da página
    let footerY = PAGE_HEIGHT - MARGIN_BOTTOM - (footerLines.length * 3) - 2; // Pequeno ajuste para subir um pouco
    footerLines.forEach(line => {
        doc.text(line, PAGE_WIDTH / 2, footerY, { align: "center" });
        footerY += 3; // Espaçamento entre linhas do rodapé
    });
};

/** Adiciona uma nova página com cabeçalho e rodapé e retorna a nova posição Y inicial */
export const addNewPage = (doc, data) => {
    doc.addPage();
    addStandardHeaderContent(doc, data); // Adiciona cabeçalho padrão
    addStandardFooterContent(doc); // Adiciona rodapé padrão
    return MARGIN_TOP + HEADER_AREA_HEIGHT; // Retorna a posição Y inicial para conteúdo (abaixo do cabeçalho)
};

/** Verifica a necessidade de quebra de página e a executa se necessário, retornando a nova yPosition */
export const checkPageBreak = (doc, currentY, contentHeightEstimate = 10, data) => {
    const { MAX_Y_POSITION } = getPageConstants(doc);
    let newY = currentY;
    // Verifica se a posição Y atual mais a altura estimada do conteúdo
    // ultrapassa a linha limite antes da área do rodapé.
    if (currentY + contentHeightEstimate > MAX_Y_POSITION) {
        newY = addNewPage(doc, data); // Adiciona nova página e obtém a nova Y inicial
    }
    return newY; // Retorna a Y atual ou a nova Y da página seguinte
};

/** Adiciona texto com quebra de linha automática e lida com quebras de página */
export const addWrappedText = (doc, currentY, text, x, fontSize, fontStyle = "normal", maxWidth, align = 'left', data) => {
    const { MAX_LINE_WIDTH: defaultMaxWidth, MAX_Y_POSITION } = getPageConstants(doc);
    const effectiveMaxWidth = maxWidth || defaultMaxWidth;
    let yPos = currentY;

    // Garante que o texto seja uma string válida
    let textToRender;
    if (text === null || text === undefined || text === '') {
        textToRender = "Não informado.";
    } else {
        textToRender = String(text);
    }

    // Garante que x seja um número válido
    const validX = typeof x === 'number' && !isNaN(x) ? x : MARGIN_LEFT;
    
    // Garante que fontSize seja um número válido
    const validFontSize = typeof fontSize === 'number' && !isNaN(fontSize) && fontSize > 0 ? fontSize : 12;
    
    // Garante que fontStyle seja uma string válida
    const validFontStyle = typeof fontStyle === 'string' && fontStyle ? fontStyle : "normal";
    
    // Garante que align seja uma string válida
    const validAlign = typeof align === 'string' && ['left', 'center', 'right', 'justify'].includes(align) ? align : 'left';

    doc.setFont("helvetica", validFontStyle);
    doc.setFontSize(validFontSize);

    const lines = doc.splitTextToSize(textToRender, effectiveMaxWidth);
    const lineHeight = validFontSize * 0.3528 * 1.2; // Ajuste de espaçamento entre linhas (fator 1.2)

    let currentLineIndex = 0;
    while (currentLineIndex < lines.length) {
        // Verifica espaço ANTES de tentar adicionar QUALQUER linha
        yPos = checkPageBreak(doc, yPos, lineHeight, data); // Verifica se cabe ao menos UMA linha

        // Calcula quantas linhas cabem na PÁGINA ATUAL a partir da yPos ATUAL
        const spaceLeftOnPage = MAX_Y_POSITION - yPos;
        let linesThatFit = Math.max(0, Math.floor(spaceLeftOnPage / lineHeight));

        // Caso especial: Se estamos bem no início e ainda assim não cabe, pode ser um erro.
        if (linesThatFit === 0 && yPos <= (MARGIN_TOP + HEADER_AREA_HEIGHT + 1)) {
            console.warn("Não há espaço nem no topo da página para uma linha:", lines[currentLineIndex]);
             // Força ir para a próxima linha do texto para evitar loop, mas pode perder texto.
             // O ideal seria reduzir a fonte ou ajustar margens se isso ocorrer.
            currentLineIndex++;
            continue; // Tenta a próxima linha
        }
        // Se não cabe nada, força nova página (checkPageBreak deveria ter pego, mas é segurança)
         else if (linesThatFit === 0) {
              yPos = addNewPage(doc, data);
              // Recalcula quantas linhas cabem na nova página
              const newSpaceLeft = MAX_Y_POSITION - yPos;
              linesThatFit = Math.max(0, Math.floor(newSpaceLeft / lineHeight));
         }

        const linesToRenderNow = lines.slice(currentLineIndex, currentLineIndex + linesThatFit);

        if (linesToRenderNow.length > 0) {
            doc.setFont("helvetica", validFontStyle);
            doc.setFontSize(validFontSize);
            
            // Garante que yPos seja um número válido
            const validYPos = typeof yPos === 'number' && !isNaN(yPos) ? yPos : MARGIN_TOP + HEADER_AREA_HEIGHT;
            
            // Passa argumentos válidos para doc.text
            try {
                doc.text(linesToRenderNow, validX, validYPos, { 
                    align: validAlign, 
                    maxWidth: effectiveMaxWidth 
                });
            } catch (error) {
                console.error("Erro ao adicionar texto:", error, {
                    lines: linesToRenderNow,
                    x: validX,
                    y: validYPos,
                    align: validAlign,
                    maxWidth: effectiveMaxWidth
                });
                // Fallback: tenta adicionar sem opções
                doc.text(String(linesToRenderNow[0] || ""), validX, validYPos);
            }
            
            yPos += linesToRenderNow.length * lineHeight; // Atualiza yPos para depois das linhas adicionadas
            currentLineIndex += linesToRenderNow.length; // Avança o índice das linhas gerais do texto
        } else if (currentLineIndex < lines.length) {
            // Se ainda há linhas, mas NENHUMA coube (caso extremo que não deveria acontecer com checkPageBreak)
             console.warn("Loop inesperado em addWrappedText, forçando nova página. Linha:", lines[currentLineIndex]);
             yPos = addNewPage(doc, data); // Força nova página
             // Não incrementa currentLineIndex aqui, tenta de novo na próxima iteração após a nova página
        } else {
             break; // Todas as linhas foram processadas
        }
    }
    return yPos; // Retorna a posição Y final após adicionar todo o texto
};

/** Adiciona um título de seção */
export const addSectionTitle = (doc, currentY, title, number, level = 1, data) => {
    const titleHeight = level === 1 ? 8 : 6; // Altura estimada do título
    const spacingBefore = level === 1 ? 4 : 3; // Espaço antes do título
    let yPos = checkPageBreak(doc, currentY, titleHeight + spacingBefore, data); // Verifica espaço ANTES
    yPos += spacingBefore;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const indent = level === 1 ? 0 : 5; // Indentação para níveis secundários
    const prefix = level === 1 ? `${number}.` : `${number}`; // Numeração com ou sem ponto final
    const titleText = level === 1 ? `${prefix} ${title.toUpperCase()}` : `${prefix} ${title.toUpperCase()}`;
    const { MAX_LINE_WIDTH } = getPageConstants(doc);

    // Usa addWrappedText para renderizar o título, garantindo quebra de página se necessário
    yPos = addWrappedText(doc, yPos, titleText, MARGIN_LEFT + indent, 12, "bold", MAX_LINE_WIDTH - indent, 'left', data);
    yPos += 2; // Espaço padrão após o título
    return yPos; // Retorna a posição Y após o título
};

/** Adiciona um campo simples (Label: Value) */
export const addField = (doc, currentY, label, value, data) => {
    const placeholder = "Não informado.";
    const displayValue = value === undefined || value === null || value === '' ? placeholder : String(value);
    const text = `${label}: ${displayValue}`;
    const fontSize = 12;
    const { MAX_LINE_WIDTH } = getPageConstants(doc);

    // Estima a altura ANTES de adicionar, para a verificação de página
    doc.setFont("helvetica", "normal"); // Define a fonte correta para cálculo
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, MAX_LINE_WIDTH);
    const textHeight = lines.length * (fontSize * 0.3528 * 1.2) + 2; // Altura + espaço depois

    let yPos = checkPageBreak(doc, currentY, textHeight, data); // Verifica espaço

    // Adiciona o texto usando a função addWrappedText que lida com quebras internas
    yPos = addWrappedText(doc, yPos, text, MARGIN_LEFT, fontSize, "normal", MAX_LINE_WIDTH, 'left', data);
    yPos += 2; // Espaço depois do campo
    return yPos;
};

/** Adiciona um campo com label em negrito (Label: Value) */
export const addFieldBoldLabel = (doc, currentY, label, value, data) => {
    const placeholder = "Não informado.";
    const displayValue = value === undefined || value === null || value === '' ? placeholder : String(value);
    const fontSize = 12;
    const lineHeight = fontSize * 0.3528 * 1.2;
    const { MAX_LINE_WIDTH } = getPageConstants(doc);

    // Calcula largura do label em negrito
    const labelText = `${label}:`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    const labelWidth = doc.getTextWidth(labelText) + 2; // Largura do label + pequeno espaço

    // Calcula linhas e altura estimada do valor (com fonte normal)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const valueLines = doc.splitTextToSize(String(displayValue), MAX_LINE_WIDTH - labelWidth);
    // A altura total estimada é o máximo de linhas (label vs valor) * altura da linha + espaço depois
    const estimatedHeight = Math.max(1, valueLines.length) * lineHeight + 2;

    let yPos = checkPageBreak(doc, currentY, estimatedHeight, data); // Verifica espaço ANTES

    // Guarda a posição Y antes de adicionar o label (para alinhar o valor)
    const yBeforeLabel = yPos;

    // Adiciona o Label em negrito
    // Usar addWrappedText garante segurança, mas é esperado 1 linha
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    let yAfterLabel = addWrappedText(doc, yPos, labelText, MARGIN_LEFT, fontSize, "bold", labelWidth, 'left', data);
    // yPos para o valor começa na mesma linha do label
    yPos = yBeforeLabel;

    // Adiciona o Valor com fonte normal, ao lado do label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const valueX = MARGIN_LEFT + labelWidth; // Posição X para o valor
    let yAfterValue = addWrappedText(doc, yPos, displayValue, valueX, fontSize, "normal", MAX_LINE_WIDTH - labelWidth, 'left', data);

    // A posição final Y deve ser a maior entre o final do label e o final do valor
    // Isso cobre casos onde o valor tem mais linhas que o label (ou vice-versa, embora raro)
    yPos = Math.max(yAfterLabel, yAfterValue);
    yPos += 2; // Espaço depois do campo completo
    return yPos;
};


/** Adiciona bloco de assinatura com linha, nome e cargo */
export const addSignatureWithNameAndRole = (doc, currentY, name, role, data) => {
    const blockHeight = 25; // Altura estimada (linha + nome + cargo + espaçamentos)
    let yPos = checkPageBreak(doc, currentY, blockHeight, data); // Verifica espaço ANTES

    yPos += 8; // Espaço antes da linha de assinatura
    const lineY = yPos; // Posição Y da linha
    const lineEndX = MARGIN_LEFT + 80; // Comprimento da linha de assinatura
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, lineY, lineEndX, lineY); // Desenha a linha
    yPos += 4; // Espaço após a linha, antes do nome

    // --- Adiciona Nome ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const nameStartY = yPos; // Guarda a posição Y inicial para o nome
    const displayName = (name && String(name).trim() !== "") ? String(name).toUpperCase() : null;
    let yAfterName = nameStartY; // Posição após o nome (pode mudar se tiver várias linhas)

    if (displayName) {
        // Usa addWrappedText para o nome (caso seja muito longo), limitado à largura da linha
        yAfterName = addWrappedText(doc, nameStartY, displayName, MARGIN_LEFT, 10, "normal", 80, 'left', data);
    } else {
        // Se não há nome, mas há cargo, reserva um espaço vertical mínimo para alinhar o cargo
        if (role && String(role).trim() !== "") {
           // Adiciona meia altura de linha para simular um espaço vazio
           yAfterName = nameStartY + (10 * 0.3528 * 1.2) * 0.5;
        }
    }
     // Define a posição inicial para o cargo baseado em onde o nome terminou
    yPos = yAfterName;

    // --- Adiciona Cargo ---
    const displayRole = (role && String(role).trim() !== "") ? String(role).toUpperCase() : null;
     if (displayRole) {
        yPos += 1; // Pequeno espaço vertical entre nome e cargo
         doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const roleStartY = yPos; // Guarda a posição inicial do cargo
         // Usa addWrappedText para o cargo também (limitado à largura da linha)
         yPos = addWrappedText(doc, roleStartY, displayRole, MARGIN_LEFT, 10, "normal", 80, 'left', data);
     }

    yPos += 8; // Espaço final após o bloco de assinatura completo
    return yPos; // Retorna a posição Y final
};
