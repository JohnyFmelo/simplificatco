import jsPDF from "jspdf";

// Importa funções auxiliares e de página da subpasta PDF
import {
    MARGIN_TOP, MARGIN_BOTTOM, MARGIN_RIGHT, getPageConstants,
    addNewPage,
    addStandardFooterContent
} from './PDF/pdfUtils.js';

// Importa geradores de conteúdo da subpasta PDF
import { generateAutuacaoPage } from './PDF/PDFautuacao.js';
import { generateHistoricoContent } from './PDF/PDFhistorico.js';
import { addTermoCompromisso } from './PDF/PDFTermoCompromisso.js';
import { addTermoManifestacao } from './PDF/PDFTermoManifestacao.js';
import { addTermoApreensao } from './PDF/PDFTermoApreensao.js';
import { addTermoConstatacaoDroga } from './PDF/PDFTermoConstatacaoDroga.js';
import { addRequisicaoExameDrogas } from './PDF/PDFpericiadrogas.js';
import { addRequisicaoExameLesao } from './PDF/PDFTermoRequisicaoExameLesao.js';
import { addTermoEncerramentoRemessa } from './PDF/PDFTermoEncerramentoRemessa.js';

/**
 * Remove acentos e caracteres especiais de uma string
 */
const removeAccents = (str: string): string => {
    if (!str) return "";
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
        .replace(/[^a-zA-Z0-9_-]/g, '_') // Substitui caracteres especiais por underscore
        .replace(/_+/g, '_') // Remove underscores consecutivos
        .replace(/^_|_$/g, ''); // Remove underscores no início e fim
};

/**
 * Gera o nome do arquivo TCO no formato específico pedido
 * TCO_[número]_[data]_[natureza]_[RGPM condutor][RGPMs outros].[RGPMs apoio]
 */
export const generateTCOFilename = (data: any): string => {
    console.log("Gerando nome do arquivo TCO", data);

    const tcoNum = data.tcoNumber?.trim() || 'SEM_NUMERO';

    const eventDate = data.dataFato ? data.dataFato.split('-') : [];
    const formattedDate = eventDate.length === 3 ?
        `${eventDate[2]}-${eventDate[1]}-${eventDate[0]}` :
        new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

    let natureza = (data.originalNatureza === "Outros" && data.customNatureza) ?
        data.customNatureza.trim() :
        data.natureza || 'Sem_Natureza';

    natureza = removeAccents(natureza);
    console.log("Natureza formatada para o nome do arquivo:", natureza);

    const componentes = Array.isArray(data.componentesGuarnicao) ? data.componentesGuarnicao : [];

    const principais = componentes.filter(c => c && c.rg && !c.apoio);
    const apoio = componentes.filter(c => c && c.rg && c.apoio);

    if (principais.length === 0 && apoio.length > 0) {
        principais.push({ ...apoio.shift(), apoio: false });
    }

    const rgsPrincipais = principais.map(p => p.rg.replace(/\D/g, ''));
    const rgsApoio = apoio.map(p => p.rg.replace(/\D/g, ''));

    console.log("RGs Principais:", rgsPrincipais);
    console.log("RGs Apoio:", rgsApoio);

    let rgCode = rgsPrincipais.length > 0 ? rgsPrincipais.join('') : 'RG_INDISPONIVEL';

    if (rgsApoio.length > 0) {
        rgCode += '-' + rgsApoio.join('');
    }

    const fileName = `TCO_${tcoNum}_${formattedDate}_${natureza}_${rgCode}.pdf`;
    console.log("Nome do arquivo TCO gerado:", fileName);
    return fileName;
};

// --- Função Principal de Geração ---
export const generatePDF = async (inputData: any): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Tempo limite excedido ao gerar PDF. Por favor, tente novamente."));
        }, 60000);

        try {
            if (!inputData || typeof inputData !== 'object' || Object.keys(inputData).length === 0) {
                clearTimeout(timeout);
                reject(new Error("Dados inválidos para gerar o PDF."));
                return;
            }

            const juizadoData = inputData.juizadoEspecialData || inputData.dataAudiencia;
            const juizadoHora = inputData.juizadoEspecialHora || inputData.horaAudiencia;

            if (!juizadoData || !juizadoHora) {
                clearTimeout(timeout);
                reject(new Error("É necessário informar a data e hora de apresentação no Juizado Especial."));
                return;
            }

            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            let processedVideoLinks = inputData.videoLinks;
            if (processedVideoLinks && Array.isArray(processedVideoLinks)) {
                processedVideoLinks = processedVideoLinks.map((link, index) => {
                    if (typeof link === 'string') {
                        return { url: link, descricao: `Vídeo ${index + 1}` };
                    }
                    return link;
                });
            }

            const data = {
                ...inputData,
                juizadoEspecialData: juizadoData,
                juizadoEspecialHora: juizadoHora,
                videoLinks: processedVideoLinks,
                hidePagination: true
            };

            const { PAGE_WIDTH, PAGE_HEIGHT } = getPageConstants(doc);
            let yPosition;

            yPosition = generateAutuacaoPage(doc, MARGIN_TOP, data);
            yPosition = addNewPage(doc, data);

            // << CORREÇÃO: Lógica para preparar a lista de anexos agora usa o array 'data.drogas' >>
            const isDrugCase = Array.isArray(data.drogas) && data.drogas.length > 0;
            const documentosAnexosList = [];

            if (data.autores && data.autores.length > 0) {
                data.autores.forEach((autor: any) => {
                    if (autor.nome && autor.nome.trim()) {
                        documentosAnexosList.push(`TERMO DE COMPROMISSO DE ${autor.nome.toUpperCase()}`);
                    }
                });
            }

            if (!isDrugCase && data.vitimas && data.vitimas.length > 0) {
                data.vitimas.forEach((vitima: any) => {
                    if (vitima.nome && vitima.nome.trim()) {
                        documentosAnexosList.push(`TERMO DE MANIFESTAÇÃO DA VÍTIMA ${vitima.nome.toUpperCase()}`);
                    }
                });
            }

            const pessoasComLaudo = [
                ...(data.autores || []).filter((a: any) => a.laudoPericial === "Sim").map((a: any) => ({ nome: a.nome, sexo: a.sexo, tipo: "Autor" })),
                ...(data.vitimas || []).filter((v: any) => v.laudoPericial === "Sim").map((v: any) => ({ nome: v.nome, sexo: v.sexo, tipo: "Vítima" }))
            ].filter((p: any) => p.nome && p.nome.trim());

            const updatedData = {
                ...data,
                documentosAnexos: documentosAnexosList.join('\n')
            };

            generateHistoricoContent(doc, yPosition, updatedData)
                .then(() => {
                    // --- ADIÇÃO DOS TERMOS ---
                    if (updatedData.autores && updatedData.autores.length > 0) {
                        addTermoCompromisso(doc, updatedData);
                    } else {
                        console.warn("Nenhum autor informado, pulando Termo de Compromisso.");
                    }
                    
                    if (!isDrugCase && updatedData.vitimas && updatedData.vitimas.length > 0) {
                        console.log("Adicionando Termo de Manifestação da Vítima");
                        addTermoManifestacao(doc, updatedData);
                    } else {
                        console.log("Pulando Termo de Manifestação da Vítima: natureza incompatível, caso de droga ou sem vítimas.");
                    }

                    // << CORREÇÃO: A chamada para os termos relacionados a drogas agora usa a flag 'isDrugCase' >>
                    if (isDrugCase) {
                        console.log("Adicionando Termos de Droga (Apreensão, Constatação, Requisição)");
                        // O Termo de Apreensão agora é chamado para cada caso de droga
                        addTermoApreensao(doc, updatedData);
                        // As outras funções já devem ser capazes de iterar sobre `updatedData.drogas`
                        addTermoConstatacaoDroga(doc, updatedData);
                        addRequisicaoExameDrogas(doc, updatedData);
                    } else if (updatedData.apreensoes && updatedData.apreensoes.trim() !== '') {
                        // Se não for droga, mas tiver apreensão, adiciona o termo
                        console.log("Adicionando Termo de Apreensão para outros objetos");
                        addTermoApreensao(doc, updatedData);
                    }


                    if (pessoasComLaudo.length > 0) {
                        pessoasComLaudo.forEach((pessoa: any) => {
                            console.log(`Gerando Requisição de Exame de Lesão para: ${pessoa.nome}`);
                            addRequisicaoExameLesao(doc, { ...updatedData, periciadoNome: pessoa.nome, sexo: pessoa.sexo });
                        });
                    }

                    addTermoEncerramentoRemessa(doc, updatedData);

                    const pageCount = doc.internal.pages.length - 1;
                    if (!updatedData.hidePagination) {
                        for (let i = 1; i <= pageCount; i++) {
                            doc.setPage(i);
                            doc.setFont("helvetica", "normal");
                            doc.setFontSize(8);
                            doc.text(`Página ${i} de ${pageCount}`, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - MARGIN_BOTTOM + 5, { align: "right" });

                            if (i > 1) {
                                addStandardFooterContent(doc);
                            }
                        }
                    }

                    if (updatedData.downloadLocal) {
                        try {
                            const fileName = generateTCOFilename(updatedData);
                            doc.save(fileName);
                            console.log(`PDF salvo localmente: ${fileName}`);
                        } catch (downloadError) {
                            console.error("Erro ao salvar o PDF localmente:", downloadError);
                        }
                    }

                    const pdfBlob = doc.output('blob');
                    clearTimeout(timeout);
                    resolve(pdfBlob);
                })
                .catch(histError => {
                    clearTimeout(timeout);
                    const message = histError instanceof Error ? histError.message : String(histError);
                    reject(new Error(`Erro ao gerar histórico do PDF: ${message}`));
                });
        } catch (error) {
            clearTimeout(timeout);
            const message = error instanceof Error ? error.message : String(error);
            reject(new Error(`Erro na geração do PDF: ${message}`));
        }
    });
};
