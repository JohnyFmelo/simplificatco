import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadTcoDocx, generateTcoBase64 } from "@/lib/WordTCO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import BasicInformationTab from "./BasicInformationTab";
import GeneralInformationTab from "./GeneralInformationTab";
import GuarnicaoTab from "./GuarnicaoTab";
import HistoricoTab from "./HistoricoTab";
import DrugVerificationTab from "./DrugVerificationTab";
import TermoCompromissoTab from "./TermoCompromissoTab";
import PessoasEnvolvidasTab from "./PessoasEnvolvidasTab";
import ArquivosTab from "./ArquivosTab";
import AudienciaTab from "./AudienciaTab";
import AvaliacoesTab, { Review } from "./AvaliacoesTab";
import { uploadPhoto, listPhotos, deletePhoto, getUserIdOrAnon } from "@/lib/supabasePhotos";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

// Tipos mínimos para composição
interface ComponenteGuarnicao {
  rg: string;
  nome: string;
  posto: string;
  pai?: string;
  mae?: string;
  naturalidade?: string;
  cpf?: string;
  telefone?: string;
  apoio?: boolean;
}
interface Droga {
  id: string;
  quantidade: string;
  substancia: string;
  cor: string;
  odor: string;
  indicios: string;
  isUnknownMaterial: boolean;
  customMaterialDesc: string;
}
const TCOForm: React.FC = () => {
  // Aba "Informações Básicas"
  const [tcoNumber, setTcoNumber] = useState("");
  const [natureza, setNatureza] = useState("");
  const [autor, setAutor] = useState("");
  const [penaDescricao] = useState("");
  const [cr, setCr] = useState("");
  const [unidade, setUnidade] = useState("");
  const [localRegistro, setLocalRegistro] = useState("");
  const naturezaOptions = useMemo(() => [
    "Ameaça",
    "Vias de Fato",
    "Lesão Corporal",
    "Dano",
    "Injúria",
    "Difamação",
    "Calúnia",
    "Perturbação do Sossego",
    "Porte de drogas para consumo",
    "Conduzir veículo sem CNH gerando perigo de dano",
    "Entregar veículo automotor a pessoa não habilitada",
    "Trafegar em velocidade incompatível com segurança",
    "Omissão de socorro",
    "Rixa",
    "Invasão de domicílio",
    "Fraude em comércio",
    "Ato obsceno",
    "Falsa identidade",
    "Resistência",
    "Desobediência",
    "Desacato",
    "Exercício arbitrário das próprias razões",
    "Periclitação da vida",
  ].sort((a, b) => a.localeCompare(b)), []);
  const [customNatureza, setCustomNatureza] = useState("");
  const [startTime] = useState<Date | null>(new Date());
  const [isTimerRunning] = useState(true);
  const [juizadoEspecialData, setJuizadoEspecialData] = useState("");
  const [juizadoEspecialHora, setJuizadoEspecialHora] = useState("");

  // Identificador único do TCO para persistência de fotos
  const [tcoId] = useState<string>(() => {
    const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    return rnd;
  });

  // Aba "Dados da Ocorrência"
  const isCustomNatureza = natureza === "Outros";
  const [tipificacao, setTipificacao] = useState("");
  const [dataFato, setDataFato] = useState(() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  });
  const [horaFato, setHoraFato] = useState("");
  const [dataInicioRegistro, setDataInicioRegistro] = useState("");
  const [horaInicioRegistro, setHoraInicioRegistro] = useState("");
  const [dataTerminoRegistro, setDataTerminoRegistro] = useState("");
  const [horaTerminoRegistro, setHoraTerminoRegistro] = useState("");
  const [localFato, setLocalFato] = useState("");
  const [endereco, setEndereco] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [comunicante, setComunicante] = useState("");
  const [guarnicao, setGuarnicao] = useState("");
  const [operacao, setOperacao] = useState("");
  const [condutorNome] = useState("");
  const [condutorPosto] = useState("");
  const [condutorRg] = useState("");
  const [userSubtitle, setUserSubtitle] = useState("SimplificaTCO");
  const [accessLevel, setAccessLevel] = useState("");

  // Mapeamento Unidade -> Cidade para preencher município automaticamente
  const UNIDADE_TO_CIDADE: Record<string, string> = {
    "2º Comando Regional - Sede": "",
    "4º Batalhão de Polícia Militar": "Várzea Grande",
    "15ª Cia Independente de Polícia Militar - Força Tática": "Várzea Grande",
    "2ª Companhia de Polícia Militar do Bairro Jardim Imperial": "Várzea Grande",
    "25ª Companhia Independente de Polícia Militar": "Várzea Grande",
    "25º Batalhão de Polícia Militar do Bairro Cristo Rei": "Várzea Grande",
    "7º Batalhão de Polícia Militar - Rosário Oeste": "Rosário Oeste",
    "Núcleo de Polícia Militar - Bauxi": "Distrito de Bauxi",
    "1ª Companhia de Polícia Militar - Nobres": "Nobres",
    "Núcleo de Polícia Militar - Bom Jardim": "Distrito Bom Jardim",
    "2ª Companhia Independente de Jangada": "Jangada",
    "Núcleo de Polícia Militar - Acorizal": "Acorizal",
    "6ª Companhia Independente de Polícia Militar - Poconé": "Poconé",
    "Núcleo de Polícia Militar - Nossa Senhora do Livramento": "Nossa Senhora do Livramento"
  };
  const formatMunicipio = (cidade: string) => cidade ? `${cidade.toUpperCase()} - MT` : "";
  useEffect(() => {
    const cidade = UNIDADE_TO_CIDADE[unidade] || "";
    setMunicipio(formatMunicipio(cidade));
  }, [unidade]);

  useEffect(() => {
    const rg = localStorage.getItem("rgpm") || sessionStorage.getItem("rgpm") || "";
    const nivel = localStorage.getItem("nivel_acesso") || sessionStorage.getItem("nivel_acesso") || "";
    setAccessLevel(nivel || "");
    (async () => {
      try {
        if (rg) {
          const { data, error } = await supabase
            .from("police_officers")
            .select("nome_completo, graduacao")
            .eq("rgpm", rg)
            .single();
          if (!error && data) {
            const nome = String(data.nome_completo || "").trim();
            const primeiro = nome ? nome.split(" ")[0] : "";
            const grad = String(data.graduacao || "").trim();
            setUserSubtitle(`SimplificaTCO: ${grad} ${primeiro}`.trim());
            return;
          }
        }
      } catch {}
      setUserSubtitle("SimplificaTCO");
    })();
  }, []);

  // Pessoas Envolvidas
  type PersonalInfo = {
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
  };
  const initialPersonalInfo: PersonalInfo = {
    nome: "",
    sexo: "",
    estadoCivil: "",
    profissao: "",
    endereco: "",
    dataNascimento: "",
    naturalidade: "",
    filiacaoMae: "",
    filiacaoPai: "",
    rg: "",
    cpf: "",
    celular: "",
    email: "",
    laudoPericial: "Não",
    relato: "",
    representacao: ""
  };
  const [autores, setAutores] = useState<PersonalInfo[]>([initialPersonalInfo]);
  const [vitimas, setVitimas] = useState<PersonalInfo[]>([initialPersonalInfo]);
  const [testemunhas, setTestemunhas] = useState<PersonalInfo[]>([initialPersonalInfo]);
  const handleAutorDetalhadoChange = (index: number, field: string, value: string) => {
    setAutores(prev => prev.map((a, i) => i === index ? {
      ...a,
      [field]: value
    } : a));
  };
  const handleAddAutor = () => setAutores(prev => [...prev, {
    ...initialPersonalInfo
  }]);
  const handleRemoveAutor = (index: number) => setAutores(prev => prev.filter((_, i) => i !== index));
  const handleVitimaChange = (index: number, field: string, value: string) => {
    setVitimas(prev => prev.map((v, i) => i === index ? {
      ...v,
      [field]: value
    } : v));
  };
  const handleAddVitima = () => setVitimas(prev => [...prev, {
    ...initialPersonalInfo
  }]);
  const handleRemoveVitima = (index: number) => setVitimas(prev => prev.filter((_, i) => i !== index));
  const handleTestemunhaChange = (index: number, field: string, value: string) => {
    setTestemunhas(prev => prev.map((t, i) => i === index ? {
      ...t,
      [field]: value
    } : t));
  };
  const handleAddTestemunha = () => setTestemunhas(prev => [...prev, {
    ...initialPersonalInfo
  }]);
  const handleRemoveTestemunha = (index: number) => setTestemunhas(prev => prev.filter((_, i) => i !== index));

  // Handlers para relatos/representação usados pelo HistoricoTab
  const setVitimaRelato = (index: number, relato: string) => {
    setVitimas(prev => prev.map((v, i) => i === index ? {
      ...v,
      relato
    } : v));
  };
  const setVitimaRepresentacao = (index: number, representacao: string) => {
    setVitimas(prev => prev.map((v, i) => i === index ? {
      ...v,
      representacao
    } : v));
  };
  const setTestemunhaRelato = (index: number, relato: string) => {
    setTestemunhas(prev => prev.map((t, i) => i === index ? {
      ...t,
      relato
    } : t));
  };
  const setAutorRelato = (index: number, relato: string) => {
    setAutores(prev => prev.map((a, i) => i === index ? {
      ...a,
      relato
    } : a));
  };

  // Aba "Guarnição"
  const [componentesGuarnicao, setComponentesGuarnicao] = useState<ComponenteGuarnicao[]>([]);
  const handleAddPolicial = (p: ComponenteGuarnicao) => setComponentesGuarnicao(prev => [...prev, p]);
  const handleRemovePolicial = (index: number) => setComponentesGuarnicao(prev => prev.filter((_, i) => i !== index));
  const handleToggleApoio = (index: number) => setComponentesGuarnicao(prev => prev.map((p, i) => i === index ? {
    ...p,
    apoio: !p.apoio
  } : p));

  // Aba "Histórico"
  const [relatoPolicial, setRelatoPolicial] = useState("");
  const [relatoAutor, setRelatoAutor] = useState("");
  const [relatoVitima, setRelatoVitima] = useState("");
  const [relatoTestemunha, setRelatoTestemunha] = useState("");
  const [apreensoes, setApreensoes] = useState("");
  const [conclusaoPolicial, setConclusaoPolicial] = useState("");
  const [providencias, setProvidencias] = useState("");
  const [documentosAnexos, setDocumentosAnexos] = useState("");
  const [videoLinks, setVideoLinks] = useState<string[]>([]);
  const [solicitarCorpoDelito] = useState("Não");
  const [autorSexo] = useState("masculino");

  // Estados do Fiel Depositário
  const [nomearFielDepositario, setNomearFielDepositario] = useState("Não");
  const [fielDepositarioSelecionado, setFielDepositarioSelecionado] = useState("");

  // Aba "Drogas"
  const [novaDroga, setNovaDroga] = useState<Omit<Droga, "id">>({
    quantidade: "",
    substancia: "",
    cor: "",
    odor: "",
    indicios: "",
    isUnknownMaterial: false,
    customMaterialDesc: ""
  });
  const [drogasAdicionadas, setDrogasAdicionadas] = useState<Droga[]>([]);
  const [lacreNumero, setLacreNumero] = useState("");
  const [numeroRequisicao, setNumeroRequisicao] = useState("");
  const onNovaDrogaChange = (field: keyof Omit<Droga, "id">, value: string | boolean) => {
    // Atualiza o campo solicitado
    setNovaDroga(prev => {
      const next = {
        ...prev,
        [field]: value as any
      };

      // Lógica antiga dos "indícios" aplicada: tenta inferir o entorpecente
      // com base em tipo de substância, cor e odor.
      const tipo = (next.substancia || "").toLowerCase();
      const cor = (next.cor || "").toLowerCase();
      const odor = (next.odor || "").toLowerCase();
      let calculado = "";

      // Não calcular se for material não identificado (usa descrição customizada nos PDFs)
      if (!next.isUnknownMaterial) {
        if (tipo === "vegetal") {
          // Combinações típicas para vegetal
          if (cor === "verde") {
            // Maconha é o caso mais comum para vegetal verde
            calculado = "Maconha";
            // Odor muito forte pode sugerir Skank
            if (odor === "forte") {
              calculado = "Skank";
            }
          } else if (odor === "forte") {
            calculado = "Skank";
          }
        } else if (tipo === "artificial") {
          // Combinações típicas para artificial
          if (cor === "branca") {
            // Normalmente cocaína, especialmente se inodoro
            calculado = "Cocaína";
            if (odor === "inodoro") {
              calculado = "Cocaína";
            }
          } else if (cor === "amarelada") {
            // Crack costuma ser amarelado
            calculado = "Crack";
          }
        }
      }
      next.indicios = calculado;
      return next;
    });
  };
  const onAdicionarDroga = () => {
    const id = Math.random().toString(36).slice(2);
    setDrogasAdicionadas(prev => [...prev, {
      id,
      ...novaDroga
    }]);
    setNovaDroga({
      quantidade: "",
      substancia: "",
      cor: "",
      odor: "",
      indicios: "",
      isUnknownMaterial: false,
      customMaterialDesc: ""
    });
  };
  const onRemoverDroga = (id: string) => setDrogasAdicionadas(prev => prev.filter(d => d.id !== id));

  // Estado de fotos persistente via Supabase Storage
  type FotoItem = {
    id: string;
    url: string;
    storagePath: string;
    name: string;
  };
  const [fotosArquivos, setFotosArquivos] = useState<FotoItem[]>([]);
  useEffect(() => {
    (async () => {
      const userId = await getUserIdOrAnon();
      const listed = await listPhotos({
        tcoId,
        userId
      });
      setFotosArquivos(listed.map(p => ({
        id: p.path,
        url: p.publicUrl,
        storagePath: p.path,
        name: p.name
      })));
    })();
  }, [tcoId]);
  const onAddFotos = async (files: File[]) => {
    const MAX_PHOTOS = 20;
    const MAX_SIZE = 5 * 1024 * 1024;
    const imagens = files.filter(f => f.type.startsWith("image/") && f.size <= MAX_SIZE);
    if (imagens.length === 0) return;
    const capacidade = MAX_PHOTOS - fotosArquivos.length;
    if (capacidade <= 0) return;
    const imagensLimitadas = imagens.slice(0, capacidade);
    const userId = await getUserIdOrAnon();
    const uploads = await Promise.all(imagensLimitadas.map(async file => uploadPhoto({
      file,
      tcoId,
      userId
    })));
    const novasRemotas = uploads.map(u => u ? {
      id: u.path,
      url: u.publicUrl,
      storagePath: u.path,
      name: u.name
    } : null).filter((x): x is {
      id: string;
      url: string;
      storagePath: string;
      name: string;
    } => !!x);
    // Fallback local para qualquer imagem cujo upload falhou
    const novasLocais = imagensLimitadas.map((file, idx) => ({
      file,
      idx
    })).filter(({
      idx
    }) => !uploads[idx]).map(({
      file
    }) => ({
      id: `local-${Date.now()}-${file.name}`,
      url: URL.createObjectURL(file),
      storagePath: "",
      name: file.name
    }));
    setFotosArquivos(prev => [...prev, ...novasRemotas, ...novasLocais]);
  };
  const onRemoveFoto = async (id: string) => {
    const alvo = fotosArquivos.find(p => p.id === id);
    if (!alvo) return;
    // Se for item local (sem storagePath), apenas remover do estado
    if (!alvo.storagePath) {
      setFotosArquivos(prev => prev.filter(p => p.id !== id));
      return;
    }
    const ok = await deletePhoto(alvo.storagePath);
    if (!ok) return;
    setFotosArquivos(prev => prev.filter(p => p.id !== id));
  };
  const isDrugCase = natureza === "Porte de drogas para consumo";
  const [audienciaData, setAudienciaData] = useState("");
  const [audienciaHora, setAudienciaHora] = useState("");
  const [photoCaptions, setPhotoCaptions] = useState<Record<string, string>>({});

  // Estado para Avaliações e Feedback
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setReviews(data as Review[]);
      }
    } catch (error) {
      console.error("Erro ao carregar avaliações", error);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleSaveFeedback = async () => {
    if (feedbackRating === 0) {
      toast({
        variant: "destructive",
        title: "Avaliação necessária",
        description: "Por favor, selecione uma nota de 1 a 5 estrelas.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('avaliacoes')
        .insert([
          {
            stars: feedbackRating,
            text: feedbackText,
          }
        ]);

      if (error) throw error;

      setIsFeedbackDialogOpen(false);
      setFeedbackRating(0);
      setFeedbackText("");
      
      toast({
        title: "Avaliação enviada!",
        description: "Obrigado pelo seu feedback.",
      });

      fetchReviews();
    } catch (error) {
      console.error("Erro ao salvar avaliação", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar sua avaliação.",
      });
    }
  };

  // Navegação controlada por etapas
  const {
    toast
  } = useToast();
  const [activeTab, setActiveTab] = useState("basico");
  const tabOrder = useMemo(() => isDrugCase ? ["basico", "geral", "drogas", "pessoas", "guarnicao", "historico", "arquivos", "audiencia", "feedback"] : ["basico", "geral", "pessoas", "guarnicao", "historico", "arquivos", "audiencia", "feedback"], [isDrugCase]);
  const validateBasico = () => !!tcoNumber.trim() && !!natureza.trim() && !!cr.trim() && !!unidade.trim() && !!localRegistro.trim() && (natureza !== "Outros" || !!customNatureza.trim());
  const validateGeral = () => !!dataFato.trim() && !!horaFato.trim() && !!localFato.trim() && !!municipio.trim();
  const validatePessoas = () => autores.length > 0 && autores.every(a => !!a.nome?.trim() && (a.semCpf === 'true' || (a.cpf && a.cpf.replace(/\D/g, "").length === 11)));
  const validateGuarnicao = () => componentesGuarnicao.length > 0;
  const validateHistorico = () => !!relatoPolicial.trim();
  const validateAudiencia = () => !!audienciaData.trim() && !!audienciaHora.trim();

  const checkTabValidity = (tab: string) => {
    switch (tab) {
      case 'basico': return validateBasico();
      case 'geral': return validateGeral();
      case 'pessoas': return validatePessoas();
      case 'guarnicao': return validateGuarnicao();
      case 'historico': return validateHistorico();
      case 'audiencia': return validateAudiencia();
      default: return true;
    }
  };

  const canNavigateToTab = (targetTab: string) => {
      const targetIdx = tabOrder.indexOf(targetTab);
      if (targetIdx === -1) return false;
      if (targetIdx === 0) return true;
      for (let i = 0; i < targetIdx; i++) {
          if (!checkTabValidity(tabOrder[i])) return false;
      }
      return true;
  };

  const goToNextTab = () => {
    if (!checkTabValidity(activeTab)) {
       toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha todos os campos obrigatórios (*) desta aba antes de prosseguir." });
       return;
    }
    const idx = tabOrder.indexOf(activeTab as (typeof tabOrder)[number]);
    if (idx >= 0 && idx < tabOrder.length - 1) setActiveTab(tabOrder[idx + 1]);
  };
  const isLastTab = activeTab === tabOrder[tabOrder.length - 1];
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const validateForm = (): boolean => {
    const errors: string[] = [];
    // Básico
    if (!tcoNumber.trim()) errors.push("Número do TCO");
    if (!natureza.trim()) errors.push("Natureza");
    if (natureza === "Outros" && !customNatureza.trim()) errors.push("Descrição da Natureza (Outros)");
    // Novos campos obrigatórios
    if (!cr.trim()) errors.push("CR");
    if (!unidade.trim()) errors.push("Unidade");
    if (!localRegistro.trim()) errors.push("Local do Registro");
    
    // Dados da Ocorrência
    if (!dataFato.trim()) errors.push("Data do Fato");
    if (!horaFato.trim()) errors.push("Hora do Fato");
    if (!localFato.trim()) errors.push("Local do Fato");
    if (!municipio.trim()) errors.push("Município");

    // Pessoas: CPF do Autor Principal e existência de autor
    if (autores.length === 0) {
      errors.push("Ao menos um Autor");
    } else {
      autores.forEach((autor, idx) => {
        if (autor.semCpf === 'true') return;
        const cpf = (autor.cpf || "").replace(/\D/g, "");
        if (cpf.length !== 11) errors.push(`CPF do Autor ${autor.nome || (idx + 1)}`);
      });
    }

    // Guarnição
    if (componentesGuarnicao.length === 0) {
      errors.push("Ao menos um Policial na Guarnição");
    }

    // Histórico
    if (!relatoPolicial.trim()) errors.push("Relato Policial");

    // Audiência
    if (!audienciaData.trim()) errors.push("Data da Audiência");
    if (!audienciaHora.trim()) errors.push("Hora da Audiência");

    if (errors.length) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios faltando",
        description: `Preencha: ${errors.join(", ")}`
      });
      return false;
    }
    return true;
  };
  const handleFinish = () => {
    if (!validateForm()) return;
    setShowEmailDialog(true);
  };

  const confirmSendEmail = async () => {
    if (!emailTo || !emailTo.includes('@')) {
      toast({ variant: "destructive", title: "E-mail inválido", description: "Por favor, insira um e-mail válido." });
      return;
    }
    
    setIsSendingEmail(true);
    try {
      const now = new Date();
      const pad2 = (n: number) => n.toString().padStart(2, '0');
      const finalDataTermino = dataTerminoRegistro && dataTerminoRegistro.trim() 
        ? dataTerminoRegistro 
        : `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
      const finalHoraTermino = horaTerminoRegistro && horaTerminoRegistro.trim() 
        ? horaTerminoRegistro 
        : `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      
      const pessoasComLaudo = [...vitimas, ...autores].filter(p => p.solicitarLaudoLesao);

      const opts = {
        unidade,
        cr,
        tcoNumber,
        natureza,
        autoresNomes: autores.map(a => a.nome).filter(Boolean),
        relatoPolicial,
        conclusaoPolicial,
        providencias,
        documentosAnexos,
        guarnicaoLista: componentesGuarnicao.map(g => ({
          nome: g.nome,
          posto: g.posto,
          rg: g.rg
        })),
        autoresDetalhados: autores.map(a => ({
          nome: a.nome,
          relato: a.relato
        })),
        condutor: componentesGuarnicao[0] ? {
          nome: componentesGuarnicao[0].nome,
          posto: componentesGuarnicao[0].posto,
          rg: componentesGuarnicao[0].rg,
          pai: componentesGuarnicao[0].pai,
          mae: componentesGuarnicao[0].mae,
          naturalidade: componentesGuarnicao[0].naturalidade,
          cpf: componentesGuarnicao[0].cpf,
          telefone: componentesGuarnicao[0].telefone,
          nome_completo: componentesGuarnicao[0].nome,
          graduacao: componentesGuarnicao[0].posto,
          rgpm: componentesGuarnicao[0].rg,
          nome_pai: componentesGuarnicao[0].pai,
          nome_mae: componentesGuarnicao[0].mae
        } : undefined,
        localRegistro,
        municipio,
        tipificacao,
        dataFato,
        horaFato,
        dataInicioRegistro,
        horaInicioRegistro,
        dataTerminoRegistro: finalDataTermino,
        horaTerminoRegistro: finalHoraTermino,
        localFato,
        endereco,
        comunicante,
        testemunhas,
        vitimas,
        autores,
        imageUrls: fotosArquivos.map(f => f.url),
        imageCaptions: fotosArquivos.map(f => (photoCaptions[f.id] || "")),
        audienciaData,
        audienciaHora,
        apreensoes,
        drogas: drogasAdicionadas,
        lacreNumero,
        numeroRequisicao,
        periciasLesao: pessoasComLaudo.map(p => p.nome),
        nomearFielDepositario,
        fielDepositarioSelecionado
      };

      const { base64, filename } = await generateTcoBase64(opts);

      const payload = {
        api_key: "STCO_PRO_SECURE_KEY_BPM25_V2",
        to: emailTo,
        subject: `TCO ${tcoNumber} - ${natureza}`,
        htmlBody: `<h1>SimplificaTCO</h1><p>Segue o documento em anexo referente ao TCO ${tcoNumber}.</p><hr><small>Enviado automaticamente pelo SimplificaTCO.</small>`,
        attachments: [
          {
            filename: filename,
            content: base64,
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          }
        ]
      };

      // Envio via Banco de Dados (Tabela de Fila + Trigger pg_net)
      // Isso evita problemas de CORS e não requer deploy de Edge Function
      const { error } = await supabase
        .from('email_queue')
        .insert({ payload: payload });

      if (error) throw new Error(error.message || "Erro ao enfileirar e-mail no banco de dados");
      
      toast({ title: "Enviado!", description: `O TCO foi enviado para ${emailTo}.` });
      setShowEmailDialog(false);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro no envio", description: "Falha ao enviar o documento por e-mail." });
    } finally {
      setIsSendingEmail(false);
    }
  };


  // Download do TCO em DOCX na aba "Audiência" (parte final)
  const handleDownloadWord = async () => {
    if (!validateForm()) return;

    // Auto-calculate end date/time
    const now = new Date();
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const currentData = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
    const currentHora = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    
    // Always update end time on download as per user request
    setDataTerminoRegistro(currentData);
    setHoraTerminoRegistro(currentHora);

    // Use current/calculated values for document
    const finalDataTermino = currentData;
    const finalHoraTermino = currentHora;

    const flagSim = (val: any) => typeof val === 'string' && val.trim().toLowerCase() === 'sim';
    const isDrugCaseLocal = Array.isArray(drogasAdicionadas) && drogasAdicionadas.length > 0;
    const anexosList: string[] = [];
    if (autores && autores.length > 0) anexosList.push("TERMO DE COMPROMISSO DE COMPARECIMENTO");
    const hasVitimas = Array.isArray(vitimas) && vitimas.some(v => (v?.nome || "").trim());
    if (!isDrugCaseLocal && hasVitimas) anexosList.push("TERMO DE MANIFESTAÇÃO DA VÍTIMA");
    if (isDrugCaseLocal || (apreensoes && apreensoes.trim() !== '')) anexosList.push("TERMO DE APREENSÃO");
    if (isDrugCaseLocal) anexosList.push("TERMO DE CONSTATAÇÃO PRELIMINAR DE DROGA");
    if (nomearFielDepositario.trim().toLowerCase() === 'sim' && fielDepositarioSelecionado.trim() !== '') anexosList.push("TERMO DE DEPÓSITO");
    const pessoasComLaudo = [
      ...(autores || []).filter(a => flagSim(a.laudoPericial)).map(a => ({ nome: a.nome })),
      ...(vitimas || []).filter(v => flagSim(v.laudoPericial)).map(v => ({ nome: v.nome }))
    ].filter(p => p.nome && String(p.nome).trim());
    if (pessoasComLaudo.length > 0) anexosList.push("REQUISIÇÃO DE EXAME DE LESÃO CORPORAL");
    anexosList.push("TERMO DE ENCERRAMENTO E REMESSA");
    try {
      setIsDownloadingDocx(true);
      await downloadTcoDocx({
        unidade,
        cr,
        tcoNumber,
        natureza,
        autoresNomes: autores.map(a => a.nome).filter(Boolean),
        autoresDetalhados: autores.map(a => ({
          nome: a.nome,
          relato: a.relato
        })),
        autores,
        relatoPolicial,
        conclusaoPolicial,
        providencias,
        documentosAnexos: anexosList.join('\n'),
        periciasLesao: pessoasComLaudo.map(p => p.nome),
        condutor: componentesGuarnicao[0] ? {
          nome: componentesGuarnicao[0].nome,
          posto: componentesGuarnicao[0].posto,
          rg: componentesGuarnicao[0].rg,
          pai: componentesGuarnicao[0].pai,
          mae: componentesGuarnicao[0].mae,
          naturalidade: componentesGuarnicao[0].naturalidade,
          cpf: componentesGuarnicao[0].cpf,
          telefone: componentesGuarnicao[0].telefone,
          nome_completo: componentesGuarnicao[0].nome,
          graduacao: componentesGuarnicao[0].posto,
          rgpm: componentesGuarnicao[0].rg,
          nome_pai: componentesGuarnicao[0].pai,
          nome_mae: componentesGuarnicao[0].mae
        } : undefined,
        localRegistro,
        municipio,
        tipificacao,
        dataFato,
        horaFato,
        dataInicioRegistro,
        horaInicioRegistro,
        dataTerminoRegistro: finalDataTermino,
        horaTerminoRegistro: finalHoraTermino,
        localFato,
        endereco,
        comunicante,
        testemunhas,
        vitimas,
        imageUrls: fotosArquivos.map(f => f.url),
        imageCaptions: fotosArquivos.map(f => (photoCaptions[f.id] || "")),
        guarnicaoLista: componentesGuarnicao.map(g => ({
          nome: g.nome,
          posto: g.posto,
          rg: g.rg
        })),
        audienciaData,
        audienciaHora,
        apreensoes,
        drogas: drogasAdicionadas,
        lacreNumero,
        numeroRequisicao,
        nomearFielDepositario,
        fielDepositarioSelecionado
      });
      // Abrir modal de avaliação após download
      setIsFeedbackDialogOpen(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao gerar DOCX", description: e?.message || String(e) });
    } finally {
      setIsDownloadingDocx(false);
    }
  };
  return <>
      <div className="header">
        <div className="absolute bottom-2 right-4 text-[10px] text-blue-200/50 font-light select-none">
          @johny.f.melo
        </div>
        <h1><i className="fas fa-file-alt"></i> Termo Circunstanciado de Ocorrência</h1>
        <div className="flex items-center gap-2 justify-center">
          <p>{userSubtitle}</p>
          {(accessLevel && accessLevel.toLowerCase().startsWith("admin")) && (
            <span className="tag">Administrador</span>
          )}
          {(accessLevel && (accessLevel.toLowerCase().startsWith("padr") || accessLevel.toLowerCase() === "padrao")) && (
            <span className="tag">Padrão</span>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={val => setActiveTab(val)}>
          <TabsList className="flex w-full">
            <TabsTrigger className={activeTab === "basico" ? "tab active" : "tab"} value="basico" disabled={!canNavigateToTab("basico")}><i className="fas fa-info-circle"></i> Informações Básicas</TabsTrigger>
            <TabsTrigger className={activeTab === "geral" ? "tab active" : "tab"} value="geral" disabled={!canNavigateToTab("geral")}><i className="fas fa-calendar-alt"></i> Dados da Ocorrência</TabsTrigger>
            {isDrugCase && <TabsTrigger className={activeTab === "drogas" ? "tab active" : "tab"} value="drogas" disabled={!canNavigateToTab("drogas")}><i className="fas fa-flask"></i> Drogas</TabsTrigger>}
            <TabsTrigger className={activeTab === "pessoas" ? "tab active" : "tab"} value="pessoas" disabled={!canNavigateToTab("pessoas")}><i className="fas fa-users"></i> Pessoas Envolvidas</TabsTrigger>
            <TabsTrigger className={activeTab === "guarnicao" ? "tab active" : "tab"} value="guarnicao" disabled={!canNavigateToTab("guarnicao")}><i className="fas fa-shield-alt"></i> Guarnição</TabsTrigger>
            <TabsTrigger className={activeTab === "historico" ? "tab active" : "tab"} value="historico" disabled={!canNavigateToTab("historico")}><i className="fas fa-history"></i> Histórico</TabsTrigger>
            <TabsTrigger className={activeTab === "arquivos" ? "tab active" : "tab"} value="arquivos" disabled={!canNavigateToTab("arquivos")}><i className="fas fa-camera"></i> Fotos</TabsTrigger>
            <TabsTrigger className={activeTab === "audiencia" ? "tab active" : "tab"} value="audiencia" disabled={!canNavigateToTab("audiencia")}><i className="fas fa-gavel"></i> Audiência</TabsTrigger>
            <TabsTrigger className={activeTab === "feedback" ? "tab active" : "tab"} value="feedback" disabled={!canNavigateToTab("feedback")}><i className="fas fa-star"></i> Feedback</TabsTrigger>
          </TabsList>

          <div className="form-content">
        <TabsContent value="basico">
          <BasicInformationTab tcoNumber={tcoNumber} setTcoNumber={setTcoNumber} natureza={natureza} setNatureza={setNatureza} autor={autor} setAutor={setAutor} penaDescricao={penaDescricao} naturezaOptions={naturezaOptions} customNatureza={customNatureza} setCustomNatureza={setCustomNatureza} startTime={startTime} isTimerRunning={isTimerRunning} cr={cr} setCr={setCr} unidade={unidade} setUnidade={value => {
          setUnidade(value);
          const MAPA: Record<string, string> = {
            "2º Comando Regional - Sede": "",
            "4º Batalhão de Polícia Militar": "Várzea Grande",
            "15ª Cia Independente de Polícia Militar - Força Tática": "Várzea Grande",
            "25º Batalhão de Polícia Militar do Bairro Cristo Rei": "Várzea Grande",
            "25ª Companhia Independente de Polícia Militar": "Várzea Grande"
          };
          setMunicipio(MAPA[value] || municipio);
          if (cr === "2º Comando Regional") {
            if (/25º\s*Batalhão\s+de\s+Polícia\s+Militar/i.test(value)) {
              setLocalRegistro("CISC DO PARQUE DO LAGO");
            } else if (/25\s*[ºª]\s*(CIPM|Companhia\s+Independente)/i.test(value)) {
              setLocalRegistro("BASE DA 25ª CIPM");
            }
          }
        }} localRegistro={localRegistro} setLocalRegistro={setLocalRegistro} onTipificacaoChange={setTipificacao} setStartTimestamp={() => {
          if (!dataInicioRegistro) {
             const now = new Date();
             const pad2 = (n: number) => n.toString().padStart(2, '0');
             setDataInicioRegistro(`${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`);
             setHoraInicioRegistro(`${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
          }
        }} />
        </TabsContent>

        <TabsContent value="geral">
          <GeneralInformationTab natureza={natureza} tipificacao={tipificacao} setTipificacao={setTipificacao} isCustomNatureza={isCustomNatureza} customNatureza={customNatureza} dataFato={dataFato} setDataFato={setDataFato} horaFato={horaFato} setHoraFato={setHoraFato} dataInicioRegistro={dataInicioRegistro} setDataInicioRegistro={setDataInicioRegistro} horaInicioRegistro={horaInicioRegistro} setHoraInicioRegistro={setHoraInicioRegistro} dataTerminoRegistro={dataTerminoRegistro} setDataTerminoRegistro={setDataTerminoRegistro} horaTerminoRegistro={horaTerminoRegistro} setHoraTerminoRegistro={setHoraTerminoRegistro} localFato={localFato} setLocalFato={setLocalFato} endereco={endereco} setEndereco={setEndereco} municipio={municipio} setMunicipio={setMunicipio} comunicante={comunicante} setComunicante={setComunicante} guarnicao={guarnicao} setGuarnicao={setGuarnicao} operacao={operacao} setOperacao={setOperacao} condutorNome={condutorNome} condutorPosto={condutorPosto} condutorRg={condutorRg} />
        </TabsContent>

        {isDrugCase && <TabsContent value="drogas">
            <DrugVerificationTab novaDroga={novaDroga} onNovaDrogaChange={onNovaDrogaChange} onAdicionarDroga={onAdicionarDroga} drogasAdicionadas={drogasAdicionadas} onRemoverDroga={onRemoverDroga} lacreNumero={lacreNumero} setLacreNumero={setLacreNumero} numeroRequisicao={numeroRequisicao} setNumeroRequisicao={setNumeroRequisicao} />
          </TabsContent>}

        <TabsContent value="pessoas">
          <PessoasEnvolvidasTab vitimas={vitimas} handleVitimaChange={handleVitimaChange} handleAddVitima={handleAddVitima} handleRemoveVitima={handleRemoveVitima} testemunhas={testemunhas} handleTestemunhaChange={handleTestemunhaChange} handleAddTestemunha={handleAddTestemunha} handleRemoveTestemunha={handleRemoveTestemunha} autores={autores} handleAutorDetalhadoChange={handleAutorDetalhadoChange} handleAddAutor={handleAddAutor} handleRemoveAutor={handleRemoveAutor} natureza={natureza} />
        </TabsContent>

        <TabsContent value="guarnicao">
          <GuarnicaoTab currentGuarnicaoList={componentesGuarnicao} onAddPolicial={handleAddPolicial} onRemovePolicial={handleRemovePolicial} onToggleApoioPolicial={handleToggleApoio} />
        </TabsContent>

        <TabsContent value="historico">
          <HistoricoTab relatoPolicial={relatoPolicial} setRelatoPolicial={setRelatoPolicial} relatoAutor={relatoAutor} setRelatoAutor={setRelatoAutor} relatoVitima={relatoVitima} setRelatoVitima={setRelatoVitima} relatoTestemunha={relatoTestemunha} setRelatoTestemunha={setRelatoTestemunha} apreensoes={apreensoes} setApreensoes={setApreensoes} conclusaoPolicial={conclusaoPolicial} setConclusaoPolicial={setConclusaoPolicial} natureza={natureza} videoLinks={videoLinks} setVideoLinks={setVideoLinks} solicitarCorpoDelito={solicitarCorpoDelito} autorSexo={autorSexo} providencias={providencias} setProvidencias={setProvidencias} documentosAnexos={documentosAnexos} setDocumentosAnexos={setDocumentosAnexos} lacreNumero={lacreNumero} internalDrugs={drogasAdicionadas} nomearFielDepositario={nomearFielDepositario} setNomearFielDepositario={setNomearFielDepositario} fielDepositarioSelecionado={fielDepositarioSelecionado} setFielDepositarioSelecionado={setFielDepositarioSelecionado} dataFato={dataFato} horaFato={horaFato} localFato={localFato} endereco={endereco} municipio={municipio} vitimas={vitimas} testemunhas={testemunhas} autores={autores} setVitimaRelato={setVitimaRelato} setVitimaRepresentacao={setVitimaRepresentacao} setTestemunhaRelato={setTestemunhaRelato} setAutorRelato={setAutorRelato} />
        </TabsContent>

        <TabsContent value="arquivos">
          <ArquivosTab fotos={fotosArquivos} onAddFotos={onAddFotos} onRemoveFoto={onRemoveFoto} cr={cr} unidade={unidade} captionsById={photoCaptions} onCaptionChange={(id, caption) => setPhotoCaptions(prev => ({ ...prev, [id]: caption }))} tcoNumber={tcoNumber} natureza={natureza} autoresNomes={autores.map(a => a.nome).filter(Boolean)} autoresDetalhados={autores.map(a => ({
          nome: a.nome,
          relato: a.relato
        }))} relatoPolicial={relatoPolicial} conclusaoPolicial={conclusaoPolicial} providencias={providencias} documentosAnexos={documentosAnexos} condutor={componentesGuarnicao[0] ? {
          nome: componentesGuarnicao[0].nome,
          posto: componentesGuarnicao[0].posto,
          rg: componentesGuarnicao[0].rg
        } : undefined} localRegistro={localRegistro} municipio={municipio}
        // Novos campos para DOCX
        tipificacao={tipificacao} dataFato={dataFato} horaFato={horaFato} dataInicioRegistro={dataInicioRegistro} horaInicioRegistro={horaInicioRegistro} dataTerminoRegistro={dataTerminoRegistro} horaTerminoRegistro={horaTerminoRegistro} localFato={localFato} endereco={endereco} comunicante={comunicante} testemunhas={testemunhas} vitimas={vitimas} />
        </TabsContent>

        <TabsContent value="audiencia">
          <AudienciaTab audienciaData={audienciaData} setAudienciaData={setAudienciaData} audienciaHora={audienciaHora} setAudienciaHora={setAudienciaHora} />
        </TabsContent>

        <TabsContent value="feedback">
          <AvaliacoesTab reviews={reviews} onOpenFeedback={() => setIsFeedbackDialogOpen(true)} />
        </TabsContent>
          </div>
          <div className="footer">
            {activeTab === "audiencia" ? (
              <div className="flex w-full justify-end">
                <div className="flex flex-col gap-2">
                  <button
                    className={`btn-primary w-full justify-center ${isDownloadingDocx ? 'loading' : ''}`}
                    onClick={handleDownloadWord}
                    disabled={isDownloadingDocx}
                    aria-disabled={isDownloadingDocx}
                  >
                    {isDownloadingDocx ? 'Baixando TCO...' : 'Baixar TCO'} {isDownloadingDocx ? <i className="fas fa-spinner" /> : <i className="fas fa-download" />}
                  </button>
                  <button
                    className="btn-primary w-full justify-center"
                    onClick={handleFinish}
                  >
                    Enviar <i className="fas fa-paper-plane" />
                  </button>
                </div>
              </div>
            ) : activeTab === "feedback" ? (
               <></>
            ) : (
              <button className="btn-primary" onClick={goToNextTab}>Próximo <i className="fas fa-arrow-right"></i></button>
            )}
          </div>
          
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enviar TCO por E-mail</DialogTitle>
            <DialogDescription>
              Informe o endereço de e-mail para receber o documento DOCX gerado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email-to">E-mail de Destino</Label>
              <Input
                id="email-to"
                placeholder="exemplo@email.com"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <button className="btn-secondary" onClick={() => setShowEmailDialog(false)}>
              Cancelar
            </button>
            <button 
              className="btn-primary" 
              onClick={confirmSendEmail} 
              disabled={isSendingEmail}
            >
              {isSendingEmail ? <><i className="fas fa-spinner fa-spin mr-2"></i> Enviando...</> : <><i className="fas fa-paper-plane mr-2"></i> Enviar</>}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Deixe uma avaliação ou sugestão.</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  className={`text-2xl transition-colors ${
                    star <= feedbackRating ? "text-yellow-500" : "text-gray-300"
                  }`}
                >
                  <i className="fas fa-star"></i>
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feedback-text">Comentário (opcional)</Label>
              <Textarea
                id="feedback-text"
                placeholder="O que você achou? Sugestões?"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <button className="btn-secondary" onClick={() => setIsFeedbackDialogOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSaveFeedback}>
              Enviar Avaliação
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Tabs>
    </>;
};
export default TCOForm;