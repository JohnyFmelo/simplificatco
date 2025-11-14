import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Users, UserPlus, Info, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";

// --- Funções Auxiliares ---
const somenteNumeros = (value: string | null | undefined): string => {
  return value?.replace(/\D/g, '') || '';
};
const formatarCPF = (value: string): string => {
  const numeros = somenteNumeros(value);
  let cpfFormatado = numeros.slice(0, 11);
  cpfFormatado = cpfFormatado.replace(/^(\d{3})(\d)/, '$1.$2');
  cpfFormatado = cpfFormatado.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
  cpfFormatado = cpfFormatado.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  return cpfFormatado;
};
const formatarCelular = (value: string): string => {
  const numeros = somenteNumeros(value);
  let foneFormatado = numeros.slice(0, 11);
  if (foneFormatado.length === 11) {
    foneFormatado = foneFormatado.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (foneFormatado.length === 10) {
    foneFormatado = foneFormatado.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (foneFormatado.length > 6) {
    foneFormatado = foneFormatado.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (foneFormatado.length > 2) {
    foneFormatado = foneFormatado.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  }
  return foneFormatado;
};
const validateCPF = (cpf: string) => {
  cpf = somenteNumeros(cpf);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cpf.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  return digit2 === parseInt(cpf.charAt(10));
};

// --- Interfaces ---
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
interface PoliceOfficerSearchResult {
  nome: string | null;
  graduacao: string | null;
  pai: string | null;
  mae: string | null;
  naturalidade: string | null;
  cpf: string | null;
  telefone: string | null;
}
interface PoliceOfficerFormData {
  rgpm: string;
  nome: string;
  graduacao: string;
  pai: string;
  mae: string;
  naturalidade: string;
  cpf: string;
  telefone: string;
}
const initialOfficerFormData: PoliceOfficerFormData = {
  rgpm: "",
  nome: "",
  graduacao: "",
  pai: "",
  mae: "",
  naturalidade: "",
  cpf: "",
  telefone: ""
};
const graduacoes = ["SD PM", "CB PM", "3º SGT PM", "2º SGT PM", "1º SGT PM", "SUB TEN PM", "ASPIRANTE PM", "2º TEN PM", "1º TEN PM", "CAP PM", "MAJ PM", "TEN CEL PM", "CEL PM"];
interface GuarnicaoTabProps {
  currentGuarnicaoList: ComponenteGuarnicao[];
  onAddPolicial: (policial: ComponenteGuarnicao) => void;
  onRemovePolicial: (index: number) => void;
  onToggleApoioPolicial: (index: number) => void;
}

// --- Componente GuarnicaoTab ---
const GuarnicaoTab: React.FC<GuarnicaoTabProps> = ({
  currentGuarnicaoList,
  onAddPolicial,
  onRemovePolicial,
  onToggleApoioPolicial
}) => {
  const { toast } = useToast();
  const [searchRgpm, setSearchRgpm] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState<boolean>(false);
  const [newOfficerFormData, setNewOfficerFormData] = useState<PoliceOfficerFormData>(initialOfficerFormData);
  const [isFetchingDialogDetails, setIsFetchingDialogDetails] = useState<boolean>(false);

  useEffect(() => {
    console.log("[GuarnicaoTab] Prop 'currentGuarnicaoList' recebida:", currentGuarnicaoList);
  }, [currentGuarnicaoList]);

  const handleSearchRgpmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    const numeros = somenteNumeros(rawValue).slice(0, 6);
    setSearchRgpm(numeros);
  };

  const handleSearchAndAdd = useCallback(async () => {
    const rgpmToSearch = searchRgpm;
    console.log("[GuarnicaoTab] Iniciando busca por RGPM:", rgpmToSearch);
    if (rgpmToSearch.length !== 6) {
      toast({
        variant: "destructive",
        title: "RGPM Inválido",
        description: "O RGPM da busca deve conter exatamente 6 dígitos."
      });
      return;
    }
    const alreadyExists = currentGuarnicaoList.some(comp => comp.rg === rgpmToSearch);
    if (alreadyExists) {
      console.log("[GuarnicaoTab] RGPM já existe na lista (prop):", rgpmToSearch);
      toast({
        variant: "default",
        title: "Duplicado",
        description: "Este policial já está na guarnição."
      });
      setSearchRgpm("");
      return;
    }
    setIsSearching(true);
    console.log("[GuarnicaoTab] Buscando no Supabase...");
    try {
      const { data, error } = await supabase
        .from("police_officers")
        .select("nome_completo, graduacao, nome_pai, nome_mae, naturalidade, cpf, telefone")
        .eq("rgpm", rgpmToSearch)
        .single();
      console.log("[GuarnicaoTab] Resposta Supabase:", { data, error });
      console.log("[GuarnicaoTab] Telefone retornado do Supabase:", data?.telefone);

      if (error && error.code === 'PGRST116') {
        toast({
          variant: "default",
          title: "Não Encontrado",
          description: `Nenhum policial encontrado com o RGPM ${rgpmToSearch}. Considere cadastrá-lo.`
        });
      } else if (error) {
        throw error;
      } else if (data) {
        const officerData = data as any;
        const newComponente: ComponenteGuarnicao = {
          rg: rgpmToSearch,
          nome: officerData.nome_completo?.toUpperCase() || "NOME NÃO INFORMADO",
          posto: officerData.graduacao || "POSTO NÃO INFORMADO",
          pai: officerData.nome_pai?.toUpperCase() || "NÃO INFORMADO",
          mae: officerData.nome_mae?.toUpperCase() || "NÃO INFORMADO",
          naturalidade: officerData.naturalidade?.toUpperCase() || "NÃO INFORMADO",
          cpf: officerData.cpf ? formatarCPF(officerData.cpf) : "NÃO INFORMADO",
          telefone: officerData.telefone ? formatarCelular(officerData.telefone) : "NÃO INFORMADO",
          apoio: false,
        };
        console.log("[GuarnicaoTab] Componente criado com telefone:", newComponente.telefone);
        console.log("[GuarnicaoTab] Policial encontrado. Chamando onAddPolicial:", newComponente);
        onAddPolicial(newComponente);
        setSearchRgpm("");
      }
    } catch (error: any) {
      console.error("[GuarnicaoTab] Erro na busca:", error);
      toast({
        variant: "destructive",
        title: "Erro na Busca",
        description: `Falha ao buscar dados: ${error.message || 'Erro desconhecido'}`
      });
    } finally {
      setIsSearching(false);
      console.log("[GuarnicaoTab] Busca finalizada.");
    }
  }, [searchRgpm, currentGuarnicaoList, toast, onAddPolicial]);

  const handleRemove = (index: number) => {
    const itemToRemove = currentGuarnicaoList[index];
    console.log("[GuarnicaoTab] Chamando onRemovePolicial para índice:", index, itemToRemove);
    onRemovePolicial(index);
    toast({
      title: "Removido",
      description: `Componente ${itemToRemove?.nome || ''} removido da guarnição.`
    });
  };

  const handleToggleApoio = (index: number) => {
    onToggleApoioPolicial(index);
  };

  const openRegisterDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNewOfficerFormData(initialOfficerFormData); // Reseta o formulário ao abrir
    setIsRegisterDialogOpen(true);
  };

  const closeRegisterDialog = () => {
    setIsRegisterDialogOpen(false);
    setNewOfficerFormData(initialOfficerFormData);
    setIsFetchingDialogDetails(false); // Garante que o estado de busca do diálogo seja resetado
  };

  const handleRegisterInputChange = (field: keyof PoliceOfficerFormData, value: string) => {
    let processedValue = value;
    if (field === 'cpf') {
      processedValue = formatarCPF(value);
    } else if (field === 'telefone') {
      processedValue = formatarCelular(value);
    } else if (field === 'rgpm') {
      processedValue = somenteNumeros(value).slice(0, 6);
    } else if (['nome', 'pai', 'mae', 'naturalidade'].includes(field)) {
      processedValue = value.toUpperCase();
    }
    setNewOfficerFormData(prev => ({ ...prev, [field]: processedValue }));
  };

  // --- NOVA FUNÇÃO ---
  const fetchOfficerDetailsForDialog = async (rgpmToSearch: string) => {
    setIsFetchingDialogDetails(true);
    console.log("[GuarnicaoTab Dialog] Buscando detalhes para RGPM:", rgpmToSearch);
    try {
      const { data, error } = await supabase
        .from("police_officers")
        .select("nome_completo, graduacao, nome_pai, nome_mae, naturalidade, cpf, telefone")
        .eq("rgpm", rgpmToSearch)
        .single();

      if (error && error.code === 'PGRST116') {
        toast({
          variant: "default",
          title: "RGPM Não Cadastrado",
          description: "Este RGPM não foi encontrado. Prossiga com o novo cadastro.",
        });
        // Mantém o RGPM digitado, limpa o resto se havia algo
        setNewOfficerFormData(prev => ({
          ...initialOfficerFormData,
          rgpm: prev.rgpm,
        }));
      } else if (error) {
        throw error;
      } else if (data) {
        const officerData = data as any;
        setNewOfficerFormData({
          rgpm: rgpmToSearch,
          nome: officerData.nome_completo?.toUpperCase() || "",
          graduacao: officerData.graduacao || "",
          pai: officerData.nome_pai?.toUpperCase() || "",
          mae: officerData.nome_mae?.toUpperCase() || "",
          naturalidade: officerData.naturalidade?.toUpperCase() || "",
          cpf: officerData.cpf ? formatarCPF(officerData.cpf) : "",
          telefone: officerData.telefone ? formatarCelular(officerData.telefone) : "",
        });
        toast({
          title: "Dados Carregados",
          description: "Informações do policial preenchidas para atualização.",
        });
      }
    } catch (error: any) {
      console.error("[GuarnicaoTab Dialog] Erro ao buscar detalhes do policial:", error);
      toast({
        variant: "destructive",
        title: "Erro na Busca de Detalhes",
        description: `Falha ao buscar dados: ${error.message || 'Erro desconhecido'}`,
      });
       // Mantém o RGPM digitado, limpa o resto em caso de erro
      setNewOfficerFormData(prev => ({
        ...initialOfficerFormData,
        rgpm: prev.rgpm,
      }));
    } finally {
      setIsFetchingDialogDetails(false);
    }
  };

  // --- NOVA FUNÇÃO ---
  const handleRgpmDialogBlur = () => {
    const rgmpValue = newOfficerFormData.rgpm; // Já está processado por handleRegisterInputChange
    if (rgmpValue.length === 6) {
      fetchOfficerDetailsForDialog(rgmpValue);
    } else {
      // Se o RGPM não tem 6 dígitos e há dados preenchidos (exceto RGPM), limpa-os
      // Isso evita que dados de uma busca anterior permaneçam se o RGPM for editado para algo inválido
      const { rgpm, ...otherFields } = newOfficerFormData;
      const hasOtherData = Object.values(otherFields).some(value => !!value);

      if (hasOtherData) {
          // Limpa outros campos, mas mantém o RGMP que o usuário está digitando
          setNewOfficerFormData(prev => ({
            rgpm: prev.rgpm, // Mantém o rgpm atual
            nome: "",
            graduacao: "",
            pai: "",
            mae: "",
            naturalidade: "",
            cpf: "",
            telefone: ""
          }));
      }
    }
  };

  const handleSaveNewOfficer = async () => {
    console.log("[GuarnicaoTab] Tentando salvar/atualizar policial:", newOfficerFormData);
    const { rgpm, nome, graduacao, pai, mae, naturalidade, cpf, telefone } = newOfficerFormData;

    

    // Fluxo padrão para Condutor: valida tudo
    const camposObrigatorios: (keyof PoliceOfficerFormData)[] = ["rgpm", "nome", "graduacao", "pai", "mae", "naturalidade", "cpf", "telefone"];
    const camposFaltando = camposObrigatorios.filter(key => !newOfficerFormData[key]?.trim());
    if (camposFaltando.length > 0) {
      toast({ variant: "destructive", title: "Campos Obrigatórios", description: `Preencha: ${camposFaltando.join(', ')}` });
      return;
    }

    const rgpmNumeros = somenteNumeros(rgpm);
    if (rgpmNumeros.length !== 6) {
      toast({ variant: "destructive", title: "RGPM Inválido", description: "O RGPM deve ter 6 dígitos." });
      return;
    }
    const cpfNumeros = somenteNumeros(cpf);
    if (cpfNumeros.length !== 11 || !validateCPF(cpf)) {
      toast({ variant: "destructive", title: "CPF Inválido", description: "Verifique o CPF." });
      return;
    }
    const telefoneNumeros = somenteNumeros(telefone);
    if (telefoneNumeros.length !== 10 && telefoneNumeros.length !== 11) {
      toast({ variant: "destructive", title: "Telefone Inválido", description: "Formato DDD + 8 ou 9 dígitos." });
      return;
    }

    try {
      const dataToSave = {
        rgpm: rgpmNumeros,
        nome_completo: nome.toUpperCase(),
        graduacao: graduacao,
        nome_pai: pai.toUpperCase(),
        nome_mae: mae.toUpperCase(),
        naturalidade: naturalidade.toUpperCase(),
        cpf: cpfNumeros,
        telefone: telefoneNumeros
      };
      console.log("[GuarnicaoTab] Dados a serem salvos/atualizados no BD:", dataToSave);

      const { error } = await supabase
        .from("police_officers")
        .upsert(dataToSave, { onConflict: "rgpm" });

      if (error) {
        throw error;
      }
      toast({ title: "Sucesso", description: "Policial cadastrado/atualizado no banco de dados." });
      closeRegisterDialog();
    } catch (error: any) {
      console.error("[GuarnicaoTab] Erro ao salvar policial:", error);
      toast({ variant: "destructive", title: "Erro ao Salvar no BD", description: `Falha: ${error.message || 'Erro desconhecido'}` });
    }
  };

  const isSaveDisabled = useCallback((): boolean => {
    const { rgpm, nome, graduacao, pai, mae, naturalidade, cpf, telefone } = newOfficerFormData;
    if (!rgpm || !nome || !graduacao || !pai || !mae || !naturalidade || !cpf || !telefone) return true;
    if (somenteNumeros(rgpm).length !== 6) return true;
    if (somenteNumeros(cpf).length !== 11 || !validateCPF(cpf)) return true;
    const telNums = somenteNumeros(telefone);
    if (telNums.length !== 10 && telNums.length !== 11) return true;
    return false;
  }, [newOfficerFormData]);

  return (
    <div>
      <h2 className="section-title">Guarnição</h2>
      <p className="section-subtitle">Adicione os componentes buscando por RGPM</p>

      <div className="form-grid">
        <div className="form-group" style={{alignItems:'flex-end'}}>
          <button className="add-button" onClick={openRegisterDialog} type="button">
            <UserPlus className="mr-2 h-4 w-4" /> Cadastrar/Atualizar Policial
          </button>
        </div>

        <div className="search-box">
          <Input
            id="rgpmSearchInput"
            type="text"
            inputMode="numeric"
            className="search-input"
            placeholder="Digite o RGPM para adicionar à guarnição"
            value={searchRgpm}
            onChange={handleSearchRgpmChange}
            disabled={isSearching}
            maxLength={6}
            onKeyDown={e => {
              if (e.key === 'Enter' && !isSearching && searchRgpm.length === 6) handleSearchAndAdd();
            }}
          />
          <button className="btn-add" onClick={handleSearchAndAdd} disabled={isSearching || searchRgpm.length !== 6}>
            Adicionar
          </button>
        </div>

        <div className="form-group">
          <Label>Componentes da Guarnição Atual</Label>
          {currentGuarnicaoList.length === 0 ? (
            <div className="members-list"><div className="empty">Nenhum componente adicionado. Use a busca acima.</div></div>
          ) : (
            <div>
              {currentGuarnicaoList.map((componente, index) => {
                const initials = String(componente.nome || '').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
                return (
                  <div key={`${componente.rg}-${index}`} className="member-item">
                    <div className="member-info">
                      <div className="member-avatar">{initials || 'PM'}</div>
                      <div className="member-details">
                        <h4>{componente.nome || 'Sem Nome'}</h4>
                        <p>{componente.posto || 'Sem Posto'} • RGPM: {componente.rg || 'Não informado'}</p>
                      </div>
                    </div>
                    <div className="member-actions">
                      <button className="btn-remove" onClick={() => handleRemove(index)} title="Remover"><i className="fas fa-trash"></i></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Cadastrar ou Atualizar</DialogTitle>
            <DialogDescription>Preencha os dados do policial.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 max-h-[70vh] overflow-y-auto pr-3 px-[5px] py-0 my-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dlg-rgpm">RGPM* <Info className="inline h-3 w-3 text-muted-foreground ml-1" aria-label="Usado para buscar e identificar o policial" /></Label>
                <Input id="dlg-rgpm" value={newOfficerFormData.rgpm} onChange={e => handleRegisterInputChange("rgpm", e.target.value)} onBlur={handleRgpmDialogBlur} placeholder="000000" required inputMode="numeric" maxLength={6} disabled={isFetchingDialogDetails} />
                {isFetchingDialogDetails && <p className="text-xs text-muted-foreground mt-1">Buscando dados do RGPM...</p>}
              </div>
              <div>
                <Label htmlFor="dlg-graduacao">Graduação *</Label>
                <select id="dlg-graduacao" value={newOfficerFormData.graduacao} onChange={e => handleRegisterInputChange("graduacao", e.target.value)} required className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" disabled={isFetchingDialogDetails}>
                  <option value="">Selecione...</option>
                  {graduacoes.map(grad => <option key={grad} value={grad}>{grad}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="dlg-nome">Nome Completo *</Label>
              <Input id="dlg-nome" value={newOfficerFormData.nome} onChange={e => handleRegisterInputChange("nome", e.target.value)} placeholder="Nome completo" required disabled={isFetchingDialogDetails} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dlg-cpf">CPF *</Label>
                <Input id="dlg-cpf" value={newOfficerFormData.cpf} onChange={e => handleRegisterInputChange("cpf", e.target.value)} placeholder="000.000.000-00" required inputMode="numeric" maxLength={14} disabled={isFetchingDialogDetails} />
              </div>
              <div>
                <Label htmlFor="dlg-telefone">Telefone (com DDD) *</Label>
                <Input id="dlg-telefone" value={newOfficerFormData.telefone} onChange={e => handleRegisterInputChange("telefone", e.target.value)} placeholder="(00) 00000-0000" required inputMode="tel" maxLength={15} disabled={isFetchingDialogDetails} />
              </div>
            </div>
            <div>
              <Label htmlFor="dlg-naturalidade">Naturalidade (Cidade/UF) *</Label>
              <Input id="dlg-naturalidade" value={newOfficerFormData.naturalidade} onChange={e => handleRegisterInputChange("naturalidade", e.target.value)} placeholder="Ex: Cuiabá/MT" required disabled={isFetchingDialogDetails} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dlg-pai">Nome do Pai *</Label>
                <Input id="dlg-pai" value={newOfficerFormData.pai} onChange={e => handleRegisterInputChange("pai", e.target.value)} required placeholder="Nome completo do pai" disabled={isFetchingDialogDetails} />
              </div>
              <div>
                <Label htmlFor="dlg-mae">Nome da Mãe *</Label>
                <Input id="dlg-mae" value={newOfficerFormData.mae} onChange={e => handleRegisterInputChange("mae", e.target.value)} required placeholder="Nome completo da mãe" disabled={isFetchingDialogDetails} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeRegisterDialog} type="button" disabled={isFetchingDialogDetails}>Cancelar</Button>
            <Button onClick={handleSaveNewOfficer} disabled={isFetchingDialogDetails} type="button">Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default GuarnicaoTab;
