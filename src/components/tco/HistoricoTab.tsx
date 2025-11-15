import React, { useRef, useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface DrugItem {
  id: string;
  quantidade: string;
  substancia: string;
  cor: string;
  odor: string;
  indicios: string;
  customMaterialDesc: string;
}

interface HistoricoTabProps {
  relatoPolicial: string;
  setRelatoPolicial: (value: string) => void;
  relatoAutor: string;
  setRelatoAutor: (value: string) => void;
  relatoVitima: string;
  setRelatoVitima: (value: string) => void;
  relatoTestemunha: string;
  setRelatoTestemunha: (value: string) => void;
  apreensoes: string;
  setApreensoes: (value: string) => void;
  conclusaoPolicial: string;
  setConclusaoPolicial: (value: string) => void;
  drugSeizure?: boolean;
  representacao?: string;
  setRepresentacao?: (value: string) => void;
  natureza: string;
  videoLinks?: string[];
  setVideoLinks?: (value: string[]) => void;
  solicitarCorpoDelito?: string;
  autorSexo?: string;
  providencias: string;
  setProvidencias: (value: string) => void;
  documentosAnexos: string;
  setDocumentosAnexos: (value: string) => void;
  lacreNumero?: string;
  internalDrugs?: DrugItem[];
  nomearFielDepositario?: string;
  setNomearFielDepositario?: (value: string) => void;
  fielDepositarioSelecionado?: string;
  setFielDepositarioSelecionado?: (value: string) => void;
  // Novos campos para geração automática do pré-texto
  dataFato?: string;
  horaFato?: string;
  localFato?: string;
  endereco?: string;
  municipio?: string;
  vitimas?: {
    nome: string;
    sexo: string;
    estadoCivil: string;
    profissao: string;
    endereco: string;
    dataNascimento: string;
    naturalidade: string;
    filiacaoMae: string;
    filiacaoPai: string;
    rg: string;
    cpf: string;
    celular: string;
    email: string;
    laudoPericial: string;
    relato?: string;
    representacao?: string;
  }[];
  setVitimaRelato?: (index: number, relato: string) => void;
  setVitimaRepresentacao?: (index: number, representacao: string) => void;
  testemunhas?: {
    nome: string;
    sexo: string;
    estadoCivil: string;
    profissao: string;
    endereco: string;
    dataNascimento: string;
    naturalidade: string;
    filiacaoMae: string;
    filiacaoPai: string;
    rg: string;
    cpf: string;
    celular: string;
    email: string;
    laudoPericial: string;
    relato?: string;
  }[];
  setTestemunhaRelato?: (index: number, relato: string) => void;
  autores?: {
    nome: string;
    sexo: string;
    estadoCivil: string;
    profissao: string;
    endereco: string;
    dataNascimento: string;
    naturalidade: string;
    filiacaoMae: string;
    filiacaoPai: string;
    rg: string;
    cpf: string;
    celular: string;
    email: string;
    laudoPericial: string;
    relato?: string;
    fielDepositario?: string;
    objetoDepositado?: string;
  }[];
  setAutorRelato?: (index: number, relato: string) => void;
}

const HistoricoTab: React.FC<HistoricoTabProps> = ({
  relatoPolicial,
  setRelatoPolicial,
  relatoAutor,
  setRelatoAutor,
  relatoVitima,
  setRelatoVitima,
  relatoTestemunha,
  setRelatoTestemunha,
  apreensoes,
  setApreensoes,
  conclusaoPolicial,
  setConclusaoPolicial,
  drugSeizure = false,
  representacao = "",
  setRepresentacao,
  natureza,
  videoLinks = [],
  setVideoLinks,
  solicitarCorpoDelito = "Não",
  autorSexo = "masculino",
  providencias,
  setProvidencias,
  documentosAnexos,
  setDocumentosAnexos,
  lacreNumero = "",
  internalDrugs = [],
  nomearFielDepositario = "Não",
  setNomearFielDepositario,
  fielDepositarioSelecionado = "",
  setFielDepositarioSelecionado,
  dataFato = "",
  horaFato = "",
  localFato = "",
  endereco = "",
  municipio = "",
  vitimas = [],
  setVitimaRelato,
  setVitimaRepresentacao,
  testemunhas = [],
  setTestemunhaRelato,
  autores = [],
  setAutorRelato,
}) => {
  const isDrugCase = natureza === "Porte de drogas para consumo";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<{
    file: File;
    id: string;
  }[]>([]);
  const [videoUrls, setVideoUrls] = useState<string>(videoLinks.join("\n"));
  
  const validVitimas = vitimas.filter(vitima => vitima.nome && vitima.nome.trim() !== "" && vitima.nome !== "O ESTADO");
  const validTestemunhas = testemunhas.filter(testemunha => 
    testemunha.nome && 
    testemunha.nome.trim() !== "" && 
    testemunha.nome !== "Não informado."
  );
  const validAutores = autores.filter(autor => 
    autor.nome && 
    autor.nome.trim() !== "" && 
    autor.nome !== "Não informado."
  );

  console.log("Autores array completo:", autores);
  console.log("Valid autores encontrados:", validAutores);
  console.log("Número de autores válidos:", validAutores.length);

  const handleVitimaRelatoChange = (index: number, value: string) => {
    if (setVitimaRelato) {
      setVitimaRelato(index, value);
    }
  };

  const handleVitimaRepresentacaoChange = (index: number, value: string) => {
    if (setVitimaRepresentacao) {
      setVitimaRepresentacao(index, value);
    }
  };

  const handleTestemunhaRelatoChange = (index: number, value: string) => {
    console.log(`Alterando relato da testemunha ${index}:`, value);
    if (setTestemunhaRelato) {
      setTestemunhaRelato(index, value);
    }
  };

  const handleAutorRelatoChange = (index: number, value: string) => {
    console.log(`Alterando relato do autor ${index}:`, value);
    if (setAutorRelato) {
      setAutorRelato(index, value);
    }
  };

  useEffect(() => {
    if (!providencias || providencias === "Não informado.") {
      const generoAutor = autorSexo?.toLowerCase() === "feminino" ? "AUTORA" : "AUTOR";
      if (isDrugCase) {
        setProvidencias(`${generoAutor} DO FATO CONDUZIDO ATÉ O CISC DO PARQUE DO LAGO PARA A CONFECÇÃO DESTE TCO.`);
      } else {
        setProvidencias(`${generoAutor} DO FATO E A VÍTIMA CONDUZIDOS ATÉ O CISC DO PARQUE DO LAGO PARA A CONFECÇÃO DESTE TCO.`);
      }
    }
  }, [isDrugCase, autorSexo, providencias, setProvidencias]);

  useEffect(() => {
    const lista: string[] = [];
    const flagSim = (val: any) => typeof val === "string" && val.trim().toLowerCase() === "sim";
    const pessoasComLaudo = [
      ...((autores || []).filter(a => flagSim((a as any).laudoPericial))).map(a => a.nome),
      ...((vitimas || []).filter(v => flagSim((v as any).laudoPericial))).map(v => v.nome)
    ].filter(n => n && String(n).trim() !== "");
    const hasSeizure = isDrugCase || (apreensoes && apreensoes.trim() !== "");

    if (autores && autores.length > 0) lista.push("TERMO DE COMPROMISSO DE COMPARECIMENTO");
    if (!isDrugCase && vitimas && vitimas.length > 0) lista.push("TERMO DE MANIFESTAÇÃO DA VÍTIMA");
    if (hasSeizure) lista.push("TERMO DE APREENSÃO");
    if (isDrugCase) lista.push(`TERMO DE CONSTATAÇÃO PRELIMINAR DE DROGA${lacreNumero ? ` - LACRE Nº ${lacreNumero}` : ""}`);
    if (nomearFielDepositario?.trim().toLowerCase() === "sim" && (fielDepositarioSelecionado || "").trim() !== "" && hasSeizure) lista.push("TERMO DE DEPÓSITO");
    if (pessoasComLaudo.length > 0) lista.push("REQUISIÇÃO DE EXAME DE LESÃO CORPORAL");
    lista.push("TERMO DE ENCERRAMENTO E REMESSA");

    setDocumentosAnexos(lista.join("\n"));
  }, [isDrugCase, vitimas, apreensoes, nomearFielDepositario, fielDepositarioSelecionado, lacreNumero, autores, setDocumentosAnexos]);

  useEffect(() => {
    if (isDrugCase && internalDrugs && internalDrugs.length > 0) {
      // Debug: Log internalDrugs to verify contents
      console.log("internalDrugs in HistoricoTab:", internalDrugs);
      // Only update apreensoes if it's empty or not user-modified
      if (!apreensoes || apreensoes === "Não informado.") {
        const drugDescriptions = internalDrugs
          .map(drug => `- ${drug.indicios}`)
          .join("\n");
        setApreensoes(drugDescriptions);
      }
    }
  }, [isDrugCase, internalDrugs, apreensoes, setApreensoes]);

  useEffect(() => {
    if (!conclusaoPolicial || conclusaoPolicial.trim() === "" || conclusaoPolicial === "Não informado.") {
      const generoSuffix = autorSexo?.toLowerCase() === "feminino" ? "A" : "O";
      const base = "DIANTE DO EXPOSTO, POR SER INFRAÇÃO DE MENOR POTENCIAL OFENSIVO, LAVREI O TERMO CIRCUNSTANCIADO E PROVIDENCIEI SUA REMESSA AO JUIZADO ESPECIAL CRIMINAL.";
      const corpoDelito = solicitarCorpoDelito === "Sim"
        ? ` O(A) AUTOR(A) FOI COMPROMISSADO(A) A COMPARECER EM JUÍZO E LIBERAD${generoSuffix} COM LESÕES CORPORAIS APARENTES, SENDO REQUISITADO EXAME DE CORPO DE DELITO.`
        : ` O(A) AUTOR(A) FOI COMPROMISSADO(A) A COMPARECER EM JUÍZO E LIBERAD${generoSuffix} SEM LESÕES CORPORAIS APARENTES.`;
      setConclusaoPolicial(`${base}${corpoDelito}`);
    }
  }, [solicitarCorpoDelito, autorSexo, conclusaoPolicial, setConclusaoPolicial]);

  useEffect(() => {
    if (conclusaoPolicial) {
      let updatedConclusion = conclusaoPolicial;
      const generoSuffix = autorSexo?.toLowerCase() === "feminino" ? "A" : "O";
      if (solicitarCorpoDelito === "Sim") {
        if (updatedConclusion.includes("LIBERADO SEM LESÕES CORPORAIS APARENTES") || 
            updatedConclusion.includes("liberado sem lesões corporais aparentes")) {
          updatedConclusion = updatedConclusion.replace(
            /LIBERADO SEM LESÕES CORPORAIS APARENTES|liberado sem lesões corporais aparentes/gi, 
            `LIBERAD${generoSuffix} COM LESÕES CORPORAIS APARENTES CONFORME AUTO DE RESISTENCIA`
          );
          setConclusaoPolicial(updatedConclusion);
        }
      }
    }
  }, [solicitarCorpoDelito, conclusaoPolicial, autorSexo, setConclusaoPolicial]);

  useEffect(() => {
    return () => {
      selectedFiles.forEach(({
        file
      }) => {
        URL.revokeObjectURL(URL.createObjectURL(file));
      });
    };
  }, [selectedFiles]);

  // useEffect para gerar automaticamente o pré-texto do relatório policial
  useEffect(() => {
    // Só gera o pré-texto se o campo estiver vazio ou com texto padrão
    if (!relatoPolicial || relatoPolicial.trim() === "" || relatoPolicial === "Não informado.") {
      // Verifica se temos dados suficientes para gerar o pré-texto
      if (natureza && dataFato && localFato && validAutores.length > 0) {
        let preTexto = "";
        
        // Cabeçalho padrão
        preTexto += "Que no dia ";
        
        // Data do fato
        if (dataFato) {
          preTexto += `${dataFato}`;
        }
        
        // Hora do fato (se disponível)
        if (horaFato && horaFato.trim() !== "") {
          preTexto += `, por volta das ${horaFato}`;
        }
        
        preTexto += ", ";
        
        // Local do fato
        if (localFato) {
          preTexto += `no local denominado ${localFato.toUpperCase()}`;
        }
        
        // Endereço (se disponível)
        if (endereco && endereco.trim() !== "") {
          preTexto += `, situado na ${endereco}`;
        }
        
        // Município (se disponível)
        if (municipio && municipio.trim() !== "") {
          preTexto += `, ${municipio}`;
        }
        
        preTexto += ", ";
        
        // Natureza do fato
        const naturezaLower = natureza.toLowerCase();
        if (naturezaLower.includes("ameaça")) {
          preTexto += "houve ameaça";
        } else if (naturezaLower.includes("lesão corporal")) {
          preTexto += "houve lesão corporal";
        } else if (naturezaLower.includes("vias de fato")) {
          preTexto += "houve vias de fato";
        } else if (naturezaLower.includes("dano")) {
          preTexto += "houve dano";
        } else if (naturezaLower.includes("injúria")) {
          preTexto += "houve injúria";
        } else if (naturezaLower.includes("difamação")) {
          preTexto += "houve difamação";
        } else if (naturezaLower.includes("calúnia")) {
          preTexto += "houve calúnia";
        } else if (naturezaLower.includes("perturbação")) {
          preTexto += "houve perturbação do sossego";
        } else if (naturezaLower.includes("porte de drogas")) {
          preTexto += "foi constatado porte de drogas para consumo";
        } else if (naturezaLower.includes("conduzir veículo")) {
          preTexto += "houve condução de veículo sem CNH gerando perigo de dano";
        } else if (naturezaLower.includes("entregar veículo")) {
          preTexto += "houve entrega de veículo automotor a pessoa não habilitada";
        } else if (naturezaLower.includes("velocidade")) {
          preTexto += "houve tráfego em velocidade incompatível com a segurança";
        } else if (naturezaLower.includes("omissão")) {
          preTexto += "houve omissão de socorro";
        } else if (naturezaLower.includes("rixa")) {
          preTexto += "houve rixa";
        } else if (naturezaLower.includes("invasão")) {
          preTexto += "houve invasão de domicílio";
        } else if (naturezaLower.includes("fraude")) {
          preTexto += "houve fraude em comércio";
        } else if (naturezaLower.includes("ato obsceno")) {
          preTexto += "houve ato obsceno";
        } else if (naturezaLower.includes("falsa identidade")) {
          preTexto += "houve uso de falsa identidade";
        } else if (naturezaLower.includes("resistência")) {
          preTexto += "houve resistência";
        } else if (naturezaLower.includes("desobediência")) {
          preTexto += "houve desobediência";
        } else if (naturezaLower.includes("desacato")) {
          preTexto += "houve desacato";
        } else if (naturezaLower.includes("exercício arbitrário")) {
          preTexto += "houve exercício arbitrário das próprias razões";
        } else if (naturezaLower.includes("periclitação")) {
          preTexto += "houve periclitação da vida";
        } else {
          preTexto += `houve ${natureza.toLowerCase()}`;
        }
        
        // Informações sobre os envolvidos
        if (validAutores.length > 0) {
          const autorNomes = validAutores.map(autor => autor.nome.toUpperCase()).join(", ");
          if (validAutores.length === 1) {
            const genero = validAutores[0].sexo?.toLowerCase() === "feminino" ? "praticada" : "praticado";
            preTexto += ` ${genero} por ${autorNomes}`;
          } else {
            preTexto += ` praticado por ${autorNomes}`;
          }
        }
        
        // Informações sobre as vítimas (se houver)
        if (validVitimas.length > 0) {
          const vitimaNomes = validVitimas.map(vitima => vitima.nome.toUpperCase()).join(", ");
          if (validVitimas.length === 1) {
            preTexto += ` contra ${vitimaNomes}`;
          } else {
            preTexto += ` contra ${vitimaNomes}`;
          }
        }
        
        preTexto += ".";
        
        // Define o pré-texto gerado
        setRelatoPolicial(preTexto);
      }
    }
  }, [natureza, dataFato, horaFato, localFato, endereco, municipio, validAutores, validVitimas, relatoPolicial, setRelatoPolicial]);

  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (validFiles.length === 0) {
        console.warn("Nenhum arquivo de imagem válido selecionado.");
        return;
      }
      const newFiles = validFiles.map(file => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
      const fileNames = newFiles.map(({
        file
      }) => file.name).join(', ');
      console.log(`Selected files: ${fileNames}`);
    }
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter(fileObj => fileObj.id !== id);
      return newFiles;
    });
  };

  const handleVideoUrlsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const urls = e.target.value;
    setVideoUrls(urls);
    if (setVideoLinks) {
      setVideoLinks(urls.split("\n").filter(url => url.trim() !== ""));
    }
  };

  const truncateFileName = (name: string, maxLength: number = 15): string => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength - 3) + "...";
  };

  return (
    <div>
      <div className="form-grid">
        <div className="form-group">
          <Label htmlFor="relatoPolicial">RELATÓRIO POLICIAL</Label>
          <Textarea id="relatoPolicial" placeholder="Descreva o relato policial" value={relatoPolicial} onChange={e => setRelatoPolicial(e.target.value)} className="min-h-[150px] bg-white" />
        </div>

        {validAutores.length > 0 && (
          validAutores.map((autor, index) => (
            <div key={`autor-relato-${index}`} className="form-group">
              <Label htmlFor={`relatoAutor-${index}`}>RELATO DO AUTOR {autor.nome}</Label>
              <Textarea
                id={`relatoAutor-${index}`}
                placeholder={`Descreva o relato do autor ${autor.nome}`}
                value={autor.relato || "O AUTOR DOS FATOS ABAIXO ASSINADO, JÁ QUALIFICADO NOS AUTOS, CIENTIFICADO DE SEUS DIREITOS CONSTITUCIONAIS INCLUSIVE O DE PERMANECER EM SILÊNCIO, DECLAROU QUE [INSIRA DECLARAÇÃO]. LIDO E ACHADO CONFORME. NADA MAIS DISSE E NEM LHE FOI PERGUNTADO."}
                onChange={e => handleAutorRelatoChange(index, e.target.value)}
                className="min-h-[150px] bg-white"
              />
            </div>
          ))
        )}

        {validVitimas.length > 0 && (
          validVitimas.map((vitima, index) => (
            <div key={`vitima-section-${index}`}>
              <div className="form-group">
                <Label htmlFor={`relatoVitima-${index}`}>RELATO DA VÍTIMA {vitima.nome}</Label>
                <Textarea
                  id={`relatoVitima-${index}`}
                  placeholder={`Descreva o relato da vítima ${vitima.nome}`}
                  value={vitima.relato || "RELATOU A VÍTIMA, ABAIXO ASSINADA, JÁ QUALIFICADA NOS AUTOS, QUE [INSIRA DECLARAÇÃO]. LIDO E ACHADO CONFORME. NADA MAIS DISSE E NEM LHE FOI PERGUNTADO."}
                  onChange={e => handleVitimaRelatoChange(index, e.target.value)}
                  className="min-h-[150px] bg-white"
                />
              </div>
              <div className="form-group">
                <Label>REPRESENTAÇÃO DA VÍTIMA {vitima.nome}</Label>
                <RadioGroup
                  value={vitima.representacao || ""}
                  onValueChange={(value) => handleVitimaRepresentacaoChange(index, value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="representar" id={`representa-${index}`} />
                    <Label htmlFor={`representa-${index}`}>Vítima deseja representar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="decidir_posteriormente" id={`posteriormente-${index}`} />
                    <Label htmlFor={`posteriormente-${index}`}>Representação posterior (6 meses)</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          ))
        )}

        {validTestemunhas.length > 0 && (
          validTestemunhas.map((testemunha, index) => (
            <div key={`testemunha-relato-${index}`} className="form-group">
              <Label htmlFor={`relatoTestemunha-${index}`}>RELATO DA TESTEMUNHA {testemunha.nome}</Label>
              <Textarea
                id={`relatoTestemunha-${index}`}
                placeholder={`Descreva o relato da testemunha ${testemunha.nome}`}
                value={testemunha.relato || "A TESTEMUNHA ABAIXO ASSINADA, JÁ QUALIFICADA NOS AUTOS, COMPROMISSADA NA FORMA DA LEI, QUE AOS COSTUMES RESPONDEU NEGATIVAMENTE OU QUE É AMIGA/PARENTE DE UMA DAS PARTES, DECLAROU QUE [INSIRA DECLARAÇÃO]. LIDO E ACHADO CONFORME. NADA MAIS DISSERAM E NEM LHE FOI PERGUNTADO."}
                onChange={e => handleTestemunhaRelatoChange(index, e.target.value)}
                className="min-h-[150px] bg-white"
              />
            </div>
          ))
        )}

        <div className="form-group">
          <Label htmlFor="apreensoes">OBJETOS/DOCUMENTOS APREENDIDOS</Label>
          <Textarea id="apreensoes" placeholder="Descreva os objetos ou documentos apreendidos, se houver" value={apreensoes} onChange={e => setApreensoes(e.target.value)} className="min-h-[100px] bg-white" />
          <small className="field-hint">
            {!isDrugCase ? "Se houver apreensões, o Termo de Apreensão será gerado automaticamente no PDF." : "Para casos de drogas, o texto será adaptado automaticamente baseado nos tipos de drogas adicionados. Use um lacre único para todas as drogas."}
          </small>
        </div>

        {apreensoes && apreensoes.trim() !== "" && (
          <div className="form-group">
            <div className="form-group">
              <Label>Nomear Fiel Depositário?</Label>
              <RadioGroup
                value={nomearFielDepositario || "Não"}
                onValueChange={(value) => {
                  if (setNomearFielDepositario) {
                      setNomearFielDepositario(value);
                      if (value === "Não" && setFielDepositarioSelecionado) {
                        setFielDepositarioSelecionado("");
                      }
                    }
                  }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Não" id="fiel-nao" />
                  <Label htmlFor="fiel-nao">Não</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sim" id="fiel-sim" />
                  <Label htmlFor="fiel-sim">Sim</Label>
                </div>
              </RadioGroup>
            </div>

            {nomearFielDepositario === "Sim" && (
              <div className="form-group">
                <Label htmlFor="fielDepositarioSelect">Selecionar Pessoa Envolvida como Fiel Depositário:</Label>
                <Select
                    value={fielDepositarioSelecionado || ""}
                    onValueChange={(value) => {
                      if (setFielDepositarioSelecionado) {
                        setFielDepositarioSelecionado(value);
                      }
                    }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma pessoa envolvida" />
                  </SelectTrigger>
                  <SelectContent>
                      {autores && autores.length > 0 && autores.map((autor, index) => (
                        autor.nome && autor.nome.trim() !== "" && (
                          <SelectItem key={`autor-${index}`} value={`autor-${index}-${autor.nome}`}>
                            {autor.nome} (Autor)
                          </SelectItem>
                        )
                      ))}
                      {vitimas && vitimas.length > 0 && vitimas.map((vitima, index) => (
                        vitima.nome && vitima.nome.trim() !== "" && (
                          <SelectItem key={`vitima-${index}`} value={`vitima-${index}-${vitima.nome}`}>
                            {vitima.nome} (Vítima)
                          </SelectItem>
                        )
                      ))}
                      {testemunhas && testemunhas.length > 0 && testemunhas.map((testemunha, index) => (
                        testemunha.nome && testemunha.nome.trim() !== "" && (
                          <SelectItem key={`testemunha-${index}`} value={`testemunha-${index}-${testemunha.nome}`}>
                            {testemunha.nome} (Testemunha)
                          </SelectItem>
                        )
                      ))}
                  </SelectContent>
                </Select>
                {fielDepositarioSelecionado && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700">
                      <strong>Fiel Depositário Selecionado:</strong> {fielDepositarioSelecionado.split('-').slice(2).join('-')}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Esta pessoa será responsável pela guarda dos objetos/documentos apreendidos.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <Label htmlFor="providencias">PROVIDÊNCIAS</Label>
          <Textarea id="providencias" placeholder="Descreva as providências tomadas" value={providencias} onChange={e => setProvidencias(e.target.value)} className="min-h-[100px] bg-white" />
        </div>

        <div className="form-group">
          <Label htmlFor="documentosAnexos">DOCUMENTOS ANEXOS</Label>
          <Textarea id="documentosAnexos" placeholder="Documentos anexos ao TCO" value={documentosAnexos} onChange={e => setDocumentosAnexos(e.target.value)} className="min-h-[100px] bg-white" readOnly />
          <small className="field-hint">Lista de documentos gerada automaticamente com base nas informações do TCO.</small>
        </div>

        <div className="form-group">
          <Label htmlFor="conclusaoPolicial">CONCLUSÃO POLICIAL</Label>
          <small className="field-hint">ATENÇÃO: EM CASOS DE LESÃO CORPORAL, SOLICITE EXAME DE CORPO DE DELITO E AJUSTE O TEXTO.</small>
          <Textarea id="conclusaoPolicial" placeholder="Descreva a conclusão policial" value={conclusaoPolicial} onChange={e => setConclusaoPolicial((e.target.value || "").toUpperCase())} className="min-h-[150px] bg-white" />
          {solicitarCorpoDelito === "Sim" && (
            <small className="field-hint">Observação: O texto será ajustado para indicar que o autor possui lesões corporais aparentes.</small>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoricoTab;
