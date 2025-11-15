// --- START OF FILE BasicInformationTab (5).tsx ---

import React, { useEffect, useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// Timer removido conforme solicitado
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
// Removido Firebase para evitar erro de módulo ausente
// Firebase removido nesta integração (sem Firestore)

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
  // Novos campos
  cr: string;
  setCr: (value: string) => void;
  unidade: string;
  setUnidade: (value: string) => void;
  // Novo campo: Local do Registro
  localRegistro: string;
  setLocalRegistro: (value: string) => void;
  onTipificacaoChange?: (value: string) => void;
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
  "Exercício arbitrário das próprias razões": 0.08,
  "Periclitação da vida": 1.0
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
  "Exercício arbitrário das próprias razões": "ART. 345 DO CÓDIGO PENAL",
  "Periclitação da vida": "ART. 132 DO CÓDIGO PENAL"
};

// CR fixo e dataset de Unidades do CR2
const FIXED_CR = "2º Comando Regional";
const CR2_UNIDADES: { nome: string; cidade: string; endereco: string; email: string; telefone: string }[] = [
  { nome: "2º Comando Regional - Sede", cidade: "", endereco: "", email: "", telefone: "" },
  { nome: "4º Batalhão de Polícia Militar", cidade: "Várzea Grande", endereco: "Av. Filinto Muller, nº 538, Centro, CEP 78.110-100", email: "4bpm@pm.mt.gov.br", telefone: "(65) 3901-8295 / (65) 9996-9600" },
  { nome: "15ª Cia Independente de Polícia Militar - Força Tática", cidade: "Várzea Grande", endereco: "Rua das Camomilas, s/nº, Residencial Flor dos Ipês, CEP 78.117-360", email: "forcataticacr2@pm.mt.gov.br", telefone: "(65) 3691-1111" },
  { nome: "2ª Companhia de Polícia Militar do Bairro Jardim Imperial", cidade: "Várzea Grande", endereco: "Rua Bolívia, s/nº, Bairro Jardim Imperial, CEP 78.110-220", email: "2ciaimperial@gmail.com", telefone: "(65) 3901-8293 / (65) 9 9989-8413" },
  { nome: "25ª Companhia Independente de Polícia Militar", cidade: "Várzea Grande", endereco: "", email: "", telefone: "" },
  { nome: "25º Batalhão de Polícia Militar do Bairro Cristo Rei", cidade: "Várzea Grande", endereco: "Rua Senador Vicente Vuollo, s/nº, Praça Áurea Braz, CEP 78118-007", email: "25batalhao@pm.mt.gov.br", telefone: "(65) 3901-9156 / 3901-8291" },
  { nome: "7º Batalhão de Polícia Militar - Rosário Oeste", cidade: "Rosário Oeste", endereco: "Rod. BR 163/364, Km 542, Bairro Santo Antonio", email: "7bpm@pm.mt.gov.br", telefone: "(65) 3356-1190 / (65) 9 8170-0289" },
  { nome: "Núcleo de Polícia Militar - Bauxi", cidade: "Distrito de Bauxi", endereco: "MT 246 KM 135", email: "", telefone: "(65) 99670-7722" },
  { nome: "1ª Companhia de Polícia Militar - Nobres", cidade: "Nobres", endereco: "Rua Paraná, Bairro Ponte de Ferro", email: "1cianobres@pm.mt.gov.br", telefone: "(65) 3376-1190 / (65) 9 9919-9724" },
  { nome: "Núcleo de Polícia Militar - Bom Jardim", cidade: "Distrito Bom Jardim", endereco: "Rodovia MT 244, s/nº, Bairro: Centro, CEP 78.460-000", email: "npmbomjardim@pm.mt.gov.br", telefone: "(65) 9 9992-0617" },
  { nome: "2ª Companhia Independente de Jangada", cidade: "Jangada", endereco: "Rua Laurindo Machado, s/nº, Bairro: Centro, CEP 78.490-000", email: "npmjangada@pm.mt.gov.br", telefone: "(65) 9 8170-0302" },
  { nome: "Núcleo de Polícia Militar - Acorizal", cidade: "Acorizal", endereco: "Av. Lavradores, s/nº, Bairro: Centro", email: "npmacorizal@pm.mt.gov.br", telefone: "(65) 9 8170-0304" },
  { nome: "6ª Companhia Independente de Polícia Militar - Poconé", cidade: "Poconé", endereco: "Av. dos Trabalhadores, s/nº, Bairro: Jardim dos Estados, CEP 78.175-000", email: "6cipm@pm.mt.gov.br", telefone: "(65) 3345-1190 / (65) 9 9913-2126 / (65) 9 8170-0294" },
  { nome: "Núcleo de Polícia Militar - Nossa Senhora do Livramento", cidade: "Nossa Senhora do Livramento", endereco: "Av. Coronel Botelho, Bairro: Centro, CEP 78.170-000", email: "npmlivramento@pm.mt.gov.br", telefone: "(65) 3351-1298" },
];

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
  cr,
  setCr,
  unidade,
  setUnidade,
  localRegistro,
  setLocalRegistro,
  onTipificacaoChange,
}) => {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [selectedNaturezas, setSelectedNaturezas] = useState<string[]>([]);
  const [selectedCustomNatureza, setSelectedCustomNatureza] = useState<string>("");
  const [totalPenaAnos, setTotalPenaAnos] = useState<number>(0);
  const [showPenaAlert, setShowPenaAlert] = useState<boolean>(false);
  const [tipificacaoCompleta, setTipificacaoCompleta] = useState<string>("");
  const [isAddNaturezaOpen, setIsAddNaturezaOpen] = useState<boolean>(false);
  const [formNome, setFormNome] = useState<string>("");
  const [formTipificacao, setFormTipificacao] = useState<string>("");
  const [formPenaAnos, setFormPenaAnos] = useState<string>("");
  const [customNaturezas, setCustomNaturezas] = useState<{ nome: string; tipificacao: string; penaAnos: number }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tco_custom_naturezas');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomNaturezas(parsed);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('tco_custom_naturezas', JSON.stringify(customNaturezas));
    } catch {}
  }, [customNaturezas]);

  // Opções de CR e Unidade
  const [crOptions, setCrOptions] = useState<string[]>([FIXED_CR]);
  const [unidadeOptions, setUnidadeOptions] = useState<string[]>(CR2_UNIDADES.map(u => u.nome));

  // Carregar/seed de Unidades no Supabase e fixar CR
  useEffect(() => {
    const seedUnidades = async () => {
      try {
        await supabase.from("cr2_unidades").upsert(CR2_UNIDADES, { onConflict: "nome" });
      } catch (e) {
        // tabela pode não existir ainda; sem bloquear UI
      }
    };
    if (!cr) setCr(FIXED_CR);
    setCrOptions([FIXED_CR]);
    setUnidadeOptions(CR2_UNIDADES.map(u => u.nome));
    seedUnidades();
  }, []);

  // Registro de CR removido conforme solicitação; CR é fixo.



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
      const custom = customNaturezas.find(c => c.nome === nat);
      if (custom) {
        totalCalculado += custom.penaAnos;
        tipificacoes.push(custom.tipificacao || `[${nat.toUpperCase()}] - TIPIFICAÇÃO NÃO INFORMADA`);
      } else {
        const penaDaNatureza = naturezaPenas[nat];
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
    if (typeof onTipificacaoChange === 'function') {
      onTipificacaoChange(tipificacaoFormatada);
    }
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
  }, [selectedNaturezas, customNatureza, customNaturezas]); // Removido toast da lista de dependências

  const checkDuplicateTco = useCallback(async (tcoNum: string) => {
    // Verificação de duplicidade desativada nesta integração (sem Firebase)
    if (!tcoNum || tcoNum.length < 3) return;
    setIsChecking(true);
    try {
      // No-op
    } finally {
      setIsChecking(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleTcoNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = value.replace(/[^0-9]/g, '');
    setTcoNumber(numericValue);
  };
  useEffect(() => {
    if (tcoNumber && tcoNumber.length >= 3) {
      checkDuplicateTco(tcoNumber);
    }
  }, [tcoNumber, checkDuplicateTco]);

  const handleCustomNaturezaChange = (value: string) => {
    setSelectedCustomNatureza(value);
    setCustomNatureza(value);
  };

  const handleNaturezaSelectChange = (value: string) => {
    if (!value) return;
    if (!selectedNaturezas.includes(value)) {
      const newNaturezas = [...selectedNaturezas, value];
      setSelectedNaturezas(newNaturezas);
      setNatureza(newNaturezas.join(" + "));
    }
  };

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
    if (customNaturezas.some(c => c.nome === naturezaToRemove)) {
      setCustomNaturezas(prev => prev.filter(c => c.nome !== naturezaToRemove));
    }
    setNatureza(newNaturezas.join(" + "));
  };

  const handleConfirmAddCustomNatureza = () => {
    const nome = formNome.trim();
    const pena = parseFloat(formPenaAnos.replace(',', '.'));
    const tip = formTipificacao.trim();
    if (!nome) {
      toast({ variant: "destructive", title: "Informe a Natureza", description: "Preencha o nome da natureza." });
      return;
    }
    if (!isFinite(pena) || pena < 0) {
      toast({ variant: "destructive", title: "Pena inválida", description: "Informe a pena máxima em anos (ex.: 0.5 para 6 meses)." });
      return;
    }
    const novo = { nome, tipificacao: tip, penaAnos: pena };
    setCustomNaturezas(prev => {
      const semDup = prev.filter(c => c.nome !== nome);
      return [...semDup, novo];
    });
    if (!selectedNaturezas.includes(nome)) {
      const newNaturezas = [...selectedNaturezas, nome];
      setSelectedNaturezas(newNaturezas);
      setNatureza(newNaturezas.join(" + "));
    }
    setIsAddNaturezaOpen(false);
    setFormNome("");
    setFormTipificacao("");
    setFormPenaAnos("");
  };

  const naturezasComPena = selectedNaturezas.map(nat => {
    const custom = customNaturezas.find(c => c.nome === nat);
    const pena = custom ? custom.penaAnos : naturezaPenas[nat];
    const anos = typeof pena === 'number' ? pena : 2.0;
    return { nat, penaAnos: anos };
  });

  return (
    <div className="form-grid">
      <div className="two-columns">
        <div className="form-group">
          <label>CR <span className="required">*</span></label>
          <select value={cr} onChange={(e) => setCr(e.target.value)}>
            <option>{FIXED_CR}</option>
          </select>
        </div>
        <div className="form-group">
          <label>Unidade <span className="required">*</span></label>
          <select value={unidade} onChange={(e) => setUnidade(e.target.value)}>
            {unidadeOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Local do Registro <span className="required">*</span></label>
        <input type="text" value={localRegistro} onChange={(e) => setLocalRegistro(e.target.value)} placeholder="Digite o local do registro" />
      </div>

      <div className="three-columns">
        <div className="form-group">
          <label>Número do TCO <span className="required">*</span></label>
          <input type="number" value={tcoNumber} onChange={handleTcoNumberChange} placeholder="Número do TCO" />
        </div>
        <div className="form-group">
          <label>Natureza <span className="required">*</span></label>
          <select onChange={(e) => handleNaturezaSelectChange(e.target.value)}>
            <option value="">Selecione a natureza</option>
            {naturezaOptions.filter(option => !selectedNaturezas.includes(option)).map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <button className="add-button" onClick={() => setIsAddNaturezaOpen(true)}>
            <i className="fas fa-plus"></i> Adicionar natureza personalizada
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Naturezas Selecionadas</label>
        <div className="tag-container">
          {selectedNaturezas.map((nat, index) => (
            <div key={`${nat}-${index}`} className="tag">
              {(nat || '').toUpperCase()} <span className="tag-close" onClick={() => handleRemoveNatureza(nat)}>×</span>
            </div>
          ))}
        </div>
      </div>

      <div className="penalty-card">
        <div className="penalty-header">
          <i className="fas fa-balance-scale"></i>
          <h3>Tipificação e Análise de Penas</h3>
        </div>
        <div className="penalty-list">
          {naturezasComPena.map(({ nat, penaAnos }) => {
            const custom = customNaturezas.find(c => c.nome === nat);
            const legal = custom ? custom.tipificacao : naturezaTipificacoes[nat];
            return (
              <div key={`pen-${nat}`} className="penalty-item">
                <div className="penalty-top">
                  <div className="penalty-name">{(nat || '').toUpperCase()}</div>
                  <div className="penalty-value">{formatarPena(penaAnos)}</div>
                </div>
                {legal && <div className="penalty-legal">{legal}</div>}
              </div>
            );
          })}
        </div>
        <div className="penalty-total">
          <span>Soma das Penas Máximas:</span>
          <strong>{formatarPena(totalPenaAnos)}</strong>
        </div>
      </div>

      {showPenaAlert && (
        <div className="alert-box">
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <strong>Atenção: Pena Máxima Superior a 2 Anos</strong>
            <p>A soma das penas máximas ({formatarPena(totalPenaAnos)}) excede o limite de 2 anos. Não é permitido registrar TCO nesta situação. Verifique a existência de subsunção (se um crime absorve o outro) ou proceda com o registro adequado (B.O.).</p>
          </div>
        </div>
      )}

      <Dialog open={isAddNaturezaOpen} onOpenChange={setIsAddNaturezaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Natureza Personalizada</DialogTitle>
            <DialogDescription>Informe natureza, tipificação e pena máxima em anos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="nomeNatureza">Natureza</Label>
              <Input id="nomeNatureza" value={formNome} onChange={e => setFormNome(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tipificacaoNatureza">Tipificação</Label>
              <Input id="tipificacaoNatureza" value={formTipificacao} onChange={e => setFormTipificacao(e.target.value)} placeholder="ART. ..." />
            </div>
            <div>
              <Label htmlFor="penaNatureza">Pena Máxima (anos)</Label>
              <Input id="penaNatureza" inputMode="decimal" value={formPenaAnos} onChange={e => setFormPenaAnos(e.target.value)} placeholder="Ex.: 0.5" />
              <p className="text-xs text-muted-foreground mt-1">Equivale a {formatarPena(Number((formPenaAnos || '0').replace(',', '.')))}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddNaturezaOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmAddCustomNatureza}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default BasicInformationTab;

 // --- END OF FILE BasicInformationTab (5).tsx ---