import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [penaDescricao] = useState("");
  const [cr, setCr] = useState("");
  const [unidade, setUnidade] = useState("");
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
    "Outros",
  ], []);
  const [customNatureza, setCustomNatureza] = useState("");
  const [startTime] = useState<Date | null>(new Date());
  const [isTimerRunning] = useState(true);
  const [juizadoEspecialData, setJuizadoEspecialData] = useState("");
  const [juizadoEspecialHora, setJuizadoEspecialHora] = useState("");

  // Aba "Dados da Ocorrência"
  const isCustomNatureza = natureza === "Outros";
  const [tipificacao, setTipificacao] = useState("");
  const [dataFato, setDataFato] = useState("");
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

  // Mapeamento Unidade -> Cidade para preencher município automaticamente
  const UNIDADE_TO_CIDADE: Record<string, string> = {
    "2º Comando Regional - Sede": "",
    "4º Batalhão de Polícia Militar": "Várzea Grande",
    "15ª Cia Independente de Polícia Militar - Força Tática": "Várzea Grande",
    "2ª Companhia de Polícia Militar do Bairro Jardim Imperial": "Várzea Grande",
    "3ª Companhia de Polícia Militar do Bairro São Matheus": "Várzea Grande",
    "25º Batalhão de Polícia Militar do Bairro Cristo Rei": "Várzea Grande",
    "7º Batalhão de Polícia Militar - Rosário Oeste": "Rosário Oeste",
    "Núcleo de Polícia Militar - Bauxi": "Distrito de Bauxi",
    "1ª Companhia de Polícia Militar - Nobres": "Nobres",
    "Núcleo de Polícia Militar - Bom Jardim": "Distrito Bom Jardim",
    "2ª Companhia Independente de Jangada": "Jangada",
    "Núcleo de Polícia Militar - Acorizal": "Acorizal",
    "6ª Companhia Independente de Polícia Militar - Poconé": "Poconé",
    "Núcleo de Polícia Militar - Nossa Senhora do Livramento": "Nossa Senhora do Livramento",
  };
  const formatMunicipio = (cidade: string) => cidade ? `${cidade.toUpperCase()} - MT` : "";
  useEffect(() => {
    const cidade = UNIDADE_TO_CIDADE[unidade] || "";
    setMunicipio(formatMunicipio(cidade));
  }, [unidade]);

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
    representacao: "",
  };

  const [autores, setAutores] = useState<PersonalInfo[]>([initialPersonalInfo]);
  const [vitimas, setVitimas] = useState<PersonalInfo[]>([initialPersonalInfo]);
  const [testemunhas, setTestemunhas] = useState<PersonalInfo[]>([initialPersonalInfo]);

  const handleAutorDetalhadoChange = (index: number, field: string, value: string) => {
    setAutores(prev => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };
  const handleAddAutor = () => setAutores(prev => [...prev, { ...initialPersonalInfo }]);
  const handleRemoveAutor = (index: number) => setAutores(prev => prev.filter((_, i) => i !== index));

  const handleVitimaChange = (index: number, field: string, value: string) => {
    setVitimas(prev => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };
  const handleAddVitima = () => setVitimas(prev => [...prev, { ...initialPersonalInfo }]);
  const handleRemoveVitima = (index: number) => setVitimas(prev => prev.filter((_, i) => i !== index));

  const handleTestemunhaChange = (index: number, field: string, value: string) => {
    setTestemunhas(prev => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };
  const handleAddTestemunha = () => setTestemunhas(prev => [...prev, { ...initialPersonalInfo }]);
  const handleRemoveTestemunha = (index: number) => setTestemunhas(prev => prev.filter((_, i) => i !== index));

  // Aba "Guarnição"
  const [componentesGuarnicao, setComponentesGuarnicao] = useState<ComponenteGuarnicao[]>([]);
  const handleAddPolicial = (p: ComponenteGuarnicao) => setComponentesGuarnicao(prev => [...prev, p]);
  const handleRemovePolicial = (index: number) => setComponentesGuarnicao(prev => prev.filter((_, i) => i !== index));
  const handleToggleApoio = (index: number) => setComponentesGuarnicao(prev => prev.map((p, i) => (i === index ? { ...p, apoio: !p.apoio } : p)));

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

  // Aba "Drogas"
  const [novaDroga, setNovaDroga] = useState<Omit<Droga, "id">>({
    quantidade: "",
    substancia: "",
    cor: "",
    odor: "",
    indicios: "",
    isUnknownMaterial: false,
    customMaterialDesc: "",
  });
  const [drogasAdicionadas, setDrogasAdicionadas] = useState<Droga[]>([]);
  const [lacreNumero, setLacreNumero] = useState("");
  const [numeroRequisicao, setNumeroRequisicao] = useState("");

  const onNovaDrogaChange = (field: keyof Omit<Droga, "id">, value: string | boolean) => {
    setNovaDroga(prev => ({ ...prev, [field]: value as any }));
  };
  const onAdicionarDroga = () => {
    const id = Math.random().toString(36).slice(2);
    setDrogasAdicionadas(prev => [...prev, { id, ...novaDroga }]);
    setNovaDroga({ quantidade: "", substancia: "", cor: "", odor: "", indicios: "", isUnknownMaterial: false, customMaterialDesc: "" });
  };
  const onRemoverDroga = (id: string) => setDrogasAdicionadas(prev => prev.filter(d => d.id !== id));

  const isDrugCase = natureza === "Porte de drogas para consumo";

  // Navegação controlada por etapas
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basico");
  const tabOrder = useMemo(() => (
    isDrugCase
      ? ["basico", "geral", "drogas", "pessoas", "guarnicao", "historico", "arquivos"]
      : ["basico", "geral", "pessoas", "guarnicao", "historico", "arquivos"]
  ), [isDrugCase]);
  const goToNextTab = () => {
    const idx = tabOrder.indexOf(activeTab as (typeof tabOrder)[number]);
    if (idx >= 0 && idx < tabOrder.length - 1) setActiveTab(tabOrder[idx + 1]);
  };
  const isLastTab = activeTab === tabOrder[tabOrder.length - 1];

  const validateForm = (): boolean => {
    const errors: string[] = [];
    // Básico
    if (!tcoNumber.trim()) errors.push("Número do TCO");
    if (!natureza.trim()) errors.push("Natureza");
    if (natureza === "Outros" && !customNatureza.trim()) errors.push("Descrição da Natureza (Outros)");
    // Novos campos obrigatórios
    if (!cr.trim()) errors.push("CR");
    if (!unidade.trim()) errors.push("Unidade");
    // Pessoas: CPF do Autor Principal
    if (autores.length === 0) {
      errors.push("Ao menos um Autor");
    } else {
      const cpfAutor = (autores[0].cpf || "").replace(/\D/g, "");
      if (cpfAutor.length !== 11) errors.push("CPF do Autor Principal");
    }

    if (errors.length) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios faltando",
        description: `Preencha: ${errors.join(", ")}`,
      });
      return false;
    }
    toast({ title: "Validação concluída", description: "Tudo certo para finalizar." });
    return true;
  };

  const handleFinish = () => {
    if (!validateForm()) return;
    // TODO: integrar submissão/geração ao backend/PDF
    toast({ title: "Formulário finalizado", description: "Você pode prosseguir com o envio/geração." });
  };

  return (
    <div className="container mx-auto max-w-screen-lg px-2 sm:px-3 py-3 sm:py-4">
      <Card className="mb-3 sm:mb-4">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Formulário TCO</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs sm:text-sm text-muted-foreground">Preencha as informações do Termo Circunstanciado de Ocorrência.</p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} className="space-y-4" onValueChange={(val) => setActiveTab(val)}>
        <TabsList className="flex gap-2 overflow-x-auto whitespace-nowrap sm:flex-wrap sm:overflow-visible">
          <TabsTrigger className="shrink-0" value="basico">Informações Básicas</TabsTrigger>
          <TabsTrigger className="shrink-0" value="geral">Dados da Ocorrência</TabsTrigger>
          {isDrugCase && (<TabsTrigger className="shrink-0" value="drogas">Drogas</TabsTrigger>)}
          <TabsTrigger className="shrink-0" value="pessoas">Pessoas envolvidas</TabsTrigger>
          <TabsTrigger className="shrink-0" value="guarnicao">Guarnição</TabsTrigger>
          <TabsTrigger className="shrink-0" value="historico">Histórico</TabsTrigger>
          <TabsTrigger className="shrink-0" value="arquivos">Arquivos</TabsTrigger>
        </TabsList>

        <TabsContent value="basico">
          <BasicInformationTab
            tcoNumber={tcoNumber}
            setTcoNumber={setTcoNumber}
            natureza={natureza}
            setNatureza={setNatureza}
            penaDescricao={penaDescricao}
            naturezaOptions={naturezaOptions}
            customNatureza={customNatureza}
            setCustomNatureza={setCustomNatureza}
            startTime={startTime}
            isTimerRunning={isTimerRunning}
            cr={cr}
            setCr={setCr}
            unidade={unidade}
            setUnidade={setUnidade}
          />
        </TabsContent>

        <TabsContent value="geral">
          <GeneralInformationTab
            natureza={natureza}
            tipificacao={tipificacao}
            setTipificacao={setTipificacao}
            isCustomNatureza={isCustomNatureza}
            customNatureza={customNatureza}
            dataFato={dataFato}
            setDataFato={setDataFato}
            horaFato={horaFato}
            setHoraFato={setHoraFato}
            dataInicioRegistro={dataInicioRegistro}
            setDataInicioRegistro={setDataInicioRegistro}
            horaInicioRegistro={horaInicioRegistro}
            setHoraInicioRegistro={setHoraInicioRegistro}
            dataTerminoRegistro={dataTerminoRegistro}
            setDataTerminoRegistro={setDataTerminoRegistro}
            horaTerminoRegistro={horaTerminoRegistro}
            setHoraTerminoRegistro={setHoraTerminoRegistro}
            localFato={localFato}
            setLocalFato={setLocalFato}
            endereco={endereco}
            setEndereco={setEndereco}
            municipio={municipio}
            comunicante={comunicante}
            setComunicante={setComunicante}
            guarnicao={guarnicao}
            setGuarnicao={setGuarnicao}
            operacao={operacao}
            setOperacao={setOperacao}
            condutorNome={condutorNome}
            condutorPosto={condutorPosto}
            condutorRg={condutorRg}
          />
        </TabsContent>

        {isDrugCase && (
          <TabsContent value="drogas">
            <DrugVerificationTab
              novaDroga={novaDroga}
              onNovaDrogaChange={onNovaDrogaChange}
              onAdicionarDroga={onAdicionarDroga}
              drogasAdicionadas={drogasAdicionadas}
              onRemoverDroga={onRemoverDroga}
              lacreNumero={lacreNumero}
              setLacreNumero={setLacreNumero}
              numeroRequisicao={numeroRequisicao}
              setNumeroRequisicao={setNumeroRequisicao}
            />
          </TabsContent>
        )}

        <TabsContent value="pessoas">
          <PessoasEnvolvidasTab
            vitimas={vitimas}
            handleVitimaChange={handleVitimaChange}
            handleAddVitima={handleAddVitima}
            handleRemoveVitima={handleRemoveVitima}
            testemunhas={testemunhas}
            handleTestemunhaChange={handleTestemunhaChange}
            handleAddTestemunha={handleAddTestemunha}
            handleRemoveTestemunha={handleRemoveTestemunha}
            autores={autores}
            handleAutorDetalhadoChange={handleAutorDetalhadoChange}
            handleAddAutor={handleAddAutor}
            handleRemoveAutor={handleRemoveAutor}
            natureza={natureza}
          />
        </TabsContent>

        <TabsContent value="guarnicao">
          <GuarnicaoTab
            currentGuarnicaoList={componentesGuarnicao}
            onAddPolicial={handleAddPolicial}
            onRemovePolicial={handleRemovePolicial}
            onToggleApoioPolicial={handleToggleApoio}
          />
        </TabsContent>

        <TabsContent value="historico">
          <HistoricoTab
            relatoPolicial={relatoPolicial}
            setRelatoPolicial={setRelatoPolicial}
            relatoAutor={relatoAutor}
            setRelatoAutor={setRelatoAutor}
            relatoVitima={relatoVitima}
            setRelatoVitima={setRelatoVitima}
            relatoTestemunha={relatoTestemunha}
            setRelatoTestemunha={setRelatoTestemunha}
            apreensoes={apreensoes}
            setApreensoes={setApreensoes}
            conclusaoPolicial={conclusaoPolicial}
            setConclusaoPolicial={setConclusaoPolicial}
            natureza={natureza}
            videoLinks={videoLinks}
            setVideoLinks={setVideoLinks}
            solicitarCorpoDelito={solicitarCorpoDelito}
            autorSexo={autorSexo}
            providencias={providencias}
            setProvidencias={setProvidencias}
            documentosAnexos={documentosAnexos}
            setDocumentosAnexos={setDocumentosAnexos}
            lacreNumero={lacreNumero}
            internalDrugs={drogasAdicionadas}
          />
        </TabsContent>

        <TabsContent value="arquivos">
          <ArquivosTab />
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex gap-2">
        <Button onClick={goToNextTab} disabled={isLastTab} className="ml-auto">Próximo</Button>
        {isLastTab && (
          <Button variant="default" onClick={handleFinish}>Finalizar</Button>
        )}
      </div>
    </div>
  );
};

export default TCOForm;