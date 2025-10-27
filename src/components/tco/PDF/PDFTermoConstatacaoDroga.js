import {
    MARGIN_LEFT, MARGIN_RIGHT, getPageConstants,
    addNewPage, addWrappedText, addSignatureWithNameAndRole, checkPageBreak
} from './pdfUtils.js';

// << CORREÇÃO: Função para converter número em texto por extenso, necessária para a descrição. >>
const numberToText = (num) => {
    const numbers = ["ZERO", "UMA", "DUAS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE", "DEZ"];
    return (num >= 0 && num <= 10) ? numbers[num] : num.toString();
};


/** Adiciona Termo de Constatação Preliminar de Droga (em página nova) */
export const addTermoConstatacaoDroga = (doc, data) => {
    // << CORREÇÃO: Verifica se o array 'drogas' existe e tem itens. Se não, não gera o termo. >>
    if (!data.drogas || data.drogas.length === 0) {
        console.log("Pulando Termo de Constatação: Nenhuma droga informada.");
        return; // Retorna sem fazer nada
    }

    let yPos = addNewPage(doc, data);
    const { PAGE_WIDTH, MAX_LINE_WIDTH } = getPageConstants(doc);
    const condutor = data.componentesGuarnicao?.[0];
    const autor = data.autores?.[0];
    
    // Flexão de gênero para autor do fato
    const generoAutor = autor?.sexo?.toLowerCase() === 'feminino' ? 'AUTORA' : 'AUTOR';
    const pronomeAutor = autor?.sexo?.toLowerCase() === 'feminino' ? 'DA' : 'DO';

    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    yPos = checkPageBreak(doc, yPos, 15, data);
    doc.text("TERMO DE CONSTATAÇÃO PRELIMINAR DE DROGA", PAGE_WIDTH / 2, yPos, { align: "center" });
    yPos += 10;

    const tipificacaoDroga = data.tipificacao || "PORTE DE DROGA PARA CONSUMO PESSOAL (ART. 28 DA LEI 11.343/06)";
    const textoIntro = `EM RAZÃO DA LAVRATURA DESTE TERMO CIRCUNSTANCIADO DE OCORRÊNCIA, PELO DELITO TIPIFICADO: ${tipificacaoDroga}, FOI APREENDIDO O MATERIAL DESCRITO ABAIXO, EM PODER ${pronomeAutor} ${generoAutor} ABAIXO ASSINADO JÁ QUALIFICAD${autor?.sexo?.toLowerCase() === 'feminino' ? 'A' : 'O'} NOS AUTOS. APÓS CIÊNCIA DAS IMPLICAÇÕES LEGAIS DO ENCARGO ASSUMIDO, FIRMOU-SE O COMPROMISSO LEGAL DE PROCEDER À ANÁLISE PRELIMINAR DOS SEGUINTES MATERIAIS:`;
    yPos = addWrappedText(doc, yPos, textoIntro, MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'justify', data);
    yPos += 5;

    // << CORREÇÃO: Lógica refatorada para iterar SEMPRE sobre o array 'data.drogas'. >>
    // A lógica antiga (single drug case) foi removida.
    const lacreNumero = data.lacreNumero || "NÃO INFORMADO";
    
    data.drogas.forEach((droga, index) => {
        // Pula drogas que não tenham informações essenciais
        if (!droga.quantidade || !droga.substancia || !droga.cor) {
            console.warn(`Pulando droga no índice ${index} por falta de dados.`);
            return;
        }
        
        const quantidadeNum = parseInt(droga.quantidade.match(/\d+/)?.[0] || "1", 10);
        const quantidadeTexto = numberToText(quantidadeNum);
        const plural = quantidadeNum > 1 ? "PORÇÕES" : "PORÇÃO";

        // << CORREÇÃO: Obtendo os valores corretos do objeto 'droga' do loop >>
        const tipo = droga.substancia || "NÃO ESPECIFICADO";
        const cor = droga.cor || "NÃO ESPECIFICADA";
        const odor = droga.odor || "NÃO ESPECIFICADO";
        
        let indiciosTexto = "";
        if(droga.isUnknownMaterial && droga.customMaterialDesc) {
            // Se for material desconhecido, usa a descrição customizada
            indiciosTexto = `, COM CARACTERÍSTICAS SEMELHANTES A "${droga.customMaterialDesc.toUpperCase()}"`;
        } else if (droga.indicios) {
            // Se for um tipo padrão (Maconha, Cocaína, etc.), usa os indícios
            indiciosTexto = `, E CARACTERÍSTICAS SEMELHANTES AO ENTORPECENTE ${droga.indicios.toUpperCase()}`;
        }
        
        yPos = checkPageBreak(doc, yPos, 15, data);
        doc.setFont("helvetica", "normal"); doc.setFontSize(12);
        doc.text("-", MARGIN_LEFT, yPos);
        
        // << CORREÇÃO: Montagem do texto no formato correto >>
        let itemText = `${quantidadeTexto} ${plural} DE MATERIAL ${tipo.toUpperCase()}, DE COR ${cor.toUpperCase()}, COM ODOR ${odor.toUpperCase()}${indiciosTexto}`;
        
        // Adiciona o número do lacre apenas no último item da lista
        if (index === data.drogas.length - 1) {
            itemText += `, TUDO ACONDICIONADO SOB O LACRE Nº ${lacreNumero}.`;
        } else {
            itemText += ';'; // Ponto e vírgula para separar os itens
        }

        yPos = addWrappedText(doc, yPos, itemText, MARGIN_LEFT + 4, 12, "normal", MAX_LINE_WIDTH - 4, 'justify', data);
        yPos += 3;
    });

    yPos += 5; // Espaço extra após a lista de drogas

    const textoConclusao = "O PRESENTE TERMO TEM POR OBJETIVO APENAS A CONSTATAÇÃO PRELIMINAR DA NATUREZA DA SUBSTÂNCIA PARA FINS DE LAVRATURA DO TERMO CIRCUNSTANCIADO, NOS TERMOS DA LEGISLAÇÃO VIGENTE (NOTADAMENTE ART. 50, §1º DA LEI 11.343/2006), NÃO SUPRINDO O EXAME PERICIAL DEFINITIVO. PARA A VERIFICAÇÃO PRELIMINAR, FOI REALIZADA ANÁLISE VISUAL E OLFATIVA DO MATERIAL.";
    yPos = addWrappedText(doc, yPos, textoConclusao, MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'justify', data);
    yPos += 10;

    // Format date as DD de MMMM de AAAA
    const meses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const hoje = new Date();
    const dia = hoje.getDate().toString().padStart(2, '0');
    const mes = meses[hoje.getMonth()];
    const ano = hoje.getFullYear();
    const dataAtualFormatada = `${dia} DE ${mes} DE ${ano}`;
    
    const cidadeTermo = data.municipio || "VÁRZEA GRANDE";
    doc.setFont("helvetica", "normal"); doc.setFontSize(12);
    const dateText = `${cidadeTermo.toUpperCase()}-MT, ${dataAtualFormatada}.`;
    yPos = checkPageBreak(doc, yPos, 10, data);
    doc.text(dateText, PAGE_WIDTH - MARGIN_RIGHT, yPos, { align: 'right' });
    yPos += 20; // Aumentar espaço para assinaturas

    yPos = addSignatureWithNameAndRole(doc, yPos, autor?.nome, `${generoAutor} DOS FATOS`, data);
    const nomeCondutor = `${condutor?.posto || ""} ${condutor?.nome || ""}`.trim();
    yPos = addSignatureWithNameAndRole(doc, yPos, nomeCondutor, "CONDUTOR DA OCORRÊNCIA", data);

    return yPos;
};
