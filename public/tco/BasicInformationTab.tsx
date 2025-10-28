// --- START OF FILE BasicInformationTab (5).tsx ---

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TCOTimer from "./TCOTimer";
import { useToast } from "@/hooks/use-toast";
import { collection, query, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
interface BasicInformationTabProps {
  tcoNumber: string;
  setTcoNumber: (value: string) => void;
  natureza: string;
  setNatureza: (value: string) => void;
  autor: string;
  setAutor: (value: string) => void;
  penaDescricao: string;
  naturezaOptions: string[];
  customNatureza: string;
  setCustomNatureza: (value: string) => void;
  startTime: Date | null;
  isTimerRunning: boolean;
  juizadoEspecialData: string;
  setJuizadoEspecialData: (value: string) => void;
  juizadoEspecialHora: string;
  setJuizadoEspecialHora: (value: string) => void;
}

// Mapeamento de naturezas para penas MÁXIMAS (em anos)
const naturezaPenas: Record<string, number> = {
  "Porte de drogas para consumo": 0,
  "Lesão Corporal": 1.0,
  "Ameaça": 0.5,
  "Injúria": 0.5,
  "Difamação": 1.0,
  "Calúnia": 2.0,
  "Perturbação do trabalho ou do sossego alheios": 0.25,
  "Vias de Fato": 0.25,
  "Contravenção penal": 0.25,
  "Dano": 0.5,
  "Perturbação do Sossego": 0.25,
  "Conduzir veículo sem CNH gerando perigo de dano": 1.0,
  "Entregar veículo automotor a pessoa não habilitada": 1.0,
  "Trafegar em velocidade incompatível com segurança": 1.0,
  "Omissão de socorro": 0.5,
  "Rixa": 0.17,
  "Invasão de domicílio": 0.25,
  "Fraude em comércio": 2.0,
  "Ato obsceno": 1.0,
  "Falsa identidade": 1.0,
  "Resistência": 2.0,
  "Desobediência": 0.5,
  "Desacato": 2.0,
  "Exercício arbitrário das próprias razões": 0.08
};
const naturezaTipificacoes: Record<string, string> = {
  "Ameaça": "ART. 147 DO CÓDIGO PENAL",
  "Vias de Fato": "ART. 21 DA LEI DE CONTRAVENÇÕES PENAIS",
  "Lesão Corporal": "ART. 129 DO CÓDIGO PENAL",
  "Dano": "ART. 163 DO CÓDIGO PENAL",
  "Injúria": "ART. 140 DO CÓDIGO PENAL",
  "Difamação": "ART. 139 DO CÓDIGO PENAL",
  "Calúnia": "ART. 138 DO CÓDIGO PENAL",
  "Perturbação do Sossego": "ART. 42 DA LEI DE CONTRAVENÇÕES PENAIS",
  "Porte de drogas para consumo": "ART. 28 DA LEI Nº 11.343/2006 (LEI DE DROGAS)",
  "Conduzir veículo sem CNH gerando perigo de dano": "ART. 309 DO CÓDIGO DE TRÂNSITO BRASILEIRO",
  "Entregar veículo automotor a pessoa não habilitada": "ART. 310 DO CÓDIGO DE TRÂNSITO BRASILEIRO",
  "Trafegar em velocidade incompatível com segurança": "ART. 311 DO CÓDIGO DE TRÂNSITO BRASILEIRO",
  "Omissão de socorro": "ART. 135 DO CÓDIGO PENAL",
  "Rixa": "ART. 137 DO CÓDIGO PENAL",
  "Invasão de domicílio": "ART. 150 DO CÓDIGO PENAL",
  "Fraude em comércio": "ART. 176 DO CÓDIGO PENAL",
  "Ato obsceno": "ART. 233 DO CÓDIGO PENAL",
  "Falsa identidade": "ART. 307 DO CÓDIGO PENAL",
  "Resistência": "ART. 329 DO CÓDIGO PENAL",
  "Desobediência": "ART. 330 DO CÓDIGO PENAL",
  "Desacato": "ART. 331 DO CÓDIGO PENAL",
  "Exercício arbitrário das próprias razões": "ART. 345 DO CÓDIGO PENAL"
};
const formatarPena = (anosDecimais: number): string => {
  if (anosDecimais < 0) return "Pena indeterminada";
  if (anosDecimais === 0) return "0 meses"; // Trata explicitamente pena 0

  const anosInteiros = Math.floor(anosDecimais);
  const mesesDecimais = (anosDecimais - anosInteiros) * 12;

  // Arredondar para o inteiro mais próximo para meses, com precisão para evitar problemas com ponto flutuante
  const mesesResiduais = Math.round(parseFloat(mesesDecimais.toPrecision(5)));
  const partes = [];
  if (anosInteiros > 0) {
    partes.push(`${anosInteiros} ano${anosInteiros > 1 ? 's' : ''}`);
  }
  if (mesesResiduais > 0) {
    partes.push(`${mesesResiduais} ${mesesResiduais > 1 ? 'meses' : 'mês'}`);
  }
  if (partes.length === 0) {
    // Para casos como 0.01 anos, que seriam arredondados para 0 meses.
    // Se a pena original era > 0, podemos dizer "menos de 1 mês" ou considerar 1 mês como piso se fizer sentido prático.
    // Com as penas definidas, a menor (0.08) resulta em "1 mês".
    if (anosDecimais > 0 && mesesResiduais === 0) return "1 mês (aproximadamente)";
    return "0 meses"; // Default para caso não caia em nenhuma condição, mas deve ser pego pelo anosDecimais === 0
  }
  return partes.join(' e ');
};
const BasicInformationTab: React.FC<BasicInformationTabProps> = ({
  tcoNumber,
  setTcoNumber,
  natureza,
  setNatureza,
  penaDescricao,
  naturezaOptions,
  customNatureza,
  setCustomNatureza,
  startTime,
  isTimerRunning,
  juizadoEspecialData,
  setJuizadoEspecialData,
  juizadoEspecialHora,
  setJuizadoEspecialHora
}) => {
  const {
    toast
  } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [selectedNaturezas, setSelectedNaturezas] = useState<string[]>([]);
  const [selectedCustomNatureza, setSelectedCustomNatureza] = useState<string>("");
  const [totalPenaAnos, setTotalPenaAnos] = useState<number>(0);
  const [showPenaAlert, setShowPenaAlert] = useState<boolean>(false);
  const [tipificacaoCompleta, setTipificacaoCompleta] = useState<string>("");
  useEffect(() => {
    if (natureza) {
      const naturezasIniciais = natureza.includes(" + ") ? natureza.split(" + ") : [natureza].filter(Boolean);
      const novasNaturezasParaAdicionar = naturezasIniciais.filter(nat => !selectedNaturezas.includes(nat));
      if (novasNaturezasParaAdicionar.length > 0) {
        setSelectedNaturezas(prev => [...new Set([...prev, ...novasNaturezasParaAdicionar])]); // Usar Set para garantir unicidade
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natureza]);
  useEffect(() => {
    let totalCalculado = 0;
    const tipificacoes: string[] = [];
    selectedNaturezas.forEach(nat => {
      if (nat === "Outros") {
        totalCalculado += 2.0;
        tipificacoes.push(customNatureza ? `[${customNatureza.toUpperCase()}] - TIPIFICAÇÃO A SER INSERIDA MANUALMENTE` : "[TIPIFICAÇÃO LEGAL A SER INSERIDA]");
      } else {
        // CORREÇÃO APLICADA AQUI:
        const penaDaNatureza = naturezaPenas[nat];
        // Usar ?? para tratar `undefined` (natureza não mapeada), mas permitir pena 0.
        totalCalculado += typeof penaDaNatureza === 'number' ? penaDaNatureza : 2.0;
        tipificacoes.push(naturezaTipificacoes[nat] || `[${nat.toUpperCase()}] - TIPIFICAÇÃO NÃO MAPEADA`);
      }
    });
    setTotalPenaAnos(totalCalculado);
    const penaExcedeLimite = totalCalculado > 2;
    setShowPenaAlert(penaExcedeLimite);
    let tipificacaoFormatada = "";
    if (tipificacoes.length === 1) {
      tipificacaoFormatada = tipificacoes[0];
    } else if (tipificacoes.length === 2) {
      tipificacaoFormatada = tipificacoes.join(" E ");
    } else if (tipificacoes.length > 2) {
      const ultimoItem = tipificacoes.pop() as string;
      tipificacaoFormatada = tipificacoes.join(", ") + " E " + ultimoItem;
    }
    setTipificacaoCompleta(tipificacaoFormatada);
    if (penaExcedeLimite && selectedNaturezas.length > 0) {
      // Adicionado selectedNaturezas.length > 0 para evitar toast inicial
      toast({
        variant: "destructive",
        title: "Atenção: Pena Máxima Superior a 2 Anos",
        description: `A soma das penas (${formatarPena(totalCalculado)}) excede o limite de 2 anos para TCO. Revise as naturezas ou proceda com o registro adequado (não TCO).`
      });
    }
    // A dependência de 'toast' geralmente não é necessária se vindo de um hook que o estabiliza.
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [selectedNaturezas, customNatureza]); // Removido toast da lista de dependências

  const checkDuplicateTco = useCallback(async (tcoNum: string) => {
    if (!tcoNum || tcoNum.length < 3) return;
    setIsChecking(true);
    try {
      const tcosRef = collection(db, "tcos");
      const q = query(tcosRef, where("tcoNumber", "==", tcoNum));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const existingTco = querySnapshot.docs[0].data();
        let createdAtDate = new Date();
        if (existingTco.createdAt?.toDate) {
          createdAtDate = existingTco.createdAt.toDate();
        } else if (typeof existingTco.createdAt === 'string' || typeof existingTco.createdAt === 'number') {
          createdAtDate = new Date(existingTco.createdAt);
        }
        const formattedDate = isNaN(createdAtDate.getTime()) ? "Data indisponível" : createdAtDate.toLocaleDateString('pt-BR');
        toast({
          variant: "destructive",
          title: "TCO Duplicado",
          description: `Já existe um TCO com a numeração ${tcoNum}. Registrado em ${formattedDate}, Natureza(s): ${existingTco.natureza || 'Não informada'}.`
        });
      }
    } catch (error) {
      console.error("Erro ao verificar TCO duplicado:", error);
      toast({
        variant: "destructive",
        title: "Erro na Verificação",
        description: "Não foi possível verificar a duplicidade do TCO no momento."
      });
    } finally {
      setIsChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // toast é estável, db é estável.

  const handleTcoNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = value.replace(/[^0-9]/g, '');
    setTcoNumber(numericValue);
  };
  useEffect(() => {
    if (tcoNumber && tcoNumber.length >= 3) {
      const handler = setTimeout(() => {
        checkDuplicateTco(tcoNumber);
      }, 1000);
      return () => {
        clearTimeout(handler);
      };
    }
  }, [tcoNumber, checkDuplicateTco]);
  const handleAddNatureza = (selectedNatureza: string) => {
    if (selectedNatureza && !selectedNaturezas.includes(selectedNatureza)) {
      const newNaturezas = [...selectedNaturezas, selectedNatureza];
      setSelectedNaturezas(newNaturezas);
      setNatureza(newNaturezas.join(" + "));
    }
  };
  const handleRemoveNatureza = (naturezaToRemove: string) => {
    const newNaturezas = selectedNaturezas.filter(nat => nat !== naturezaToRemove);
    setSelectedNaturezas(newNaturezas);
    if (naturezaToRemove === "Outros") {
      setSelectedCustomNatureza("");
      setCustomNatureza("");
    }
    setNatureza(newNaturezas.join(" + "));
  };
  const handleCustomNaturezaChange = (value: string) => {
    setSelectedCustomNatureza(value);
    setCustomNatureza(value);
  };
  return <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>TCO</CardTitle>
            <CardDescription>
              Preencha os dados básicos do TCO
            </CardDescription>
          </div>
          <TCOTimer startTime={startTime} isRunning={isTimerRunning} />
        </div>
      </CardHeader>
      <CardContent className="px-[5px]"> 
        <div className="space-y-4">
          
          <div>
            <Label htmlFor="tcoNumber">Número do TCO *</Label>
            <div className="relative">
              <Input id="tcoNumber" placeholder="Informe o número do TCO (apenas números)" value={tcoNumber} onChange={handleTcoNumberChange} className={isChecking ? "border-yellow-300" : ""} />
              {isChecking && <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                </div>}
            </div>
          </div>
          
          {showPenaAlert && <Alert variant="destructive" className="border-red-600 bg-red-50 dark:bg-red-950">
              <AlertTriangle className="h-4 w-4 text-red-700 dark:text-red-400" />
              <AlertTitle className="text-red-800 dark:text-red-300">Atenção: Pena Máxima Superior a 2 Anos</AlertTitle>
              <AlertDescription className="text-red-700 dark:text-red-400">
                A soma das penas máximas ({formatarPena(totalPenaAnos)}) excede o limite de 2 anos. 
                Não é permitido registrar TCO nesta situação. Verifique a existência de subsunção (se um crime absorve o outro), se mesmo assim ultrapassar 2 anos proceda com o registro do B.O.
              </AlertDescription>
            </Alert>}

          {selectedNaturezas.length > 0 && <div>
              <Label>Naturezas Selecionadas</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedNaturezas.map((nat, index) => <Badge key={`${nat}-${index}`} variant="secondary" className="flex items-center gap-1"> {/* Key melhorada */}
                    {nat === "Outros" ? selectedCustomNatureza || "Outros (não especificado)" : nat}
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent text-muted-foreground hover:text-destructive" onClick={() => handleRemoveNatureza(nat)} aria-label={`Remover ${nat}`}>
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>)}
              </div>
              {selectedNaturezas.length > 1 && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Soma das Penas: {formatarPena(totalPenaAnos)}
                </p>}
            </div>}
          
          <div>
            <Label htmlFor="naturezaAdd">Adicionar Natureza *</Label>
            <Select onValueChange={handleAddNatureza} value=""> 
              <SelectTrigger id="naturezaAdd">
                <SelectValue placeholder="Selecione uma natureza para adicionar" />
              </SelectTrigger>
              <SelectContent>
                {naturezaOptions.filter(option => !selectedNaturezas.includes(option)).map(option => <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedNaturezas.includes("Outros") && <div>
              <Label htmlFor="customNatureza">Especifique a Natureza Personalizada *</Label>
              <Input id="customNatureza" placeholder="Digite a natureza específica" value={selectedCustomNatureza} onChange={e => handleCustomNaturezaChange(e.target.value)} />
            </div>}

          {tipificacaoCompleta && <div>
              <Label>Tipificação Legal Consolidada</Label>
              <Input readOnly value={tipificacaoCompleta} className="bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
            </div>}

          {penaDescricao && selectedNaturezas.length === 1 && !selectedNaturezas.includes("Outros") && <div>
              <Label>Pena da Natureza Selecionada</Label>
              <Input readOnly value={penaDescricao} className="bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
            </div>}

          <div className="space-y-2">
            <Label>TERMO DE COMPROMISSO - Apresentação em Juizado Especial VG</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <div className="space-y-1">
                <Label htmlFor="juizadoData">Data</Label>
                <Input id="juizadoData" type="date" value={juizadoEspecialData} onChange={e => setJuizadoEspecialData(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="juizadoHora">Hora</Label>
                <Input id="juizadoHora" type="time" value={juizadoEspecialHora} onChange={e => setJuizadoEspecialHora(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
      </CardFooter>
    </Card>;
};
export default BasicInformationTab;

// --- END OF FILE BasicInformationTab (5).tsx ---