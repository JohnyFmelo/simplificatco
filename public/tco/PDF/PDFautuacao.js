
import {
    MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, getPageConstants,
    getDataAtualExtenso, addFieldBoldLabel, addWrappedText, addStandardFooterContent,
    checkPageBreak
} from './pdfUtils.js';

/**
 * Gera o conteúdo da primeira página (Autuação).
 * Assume que está começando em uma página nova (página 1).
 * Retorna a posição Y final nesta página.
 */
export const generateAutuacaoPage = (doc, currentY, data) => {
    const { PAGE_WIDTH } = getPageConstants(doc);
    let yPos = currentY; // Geralmente MARGIN_TOP

    // --- Cabeçalho Específico da Página 1 ---
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("ESTADO DE MATO GROSSO", PAGE_WIDTH / 2, yPos, { align: "center" }); yPos += 4;
    doc.text("POLÍCIA MILITAR", PAGE_WIDTH / 2, yPos, { align: "center" }); yPos += 4;
    doc.text("25º BPM / 2º CR", PAGE_WIDTH / 2, yPos, { align: "center" }); yPos += 5;
    doc.setDrawColor(0); doc.setLineWidth(0.2);
    doc.line(MARGIN_LEFT, yPos, PAGE_WIDTH - MARGIN_RIGHT, yPos); yPos += 4; // Linha
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    const year = new Date().getFullYear(); // Pega o ano atual dinamicamente
    doc.text(`TERMO CIRCUNSTANCIADO DE OCORRÊNCIA Nº ${data.tcoNumber || "Não informado."}.2ºCR.${year}`, PAGE_WIDTH / 2, yPos, { align: "center" });
    yPos += 12; // Espaço após o título TCO

    // --- Informações Principais (Natureza, Autor, Vítima) ---
    const primeiroAutor = data.autores?.[0];

    const naturezaDisplay = data.natureza ? data.natureza.toUpperCase() : "NÃO INFORMADA";
    yPos = addFieldBoldLabel(doc, yPos, "NATUREZA", naturezaDisplay, data);

    const autorNomeDisplay = primeiroAutor?.nome ? primeiroAutor.nome.toUpperCase() : "NÃO INFORMADO(A)";
    yPos = addFieldBoldLabel(doc, yPos, "AUTOR DO FATO", autorNomeDisplay, data);

    // --- LÓGICA CORRIGIDA PARA VÍTIMAS EM LISTA VERTICAL ---
    if (data.vitimas && data.vitimas.length > 0) {
        const labelText = data.vitimas.length > 1 ? "VÍTIMAS:" : "VÍTIMA:";
        const labelWidth = 20; // Largura fixa da coluna do rótulo para alinhamento
        const valueX = MARGIN_LEFT + labelWidth;
        const lineHeight = 5; // Espaçamento vertical entre os nomes

        // Desenha o rótulo ("VÍTIMA:" ou "VÍTIMAS:")
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(labelText, MARGIN_LEFT, yPos);

        // Mapeia os nomes das vítimas
        const vitimasNomes = data.vitimas.map(v => v.nome ? v.nome.toUpperCase() : "NOME NÃO INFORMADO");

        // Desenha os nomes, um por linha
        doc.setFont("helvetica", "normal");
        vitimasNomes.forEach((nome, index) => {
            // A primeira vítima fica na mesma linha do rótulo.
            // As demais são impressas em novas linhas abaixo.
            const currentLineY = yPos + (index * lineHeight);
            
            // Verifica a quebra de página para cada linha a ser adicionada
            const finalY = checkPageBreak(doc, currentLineY, lineHeight, data);
            
            doc.text(nome, valueX, finalY);
        });

        // Atualiza a posição Y para depois da lista de vítimas
        yPos += (vitimasNomes.length * lineHeight);
        
        // Adiciona um espaçamento extra após o bloco de vítimas
        yPos += 5;
    }

    yPos += 15; // Espaço extra

    // --- Título "AUTUAÇÃO" ---
    yPos = checkPageBreak(doc, yPos, 85, data);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("AUTUAÇÃO", PAGE_WIDTH / 2, yPos, { align: "center" });
    yPos += 15;

    // --- Texto da Autuação ---
    const dataAtualExtenso = getDataAtualExtenso();
    const cidadeAutuacao = data.municipio || "VÁRZEA GRANDE";
    const localAutuacao = data.localEncerramento || "NO CISC DO PARQUE DO LAGO";
    const autuacaoText = `${dataAtualExtenso}, NESTA CIDADE DE ${cidadeAutuacao.toUpperCase()}, ESTADO DE MATO GROSSO, ${localAutuacao.toUpperCase()}, AUTUO AS PEÇAS QUE ADIANTE SE SEGUEM, DO QUE PARA CONSTAR, LAVREI E ASSINO ESTE TERMO.`;
    yPos = addWrappedText(doc, yPos, autuacaoText, MARGIN_LEFT, 12, "normal", null, 'justify', data);
    yPos += 20; // Espaço antes da assinatura

    // --- Assinatura do Condutor na Autuação ---
    yPos = checkPageBreak(doc, yPos, 35, data);
    const condutorAutuacao = data.componentesGuarnicao?.[0];
    const signatureLineLength = 80;
    const signatureLineStartX = (PAGE_WIDTH - signatureLineLength) / 2;
    const signatureLineY = yPos;
    doc.setLineWidth(0.3);
    doc.line(signatureLineStartX, signatureLineY, signatureLineStartX + signatureLineLength, signatureLineY);
    yPos += 5;

    const nomeCondutor = condutorAutuacao?.nome || "NOME NÃO INFORMADO";
    const postoCondutor = condutorAutuacao?.posto || "POSTO NÃO INFORMADO";
    const rgCondutor = condutorAutuacao?.rg || "NÃO INFORMADO";

    const linhaNomePosto = `${nomeCondutor} - ${postoCondutor}`.toUpperCase();
    const linhaRg = `RG PMMT: ${rgCondutor}`.toUpperCase();

    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(linhaNomePosto, PAGE_WIDTH / 2, yPos, { align: "center" }); yPos += 4;
    doc.text(linhaRg, PAGE_WIDTH / 2, yPos, { align: "center" }); yPos += 4;
    doc.text("CONDUTOR DA OCORRÊNCIA", PAGE_WIDTH / 2, yPos, { align: "center" });
    yPos += 10;

    // --- Rodapé Específico da Página 1 ---
    addStandardFooterContent(doc);

    return yPos;
};
