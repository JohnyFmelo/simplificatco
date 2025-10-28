// src/components/tco/PDF/PDFTermoManifestacao.js
import {
    MARGIN_LEFT, MARGIN_RIGHT, getPageConstants,
    addNewPage, addWrappedText, addSignatureWithNameAndRole, checkPageBreak,
    formatarDataSimples
} from './pdfUtils.js';

/** Adiciona Termo de Manifestação da Vítima (em página nova) */
export const addTermoManifestacao = (doc, data) => {
    // Skip term for drug consumption cases or if no victims are present
    if (data.natureza === "Porte de drogas para consumo") {
        console.log("Caso de porte de drogas para consumo, pulando Termo de Manifestação.");
        return null;
    }
    
    const vitimas = data.vitimas?.filter(v => v?.nome && v.nome.trim() !== "");
    if (!vitimas || vitimas.length === 0) {
        console.warn("Nenhuma vítima com nome informado, pulando Termo de Manifestação.");
        return null;
    }

    let yPos;
    const condutor = data.componentesGuarnicao?.[0];
    const autor = data.autores?.[0];
    
    // Flexão de gênero para autor do fato
    const generoAutor = autor?.sexo?.toLowerCase() === 'feminino' ? 'AUTORA' : 'AUTOR';

    // Gerar um termo para cada vítima
    vitimas.forEach((vitima, index) => {
        // Adicionar uma nova página para cada termo
        yPos = addNewPage(doc, data);
        const { PAGE_WIDTH, MAX_LINE_WIDTH } = getPageConstants(doc);
        
        doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        yPos = checkPageBreak(doc, yPos, 15, data);
        doc.text(`TERMO DE MANIFESTAÇÃO DA VÍTIMA ${vitima.nome.toUpperCase()}`, PAGE_WIDTH / 2, yPos, { align: "center" });
        yPos += 10;

        yPos = addWrappedText(doc, yPos, "EU, VÍTIMA ABAIXO ASSINADA, POR ESTE INSTRUMENTO MANIFESTO O MEU INTERESSE EM:", MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'left', data);
        yPos += 5;

        // Fix: Corrigir a marcação do X de acordo com o valor de representacao da vítima específica
        let manifestacaoOption1 = '(   )';
        let manifestacaoOption2 = '(   )';
        
        // Usando os valores corretos que vem do frontend para ESTA vítima específica
        if (vitima.representacao === 'representar') {
            manifestacaoOption1 = '( X )';
        } else if (vitima.representacao === 'decidir_posteriormente') {
            manifestacaoOption2 = '( X )';
        } else {
            console.warn(`Opção 'representacao' não definida ou inválida para a vítima ${vitima.nome}. Ambas as opções ficarão desmarcadas.`);
        }

        const option1Text = `${manifestacaoOption1} EXERCER O DIREITO DE REPRESENTAÇÃO OU QUEIXA CONTRA ${generoAutor === 'AUTORA' ? 'A' : 'O'} ${generoAutor} DO FATO, JÁ QUALIFICAD${generoAutor === 'AUTORA' ? 'A' : 'O'} NESTE TCO/PM (FICA CIENTIFICADA QUE EM CASO DE QUEIXA-CRIME, A VÍTIMA DEVERÁ CONSTITUIR ADVOGADO).`;
        yPos = addWrappedText(doc, yPos, option1Text, MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'justify', data);
        yPos += 5;

        const option2Text = `${manifestacaoOption2} DECIDIR POSTERIORMENTE, ESTANDO CIENTE, PARA OS FINS PREVISTOS NO ART. 103 DO CÓDIGO PENAL E ART. 38 CÓDIGO DE PROCESSO PENAL QUE DEVO EXERCER O DIREITO DE REPRESENTAÇÃO OU DE QUEIXA, NO PRAZO DE 06 (SEIS) MESES, A CONTAR DESTA DATA, SENDO CERTO QUE MEU SILÊNCIO, ACARRETARÁ A EXTINÇÃO DE PUNIBILIDADE, NA FORMA DO ART. 107, INC. IV, DO CÓDIGO PENAL.`;
        yPos = addWrappedText(doc, yPos, option2Text, MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'justify', data);
        yPos += 5;

        // ALTERAÇÃO: Adiciona o parágrafo da audiência somente se a vítima escolheu representar
        if (vitima.representacao === 'representar') {
            const dataAudiencia = data.juizadoEspecialData ? formatarDataSimples(data.juizadoEspecialData) : "___/___/______";
            const horaAudiencia = data.juizadoEspecialHora || "__:__";
            
            const audienciaText = `ESTOU CIENTE DE QUE A AUDIENCIA OCORRERÁ NO DIA ${dataAudiencia}, ÀS ${horaAudiencia} HORAS, DAS DEPENDÊNCIAS DO JUIZADO ESPECIAL CRIMINAL DE VÁRZEA GRANDE NO BAIRRO CHAPÉU DO SOL, AVENIDA CHAPÉU DO SOL, S/N, E QUE O NÃO COMPARECIMENTO IMPORTARÁ EM RENUNCIA À REPRESENTAÇÃO E O ARQUIVAMENTO DO PROCESSO.`;
            yPos = addWrappedText(doc, yPos, audienciaText, MARGIN_LEFT, 12, "normal", MAX_LINE_WIDTH, 'justify', data);
            yPos += 5;
        }

        yPos = addSignatureWithNameAndRole(doc, yPos, vitima.nome, "VÍTIMA", data);
        const nomeCondutorManif = `${condutor?.nome || ""} ${condutor?.posto || ""}`.trim();
        yPos = addSignatureWithNameAndRole(doc, yPos, nomeCondutorManif, "CONDUTOR DA OCORRENCIA", data);
    });

    return yPos;
};
