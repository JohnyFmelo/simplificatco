import {
    MARGIN_LEFT, MARGIN_RIGHT, getPageConstants,
    addNewPage, addWrappedText, checkPageBreak
} from './pdfUtils.js';

// Helper function to format date as "DD DE MMMM DE AAAA"
const getCustomDataAtualExtenso = () => {
    const hoje = new Date();
    const dia = hoje.getDate();
    const meses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const mes = meses[hoje.getMonth()];
    const ano = hoje.getFullYear();
    return `${dia} DE ${mes} DE ${ano}`;
};

// Helper function to format date as "DD/MM/YYYY"
const formatarDataSimples = (dataStr) => {
    if (!dataStr) return new Date().toLocaleDateString('pt-BR');
    try {
        const [year, month, day] = dataStr.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        return new Date().toLocaleDateString('pt-BR');
    }
};

const numberToText = (num) => {
    const numbers = ["ZERO", "UMA", "DUAS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE", "DEZ"];
    return (num >= 0 && num <= 10) ? numbers[num] : num.toString();
};

/** Adiciona Requisição de Exame em Drogas de Abuso (em página nova) */
export const addRequisicaoExameDrogas = (doc, data) => {
    if (!data.drogas || data.drogas.length === 0) {
        console.log("Pulando Requisição de Exame em Drogas: Nenhuma droga informada.");
        return;
    }

    let yPos = addNewPage(doc, data);
    const { PAGE_WIDTH, MAX_LINE_WIDTH } = getPageConstants(doc);
    const condutor = data.componentesGuarnicao?.[0];
    const autor = data.autores?.[0];

    const lacreNumero = data.lacreNumero || "NÃO INFORMADO";
    const nomeAutor = autor?.nome || "[NOME NÃO INFORMADO]";
    const dataFatoStr = formatarDataSimples(data.dataFato);

    const generoAutor = autor?.sexo?.toLowerCase() === 'feminino' ? 'A' : 'O';
    const autorArtigo = autor?.sexo?.toLowerCase() === 'feminino' ? 'A' : 'O';
    const autorTermo = autor?.sexo?.toLowerCase() === 'feminino' ? 'AUTORA' : 'AUTOR';
    const qualificado = autor?.sexo?.toLowerCase() === 'feminino' ? 'QUALIFICADA' : 'QUALIFICADO';

    const isPlural = data.drogas.length > 1;
    
    const substanciaTerm = isPlural ? "SUBSTÂNCIAS" : "SUBSTÂNCIA";
    const apreendidaTerm = isPlural ? "APREENDIDAS" : "APREENDIDA";
    const acondicionadaTerm = isPlural ? "ACONDICIONADAS" : "ACONDICIONADA";
    const encontradaTerm = isPlural ? "ENCONTRADAS" : "ENCONTRADA";

    // Título
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    yPos = checkPageBreak(doc, yPos, 15, data);
    const anoAtual = new Date().getFullYear();
    const numeroRequisicao = data.numeroRequisicao || "001";
    doc.text(`REQUISIÇÃO DE EXAME PERICIAL EM DROGAS ${numeroRequisicao}.2ºCR.VG.${anoAtual}`.toUpperCase(), PAGE_WIDTH / 2, yPos, { align: "center" });
    yPos += 10;

    // Conteúdo principal
    doc.setFont("helvetica", "normal"); doc.setFontSize(12);
    
    const autorTextoFragment = `D${generoAutor} ${autorArtigo} ${autorTermo} DO FATO ${nomeAutor.toUpperCase()}, ${qualificado.toUpperCase()} NESTE TCO`;
    
    const textoRequisicao = `REQUISITO A POLITEC, NOS TERMOS DO ARTIGO 159 E SEGUINTES DO CPP COMBINADO COM O ARTIGO 69, CAPUT DA LEI Nº 9.099/95, E ARTIGO 50, §1º DA LEI Nº 11.343/2006, A REALIZAÇÃO DE EXAME PERICIAL DEFINITIVO NA(S) ${substanciaTerm} ${apreendidaTerm} E ${acondicionadaTerm} SOB O LACRE Nº ${lacreNumero}, ${encontradaTerm} EM POSSE ${autorTextoFragment}, EM RAZÃO DE FATOS DE NATUREZA "PORTE ILEGAL DE DROGAS PARA CONSUMO", OCORRIDO(S) NA DATA DE ${dataFatoStr}.`.toUpperCase();
    
    yPos = addWrappedText(doc, yPos, textoRequisicao, MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'justify', data);
    yPos += 8;

    yPos = addWrappedText(doc, yPos, "APENSO:", MARGIN_LEFT, 12, "bold", MAX_LINE_WIDTH, 'left', data);
    yPos += 2;

    data.drogas.forEach((droga) => {
        const quantidadeNum = parseInt(droga.quantidade.match(/\d+/)?.[0] || "1", 10);
        const quantidadeTexto = numberToText(quantidadeNum);
        const porcaoText = quantidadeNum === 1 ? "PORÇÃO" : "PORÇÕES";
        
        let nomeDroga = "ENTORPECENTE";
        if (droga.isUnknownMaterial && droga.customMaterialDesc) {
            nomeDroga = droga.customMaterialDesc;
        } else if (droga.indicios) {
            nomeDroga = droga.indicios;
        }

        const textoApenso = `- ${quantidadeTexto} ${porcaoText} DE SUBSTÂNCIA ANÁLOGA A ${nomeDroga.toUpperCase()}.`.toUpperCase();
        yPos = addWrappedText(doc, yPos, textoApenso, MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'justify', data);
        yPos += 2;
    });

    // << CORREÇÃO: Lógica dinâmica para o texto do lacre. >>
    const textoLacre = (isPlural
        ? `TODO O MATERIAL ENCONTRA-SE DEVIDAMENTE ACONDICIONADO SOB O LACRE Nº ${lacreNumero}.`
        : `O MATERIAL ENCONTRA-SE DEVIDAMENTE ACONDICIONADO SOB O LACRE Nº ${lacreNumero}.`
    ).toUpperCase();

    yPos = addWrappedText(doc, yPos, textoLacre, MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'justify', data);
    yPos += 8;

    const textoQuesitos = `PARA TANTO, SOLICITO DE VOSSA SENHORIA, QUE SEJA CONFECCIONADO O RESPECTIVO LAUDO PERICIAL DEFINITIVO, DEVENDO OS PERITOS RESPONDEREM AOS QUESITOS, CONFORME ABAIXO:`.toUpperCase();
    yPos = addWrappedText(doc, yPos, textoQuesitos, MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'justify', data);
    yPos += 5;
    
    let quesitos;
    if (isPlural) {
        quesitos = [
            "1. AS AMOSTRAS APRESENTADAS SÃO CONSTITUÍDAS POR SUBSTÂNCIAS ENTORPECENTES OU DE USO PROSCRITO NO BRASIL?",
            "2. EM CASO POSITIVO, QUAIS SUBSTÂNCIAS?",
            "3. QUAL O PESO LÍQUIDO TOTAL DAS AMOSTRAS APRESENTADAS?"
        ];
    } else {
        quesitos = [
            "1. A AMOSTRA APRESENTADA É CONSTITUÍDA POR SUBSTÂNCIA ENTORPECENTE OU DE USO PROSCRITO NO BRASIL?",
            "2. EM CASO POSITIVO, QUAL SUBSTÂNCIA?",
            "3. QUAL O PESO LÍQUIDO TOTAL DA AMOSTRA APRESENTADA?"
        ];
    }

    quesitos.forEach((quesito) => {
        const textoQuesito = quesito.toUpperCase();
        yPos = addWrappedText(doc, yPos, textoQuesito, MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'justify', data);
        yPos += 3;
    });
    
    yPos += 8;

    const cidadeTermo = (data.municipio || "VÁRZEA GRANDE").toUpperCase();
    const dataAtualFormatada = getCustomDataAtualExtenso();
    const dataLocal = `${cidadeTermo}-MT, ${dataAtualFormatada}.`;
    
    yPos = checkPageBreak(doc, yPos, 10, data);
    doc.text(dataLocal, PAGE_WIDTH - MARGIN_RIGHT, yPos, { align: 'right' });
    yPos += 15;

    const nomeCondutorCompleto = (`${condutor?.posto || ""} ${condutor?.nome || ""}`.trim()).toUpperCase();
    yPos = checkPageBreak(doc, yPos, 20, data);
    const linhaAssinaturaWidth = 100;
    doc.setLineWidth(0.3);
    doc.line((PAGE_WIDTH - linhaAssinaturaWidth) / 2, yPos, (PAGE_WIDTH + linhaAssinaturaWidth) / 2, yPos);
    yPos += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(nomeCondutorCompleto, PAGE_WIDTH / 2, yPos, { align: 'center' });
    yPos += 4;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("CONDUTOR DA OCORRÊNCIA".toUpperCase(), PAGE_WIDTH / 2, yPos, { align: 'center' });
    yPos += 8;

    const tableRowHeight = 10; 
    const tableNumRows = 2;
    const tableNumCols = 3;
    const requiredSpaceForTable = (tableNumRows * tableRowHeight) + 5;
    yPos = checkPageBreak(doc, yPos, requiredSpaceForTable, data);

    const tableTopY = yPos;
    const tableContentWidth = MAX_LINE_WIDTH;
    const colWidth = tableContentWidth / tableNumCols;
    const tableHeaders = ["DATA", "POLITEC", "ASSINATURA"];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setLineWidth(0.3); 

    for (let j = 0; j < tableNumCols; j++) {
        const cellX = MARGIN_LEFT + j * colWidth;
        doc.rect(cellX, tableTopY, colWidth, tableRowHeight);
        doc.text(tableHeaders[j].toUpperCase(), cellX + colWidth / 2, tableTopY + tableRowHeight / 2, { align: 'center', baseline: 'middle' });
    }

    const secondRowY = tableTopY + tableRowHeight;
    for (let j = 0; j < tableNumCols; j++) {
        const cellX = MARGIN_LEFT + j * colWidth;
        doc.rect(cellX, secondRowY, colWidth, tableRowHeight);
    }
    
    yPos = secondRowY + tableRowHeight + 10;

    doc.setFont("helvetica", "normal"); 
    doc.setFontSize(12);

    return yPos;
};
