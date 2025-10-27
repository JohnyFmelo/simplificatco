
// src/components/tco/PDF/PDFTermoEncerramentoRemessa.js
import {
    MARGIN_LEFT, MARGIN_RIGHT, getPageConstants,
    addNewPage, addWrappedText, addSignatureWithNameAndRole, checkPageBreak, getDataAtualExtenso
} from './pdfUtils.js';

/** Adiciona Termo de Encerramento e Remessa (em página nova) */
export const addTermoEncerramentoRemessa = (doc, data) => {
    let yPos = addNewPage(doc, data);
    const { PAGE_WIDTH, MAX_LINE_WIDTH } = getPageConstants(doc);
    const condutor = data.componentesGuarnicao?.[0];
    const autor = data.autores?.[0];

    const dataEncerramentoExtenso = getDataAtualExtenso();
    const cidadeEncerramento = data.municipio || "VÁRZEA GRANDE";
    const local = data.localEncerramento || "NO QUARTEL DO 25º BATALHÃO DE POLÍCIA MILITAR 2º COMANDO REGIONAL";
    const year = new Date().getFullYear();
    const tcoRef = data.tcoRefEncerramento || `Nº ${data.tcoNumber || 'INDEFINIDO'}.2ºCR.${year}`;
    
    // Aplicação da flexão de gênero conforme solicitado
    const generoAutor = autor?.sexo?.toLowerCase() === 'feminino' ? 'DA SRA.' : 'DO SR.';
    const nomeAutorMencao = autor?.nome ? `${generoAutor} ${autor.nome.toUpperCase()}` : "DO(A) ENVOLVIDO(A) QUALIFICADO(A) NOS AUTOS";

    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    yPos = checkPageBreak(doc, yPos, 15, data);
    doc.text("TERMO DE ENCERRAMENTO E REMESSA", PAGE_WIDTH / 2, yPos, { align: "center" });
    yPos += 10;

    const textoEncerramento = `${dataEncerramentoExtenso.toUpperCase()}, NESTA CIDADE DE ${cidadeEncerramento.toUpperCase()}, ESTADO DE MATO GROSSO, ${local.toUpperCase()}, POR DETERMINAÇÃO DA AUTORIDADE POLICIAL MILITAR SIGNATÁRIA DESTE TCO, DOU POR ENCERRADA A LAVRATURA DO PRESENTE TERMO CIRCUNSTANCIADO DE OCORRÊNCIA ${tcoRef}, INSTAURADO EM DESFAVOR ${nomeAutorMencao}, PARA AS PROVIDÊNCIAS DE REMESSA DOS AUTOS PARA APRECIAÇÃO DO NÚCLEO DE JUSTIÇA DIGITAL DOS JUIZADOS ESPECIAIS, A QUEM COMPETE DELIBERAR SOBRE O FATO DELITUOSO NOTICIADO.`;
    yPos = addWrappedText(doc, yPos, textoEncerramento, MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'justify', data);
    yPos += 15;

    const nomeCondutor = `${condutor?.nome || ""} ${condutor?.posto || ""}`.trim();
    yPos = addSignatureWithNameAndRole(doc, yPos, nomeCondutor, "CONDUTOR DA OCORRÊNCIA", data);

    return yPos;
};
