import jsPDF from "jspdf";
import {
    MARGIN_LEFT, MARGIN_RIGHT, getPageConstants,
    addNewPage, addSignatureWithNameAndRole, checkPageBreak,
} from './pdfUtils.js';

// --- START: Potentially in pdfUtils.js or local ---
export function formatarDataHora(dataStrInput, horaStrInput, returnObject = false) {
    const dataStr = dataStrInput;
    const horaStr = horaStrInput;
    const dataISO = dataStr ? dataStr.split('/').reverse().join('-') : null;
    const hora = horaStr || "00:00";
    let dataHoraInstance;

    try {
        if (dataISO) {
            dataHoraInstance = new Date(`${dataISO}T${hora}:00`);
        } else {
            dataHoraInstance = new Date();
            if (horaStr) {
                 const [h, m] = hora.split(':').map(Number);
                 if (!isNaN(h) && !isNaN(m)) {
                    dataHoraInstance.setHours(h,m,0,0);
                 }
            }
        }
        if (isNaN(dataHoraInstance.getTime())) throw new Error("Invalid date");
    } catch (e) {
        dataHoraInstance = new Date();
    }

    const finalDate = `${dataHoraInstance.getDate().toString().padStart(2, '0')}/${(dataHoraInstance.getMonth() + 1).toString().padStart(2, '0')}/${dataHoraInstance.getFullYear()}`;
    const finalTime = `${dataHoraInstance.getHours().toString().padStart(2, '0')}:${dataHoraInstance.getMinutes().toString().padStart(2, '0')}`;

    if (returnObject) {
        return { date: finalDate, time: finalTime };
    }
    return `${finalDate} às ${finalTime}`;
}
// --- END: Potentially in pdfUtils.js or local ---

const numberToText = (num) => {
    const numbers = [
        "ZERO", "UMA", "DUAS", "TRÊS", "QUATRO",
        "CINCO", "SEIS", "SETE", "OITO", "NOVE", "DEZ"
    ];
    return num >= 0 && num <= 10 ? numbers[num].toUpperCase() : num.toString();
};

const DEFAULT_FONT_NAME = "helvetica";
const DEFAULT_FONT_SIZE = 9;
const CELL_PADDING_X = 2;
const CELL_PADDING_Y = 3;
const LINE_HEIGHT_FACTOR = 1.05;
const MIN_ROW_HEIGHT = 6;

function getCellContentMetrics(doc, label, value, cellWidth, fontSize, valueFontStyle = "normal", isLabelBold = true) {
    const availableWidth = cellWidth - CELL_PADDING_X * 2;
    let labelHeight = 0, valueHeight = 0, calculatedHeight = 0;
    let labelLines = [], valueLines = [];
    let sideBySide = false;

    const fullLabel = label ? (label.endsWith(": ") ? label : label + ": ") : "";
    const valueString = String(value || "");

    if (fullLabel) {
        doc.setFont(DEFAULT_FONT_NAME, isLabelBold ? "bold" : valueFontStyle, isLabelBold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        labelLines = doc.splitTextToSize(fullLabel, availableWidth);
        labelHeight = labelLines.length > 0 ? doc.getTextDimensions(labelLines, { fontSize, lineHeightFactor: LINE_HEIGHT_FACTOR }).h : 0;
    }

    doc.setFont(DEFAULT_FONT_NAME, valueFontStyle, "normal");
    doc.setFontSize(fontSize);

    let valueEffectiveMaxWidth = availableWidth;
    if (labelLines.length === 1 && fullLabel) {
        doc.setFont(DEFAULT_FONT_NAME, isLabelBold ? "bold" : valueFontStyle, isLabelBold ? "bold" : "normal");
        const labelTextWidth = doc.getTextWidth(labelLines[0]);
        const potentialValueWidth = availableWidth - labelTextWidth - (fullLabel && valueString ? 1 : 0);
        if (potentialValueWidth > doc.getTextWidth(" ") * 3) {
             valueEffectiveMaxWidth = potentialValueWidth;
        }
    }
    
    valueLines = doc.splitTextToSize(valueString, valueEffectiveMaxWidth > 0 ? valueEffectiveMaxWidth : availableWidth);
    valueHeight = valueLines.length > 0 ? doc.getTextDimensions(valueLines, { fontSize, lineHeightFactor: LINE_HEIGHT_FACTOR }).h : 0;

    if (labelLines.length === 1 && valueLines.length === 1 && fullLabel && valueEffectiveMaxWidth === availableWidth - doc.getTextWidth(labelLines[0]) - (fullLabel && valueString ? 1:0) ) {
        doc.setFont(DEFAULT_FONT_NAME, isLabelBold ? "bold" : valueFontStyle, isLabelBold ? "bold" : "normal");
        const labelW = doc.getTextWidth(labelLines[0]);
        doc.setFont(DEFAULT_FONT_NAME, valueFontStyle, "normal");
        const valueW = doc.getTextWidth(valueLines[0]);

        if (labelW + (fullLabel && valueString ? 1 : 0) + valueW <= availableWidth) {
            calculatedHeight = Math.max(labelHeight, valueHeight);
            sideBySide = true;
        } else {
            calculatedHeight = labelHeight + valueHeight;
            sideBySide = false;
            if (valueEffectiveMaxWidth < availableWidth) {
                 valueLines = doc.splitTextToSize(valueString, availableWidth);
                 valueHeight = valueLines.length > 0 ? doc.getTextDimensions(valueLines, { fontSize, lineHeightFactor: LINE_HEIGHT_FACTOR }).h : 0;
                 calculatedHeight = labelHeight + valueHeight;
            }
        }
    } else if (fullLabel) {
        calculatedHeight = labelHeight + valueHeight;
        sideBySide = false;
        if (labelLines.length > 1 && valueEffectiveMaxWidth < availableWidth) {
            valueLines = doc.splitTextToSize(valueString, availableWidth);
            valueHeight = valueLines.length > 0 ? doc.getTextDimensions(valueLines, { fontSize, lineHeightFactor: LINE_HEIGHT_FACTOR }).h : 0;
            calculatedHeight = labelHeight + valueHeight;
        }
    } else {
        calculatedHeight = valueHeight;
        sideBySide = false;
    }
    
    return { height: calculatedHeight, labelLines, valueLines, labelHeight, valueHeight, sideBySide };
}

function renderCellText(doc, x, y, cellWidth, cellRowHeight, metrics, fontSize, valueFontStyle = "normal", isLabelBold = true, valueAlign = "left", cellVerticalAlign = "middle") {
    const { labelLines, valueLines, labelHeight, valueHeight, height: totalCalculatedTextHeight, sideBySide } = metrics;
    
    let textBlockStartY;
    const usableCellHeight = cellRowHeight - 2 * CELL_PADDING_Y;

    if (cellVerticalAlign === 'middle') {
        textBlockStartY = y + CELL_PADDING_Y + (usableCellHeight - totalCalculatedTextHeight) / 2 - 0.5;
    } else {
        textBlockStartY = y + CELL_PADDING_Y;
    }
    textBlockStartY = Math.max(y + CELL_PADDING_Y, textBlockStartY);

    const textContentX = x + CELL_PADDING_X;
    const availableWidth = cellWidth - CELL_PADDING_X * 2;

    let currentDrawingY = textBlockStartY;

    if (labelLines.length > 0) {
        doc.setFont(DEFAULT_FONT_NAME, isLabelBold ? "bold" : valueFontStyle, isLabelBold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        doc.text(labelLines, textContentX, currentDrawingY, { align: 'left', lineHeightFactor: LINE_HEIGHT_FACTOR });
        if (!sideBySide) {
            currentDrawingY += labelHeight;
        }
    }

    if (valueLines.length > 0) {
        doc.setFont(DEFAULT_FONT_NAME, valueFontStyle, "normal");
        doc.setFontSize(fontSize);
        
        let valueX = textContentX;
        let valueY = currentDrawingY;

        if (sideBySide && labelLines.length > 0) {
            doc.setFont(DEFAULT_FONT_NAME, isLabelBold ? "bold" : valueFontStyle, isLabelBold ? "bold" : "normal");
            valueX = textContentX + doc.getTextWidth(labelLines[0]) + (labelLines.length > 0 && valueLines.length > 0 ? 1 : 0);
            valueY = textBlockStartY;
        }
        
        doc.text(valueLines, valueX, valueY, { 
            align: valueAlign, 
            lineHeightFactor: LINE_HEIGHT_FACTOR, 
            maxWidth: sideBySide ? availableWidth - (valueX - textContentX) : availableWidth 
        });
    }
}

export function addTermoApreensao(doc, data) {
    console.log("[PDFTermoApreensao] Iniciando renderização do Termo de Apreensão");
    console.log("[PDFTermoApreensao] Dados do condutor:", data.componentesGuarnicao?.[0]);
    console.log("[PDFTermoApreensao] Dados do autor:", data.autores?.[0]);

    let currentY = addNewPage(doc, data);
    const { PAGE_WIDTH, MAX_LINE_WIDTH } = getPageConstants(doc);
    const condutor = data.componentesGuarnicao?.[0];
    const autor = data.autores?.[0];
    const isDroga = data.natureza && data.natureza.toLowerCase() === "porte de drogas para consumo";
    const lacreNumero = isDroga ? (data.lacreNumero || "00000000") : "";

    // Título
    const titulo = isDroga ? `TERMO DE APREENSÃO LACRE Nº ${lacreNumero}` : "TERMO DE APREENSÃO";
    doc.setFont(DEFAULT_FONT_NAME, "bold");
    doc.setFontSize(12);
    currentY = checkPageBreak(doc, currentY, 15, data);
    doc.text(titulo.toUpperCase(), PAGE_WIDTH / 2, currentY, { align: "center" });
    currentY += 8;

    // Configurações da tabela
    const rowHeight = 7;
    const bigRowHeight = 20;
    const colWidth = MAX_LINE_WIDTH / 3;
    const startX = MARGIN_LEFT;
    
    doc.setFont(DEFAULT_FONT_NAME, "bold");
    doc.setFontSize(9);

    // LINHA 1: DATA | HORA | LOCAL (3 colunas)
    let rowY = currentY;
    currentY = checkPageBreak(doc, rowY, rowHeight, data);
    if (currentY !== rowY) rowY = currentY;
    
    const dataHoraObj = formatarDataHora(data.dataTerminoRegistro || data.dataFato, data.horaTerminoRegistro || data.horaFato, true);
    doc.rect(startX, rowY, colWidth, rowHeight);
    doc.text(`DATA: ${dataHoraObj.date}`, startX + 2, rowY + 5);
    doc.rect(startX + colWidth, rowY, colWidth, rowHeight);
    doc.text(`HORA: ${dataHoraObj.time}`, startX + colWidth + 2, rowY + 5);
    doc.rect(startX + 2 * colWidth, rowY, colWidth, rowHeight);
    doc.text(`LOCAL: 25º BPM`, startX + 2 * colWidth + 2, rowY + 5);
    currentY = rowY + rowHeight;

    // LINHA 2: NOME DO POLICIAL (1 coluna)
    rowY = currentY;
    const nomePolicial = `${condutor?.nome || ""} ${condutor?.posto || ""}`.trim().toUpperCase();
    doc.rect(startX, rowY, MAX_LINE_WIDTH, rowHeight);
    doc.text(`NOME DO POLICIAL: ${nomePolicial}`, startX + 2, rowY + 5);
    currentY = rowY + rowHeight;

    // LINHA 3: FILIAÇÃO PAI (1 coluna)
    rowY = currentY;
    const nomePai = (condutor?.pai || autor?.filiacaoPai || "").toUpperCase();
    doc.rect(startX, rowY, MAX_LINE_WIDTH, rowHeight);
    doc.text(`FILIAÇÃO PAI: ${nomePai}`, startX + 2, rowY + 5);
    currentY = rowY + rowHeight;

    // LINHA 4: FILIAÇÃO MÃE (1 coluna)
    rowY = currentY;
    const nomeMae = (condutor?.mae || autor?.filiacaoMae || "").toUpperCase();
    doc.rect(startX, rowY, MAX_LINE_WIDTH, rowHeight);
    doc.text(`FILIAÇÃO MÃE: ${nomeMae}`, startX + 2, rowY + 5);
    currentY = rowY + rowHeight;

    // LINHA 5: NATURALIDADE | RGPM | CPF (3 colunas)
    rowY = currentY;
    doc.rect(startX, rowY, colWidth, rowHeight);
    doc.text(`NATURALIDADE: ${(condutor?.naturalidade || autor?.naturalidade || "").toUpperCase()}`, startX + 2, rowY + 5);
    doc.rect(startX + colWidth, rowY, colWidth, rowHeight);
    doc.text(`RGPM: ${condutor?.rg || ""}`, startX + colWidth + 2, rowY + 5);
    doc.rect(startX + 2 * colWidth, rowY, colWidth, rowHeight);
    doc.text(`CPF: ${condutor?.cpf || autor?.cpf || ""}`, startX + 2 * colWidth + 2, rowY + 5);
    currentY = rowY + rowHeight;

    // LINHA 6: END. (1 coluna)
    rowY = currentY;
    const endereco = "AV. DR. PARANÁ, S/N° COMPLEXO DA UNIVAG, AO LADO DO NÚCLEO DE PRÁTICA JURÍDICA. BAIRRO CRISTO REI CEP 78.110-100, VG - MT";
    doc.rect(startX, rowY, MAX_LINE_WIDTH, rowHeight);
    doc.setFont(DEFAULT_FONT_NAME, "bold");
    doc.text("END.:", startX + 2, rowY + 5);
    doc.setFont(DEFAULT_FONT_NAME, "normal");
    const endLines = doc.splitTextToSize(endereco, MAX_LINE_WIDTH - 15);
    doc.text(endLines[0], startX + 15, rowY + 5);
    currentY = rowY + rowHeight;

    // LINHA 7: MUNICÍPIO | UF | TEL (3 colunas)
    rowY = currentY;
    doc.setFont(DEFAULT_FONT_NAME, "bold");
    doc.rect(startX, rowY, colWidth, rowHeight);
    doc.text(`MUNICÍPIO: VÁRZEA GRANDE`, startX + 2, rowY + 5);
    doc.rect(startX + colWidth, rowY, colWidth, rowHeight);
    doc.text(`UF: MT`, startX + colWidth + 2, rowY + 5);
    doc.rect(startX + 2 * colWidth, rowY, colWidth, rowHeight);
    doc.text(`TEL: ${condutor?.telefone || autor?.celular || ""}`, startX + 2 * colWidth + 2, rowY + 5);
    currentY = rowY + rowHeight;

    // LINHA 8: FICA APREENDIDO O DESCRITO ABAIXO (1 coluna)
    rowY = currentY;
    doc.rect(startX, rowY, MAX_LINE_WIDTH, rowHeight);
    doc.text("FICA APREENDIDO O DESCRITO ABAIXO:", startX + 2, rowY + 5);
    currentY = rowY + rowHeight;

    // LINHA 9: Descrição do item apreendido (1 coluna com altura maior)
    rowY = currentY;
    const textoApreensao = (data.apreensoes || "").toUpperCase();
    doc.setFont(DEFAULT_FONT_NAME, "normal");
    const apreensaoLines = doc.splitTextToSize(textoApreensao, MAX_LINE_WIDTH - 4);
    const descHeight = Math.max(bigRowHeight, apreensaoLines.length * 4 + 4);
    doc.rect(startX, rowY, MAX_LINE_WIDTH, descHeight);
    doc.text(apreensaoLines, startX + 2, rowY + 4);
    currentY = rowY + descHeight;

    // LINHA 10: Texto legal (1 coluna)
    rowY = currentY;
    doc.setFont(DEFAULT_FONT_NAME, "normal");
    const textoLegal = "O PRESENTE TERMO DE APREENSÃO FOI LAVRADO COM BASE NO ART. 6º, II, DO CÓDIGO DE PROCESSO PENAL, E ART. 92 DA LEI 9.999/1995.";
    const legalLines = doc.splitTextToSize(textoLegal, MAX_LINE_WIDTH - 4);
    const legalHeight = Math.max(rowHeight * 2, legalLines.length * 3.5 + 4);
    doc.rect(startX, rowY, MAX_LINE_WIDTH, legalHeight);
    doc.text(legalLines, startX + 2, rowY + 4);
    currentY = rowY + legalHeight;

    currentY += 5;
    doc.setFont(DEFAULT_FONT_NAME, "normal");
    doc.setFontSize(10);
    const autorLabel = autor?.sexo?.toLowerCase() === 'feminino' ? "AUTORA DOS FATOS" : "AUTOR DOS FATOS";
    currentY = addSignatureWithNameAndRole(doc, currentY, (autor?.nome || "").toUpperCase(), autorLabel, data);
    const nomeCondutorCompleto = `${condutor?.posto || ""} ${condutor?.nome || ""}`.trim().toUpperCase();
    currentY = addSignatureWithNameAndRole(doc, currentY, nomeCondutorCompleto, "CONDUTOR DA OCORRÊNCIA".toUpperCase(), data);

    console.log("[PDFTermoApreensao] Termo de Apreensão finalizado, currentY:", currentY);
    return currentY;
}
