
// src/components/tco/PDF/PDFTermoCompromisso.js
import {
    MARGIN_LEFT, MARGIN_RIGHT, getPageConstants,
    addNewPage, addWrappedText, addSignatureWithNameAndRole, checkPageBreak,
    formatarDataSimples
} from './pdfUtils.js';

/** Adiciona Termo de Compromisso de Comparecimento (em página nova) */
export const addTermoCompromisso = (doc, data) => {
    let yPos = addNewPage(doc, data);
    const { PAGE_WIDTH, MAX_LINE_WIDTH } = getPageConstants(doc);
    const condutor = data.componentesGuarnicao?.[0];
    const autor = data.autores?.[0];

    // Aplicar flexão de gênero para o autor
    const generoAutor = autor?.sexo?.toLowerCase() === 'feminino' ? 'AUTORA' : 'AUTOR';

    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    yPos = checkPageBreak(doc, yPos, 15, data);
    doc.text("TERMO DE COMPROMISSO DE COMPARECIMENTO", PAGE_WIDTH / 2, yPos, { align: "center" });
    yPos += 10;

    // Obter data e horário das informações básicas e formatar a data para DD/MM/YYYY
    const dataAudiencia = data.juizadoEspecialData ? formatarDataSimples(data.juizadoEspecialData) : "___/___/______";
    const horaAudiencia = data.juizadoEspecialHora || "__:__";

    const termoCompText = `POR ESTE INSTRUMENTO, EU, ${generoAutor} DOS FATOS ABAIXO ASSINADO, JÁ QUALIFICADA NOS AUTOS, ASSUMO, NOS TERMOS DO PARÁGRAFO ÚNICO DO ART. 69 DA LEI Nº 9.099/95, ASSUMO O COMPROMISSO DE COMPARECER NO JUIZADO ESPECIAL CRIMINAL DE VÁRZEA GRANDE - MT, SITUADO NA AVENIDA CHAPEU DO SOL - GUARITA II, VÁRZEA GRANDE - MT NO DIA ${dataAudiencia}, ÀS ${horaAudiencia}, EM VIRTUDE DOS FATOS REGISTRADOS NO TERMO CIRCUNSTANCIADO DE OCORRÊNCIA ACIMA REFERENCIADO, CONFORME NOTIFICADO ABAIXO. FICO CIENTE DE QUE, A CONCORDÂNCIA EM COMPARECER AO JUIZADO ESPECIAL CRIMINAL NÃO IMPLICA CONFISSÃO DE QUALQUER NATUREZA, ADMISSÃO DE CULPA OU ANUÊNCIA ÀS DECLARAÇÕES DA PARTE CONTRÁRIA E QUE O NÃO COMPARECIMENTO NO DIA E HORA AJUSTADOS NESTE TERMO SUJEITARÁ ÀS MEDIDAS PREVISTAS NA LEI Nº 9.099/95. FICO CIENTE, TAMBÉM, QUE DEVEREI COMPARECER ACOMPANHADO DE ADVOGADO E QUE NA AUSÊNCIA DESTE SERÁ NOMEADO UM DEFENSOR PÚBLICO.`;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    yPos = addWrappedText(doc, yPos, termoCompText, MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'justify', data);
    yPos += 5;

    yPos = addSignatureWithNameAndRole(doc, yPos, autor?.nome, `${generoAutor} DO FATO`, data);
    const nomeCondutorComp = `${condutor?.nome || ""} ${condutor?.posto || ""}`.trim();
    yPos = addSignatureWithNameAndRole(doc, yPos, nomeCondutorComp, "CONDUTOR DA OCORRENCIA", data);

    return yPos;
};
