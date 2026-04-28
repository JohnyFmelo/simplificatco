import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter as BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, Plus, LogOut, Folder, MoreHorizontal } from "lucide-react";
import TCOmeus, { TcoData } from "@/components/tco/TCOmeus";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createPortal } from "react-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <HeaderActions />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/home" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

type ManagedProfile = {
  rgpm: string;
  nome: string;
  email?: string;
  graduacao?: string;
  unidade?: string;
  nivel?: string;
  prazoUtilizacaoAte?: string;
};

const HeaderActions = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === "/login";
  const { toast } = useToast();
  const [openMeusTcos, setOpenMeusTcos] = React.useState(false);
  const [selectedTcoForMeus, setSelectedTcoForMeus] = React.useState<TcoData | null>(null);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openCreateUnit, setOpenCreateUnit] = React.useState(false);
  
  const [nivelAcesso, setNivelAcesso] = React.useState("Operacional");
  const [cr, setCr] = React.useState("");
  const [unidade, setUnidade] = React.useState("");
  const [rgpm, setRgpm] = React.useState("");
  const [graduacao, setGraduacao] = React.useState("");
  const [nome, setNome] = React.useState("");
  const [cpf, setCpf] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [naturalidade, setNaturalidade] = React.useState("");
  const [pai, setPai] = React.useState("");
  const [mae, setMae] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [openChangePassword, setOpenChangePassword] = React.useState(false);
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [isCheckingCurrentPassword, setIsCheckingCurrentPassword] = React.useState(false);
  const [isCurrentPasswordValid, setIsCurrentPasswordValid] = React.useState(false);
  const [openUsageDeadline, setOpenUsageDeadline] = React.useState(false);
  const [usageDeadlineRgpm, setUsageDeadlineRgpm] = React.useState("");
  const [usageDeadlineName, setUsageDeadlineName] = React.useState("");
  const [usageDeadlineDate, setUsageDeadlineDate] = React.useState("");
  const [savingUsageDeadline, setSavingUsageDeadline] = React.useState(false);
  const storedNivel = (localStorage.getItem("nivel_acesso") || sessionStorage.getItem("nivel_acesso") || "").trim();
  const isAdmin = storedNivel === "Administrador";
  const isStandard = storedNivel === "Padrão";
  const storedRgpm = (localStorage.getItem("rgpm") || sessionStorage.getItem("rgpm") || "").trim();
  const storedNome = (sessionStorage.getItem("nome_completo") || "").trim();
  const [currentUsageDeadline, setCurrentUsageDeadline] = React.useState(
    () => (sessionStorage.getItem("prazo_utilizacao_ate") || "").trim()
  );
  const [currentUsageDefinedAt, setCurrentUsageDefinedAt] = React.useState(
    () => (sessionStorage.getItem("prazo_utilizacao_definido_em") || "").trim()
  );
  const [openUsageValidityNotice, setOpenUsageValidityNotice] = React.useState(false);
  const [usageValidityNotice, setUsageValidityNotice] = React.useState<{
    deadline: string;
    renewalDays: number | null;
  }>({ deadline: "", renewalDays: null });
  const [crList, setCrList] = React.useState<string[]>([]);
  const [unitOptions, setUnitOptions] = React.useState<{ id: string; cr: string; unidade: string }[]>([]);
  const [crLoading, setCrLoading] = React.useState(false);
  const [uNome, setUNome] = React.useState("");
  const [uAbbr, setUAbbr] = React.useState("");
  const [uTipo, setUTipo] = React.useState<"BPM" | "CIPM" | "NPM" | "CIAPM" | "SEDE">("BPM");
  const [uCr, setUCr] = React.useState("");
  const [uLogradouro, setULogradouro] = React.useState("");
  const [uNumeroEndereco, setUNumeroEndereco] = React.useState("");
  const [uComplemento, setUComplemento] = React.useState("");
  const [uBairro, setUBairro] = React.useState("");
  const [uCidade, setUCidade] = React.useState("");
  const [uCep, setUCep] = React.useState("");
  const [addingCr, setAddingCr] = React.useState(false);
  const [newCr, setNewCr] = React.useState("");
  const [isAddingCr, setIsAddingCr] = React.useState(false);
  const [profiles, setProfiles] = React.useState<ManagedProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = React.useState(false);
  const [profilesSearch, setProfilesSearch] = React.useState("");
  const [profilesTab, setProfilesTab] = React.useState("create");
  const passwordCheckRequestRef = React.useRef(0);
  const graduacoes = [
    "SD PM",
    "CB PM",
    "3º SGT PM",
    "2º SGT PM",
    "1º SGT PM",
    "SUB TEN PM",
    "ASPIRANTE PM",
    "2º TEN PM",
    "1º TEN PM",
    "CAP PM",
    "MAJ PM",
    "TEN CEL PM",
    "CEL PM"
  ];

  const onlyDigits = (s: string) => s.replace(/\D+/g, "");
  const formatCpf = (s: string) => {
    const d = onlyDigits(s).slice(0, 11);
    const p1 = d.slice(0, 3);
    const p2 = d.slice(3, 6);
    const p3 = d.slice(6, 9);
    const p4 = d.slice(9, 11);
    let out = "";
    if (p1) out += p1;
    if (p2) out += `.${p2}`;
    if (p3) out += `.${p3}`;
    if (p4) out += `-${p4}`;
    return out;
  };
  const formatTelefone = (s: string) => {
    const d = onlyDigits(s).slice(0, 11);
    const dd = d.slice(0, 2);
    const n1 = d.length === 11 ? d.slice(2, 7) : d.slice(2, 6);
    const n2 = d.length === 11 ? d.slice(7, 11) : d.slice(6, 10);
    let out = "";
    if (dd) out += `(${dd})`;
    if (n1) out += ` ${n1}`;
    if (n2) out += `-${n2}`;
    return out.trim();
  };
  const formatCep = (s: string) => {
    const d = onlyDigits(s).slice(0, 8);
    const p1 = d.slice(0, 5);
    const p2 = d.slice(5);
    return p2 ? `${p1}-${p2}` : p1;
  };
  const getUsageDaysRemaining = (dateValue?: string | null) => {
    const raw = String(dateValue || "").trim();
    if (!raw) return null;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const deadline = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(deadline.getTime())) return null;
    return Math.floor((deadline.getTime() - startOfToday.getTime()) / 86400000);
  };
  const isUsageExpired = (dateValue?: string | null) => {
    const daysRemaining = getUsageDaysRemaining(dateValue);
    if (daysRemaining === null) return false;
    return daysRemaining <= 0;
  };
  const requiresUsageDeadline = (accessLevel?: string | null) =>
    String(accessLevel || "").trim() !== "Administrador";
  const formatUsageDate = (dateValue?: string | null) => {
    const raw = String(dateValue || "").trim();
    if (!raw) return "-";
    const parts = raw.split("-");
    if (parts.length !== 3) return raw;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };
  const getRenewalDays = (deadlineValue?: string | null, definedAtValue?: string | null) => {
    const rawDeadline = String(deadlineValue || "").trim();
    const rawDefinedAt = String(definedAtValue || "").trim();
    if (!rawDeadline || !rawDefinedAt) return null;
    const deadline = new Date(`${rawDeadline}T00:00:00`);
    const definedAt = new Date(rawDefinedAt);
    if (Number.isNaN(deadline.getTime()) || Number.isNaN(definedAt.getTime())) return null;
    const definedAtDay = new Date(definedAt.getFullYear(), definedAt.getMonth(), definedAt.getDate());
    return Math.max(0, Math.floor((deadline.getTime() - definedAtDay.getTime()) / 86400000));
  };
  const getUsageRenewalAlertKey = (rgpmValue?: string | null, deadlineValue?: string | null, definedAtValue?: string | null) => {
    const rg = String(rgpmValue || "").trim();
    const deadline = String(deadlineValue || "").trim();
    const definedAt = String(definedAtValue || "").trim();
    if (!rg || !deadline) return "";
    return definedAt
      ? `usage-validity-notice:v2:${rg}:${deadline}:${definedAt}`
      : `usage-validity-notice:v2:${rg}:${deadline}`;
  };
  const isMissingUsageDefinedAtColumnError = (error: any) => {
    const message = String(error?.message || "");
    return message.includes("prazo_utilizacao_definido_em") && message.includes("does not exist");
  };
  const emitUsageRenewalAlert = React.useCallback((
    deadlineValue?: string | null,
    definedAtValue?: string | null,
    rgpmValue?: string | null,
    options?: { force?: boolean }
  ) => {
    const alertKey = getUsageRenewalAlertKey(rgpmValue, deadlineValue, definedAtValue);
    if (!alertKey) return;
    if (!options?.force && localStorage.getItem("last_usage_renewal_alert") === alertKey) return;
    const renewalDays = getRenewalDays(deadlineValue, definedAtValue);
    const deadline = String(deadlineValue || "").trim();
    if (!deadline) return;
    setUsageValidityNotice({
      deadline,
      renewalDays,
    });
    setOpenUsageValidityNotice(true);
    localStorage.setItem("last_usage_renewal_alert", alertKey);
  }, []);
  const fetchMilitaryUsageInfo = React.useCallback(async (rgpmValue: string) => {
    const preferred = await supabase
      .from("militares" as any)
      .select("prazo_utilizacao_ate,prazo_utilizacao_definido_em")
      .eq("rgpm", rgpmValue)
      .limit(1);
    if (!preferred.error) {
      return {
        row: preferred.data && preferred.data[0],
        supportsDefinedAt: true,
      };
    }
    if (!isMissingUsageDefinedAtColumnError(preferred.error)) throw preferred.error;
    const fallback = await supabase
      .from("militares" as any)
      .select("prazo_utilizacao_ate")
      .eq("rgpm", rgpmValue)
      .limit(1);
    if (fallback.error) throw fallback.error;
    return {
      row: fallback.data && fallback.data[0],
      supportsDefinedAt: false,
    };
  }, []);
  React.useEffect(() => {
    if (!storedRgpm || !requiresUsageDeadline(storedNivel) || !currentUsageDeadline) return;
    emitUsageRenewalAlert(currentUsageDeadline, currentUsageDefinedAt, storedRgpm);
  }, [currentUsageDeadline, currentUsageDefinedAt, emitUsageRenewalAlert, storedNivel, storedRgpm]);
  const fetchOfficerByRgpm = async (rg: string) => {
    try {
      const { data, error } = await supabase
        .from("police_officers")
        .select("nome_completo, graduacao, cpf, telefone, naturalidade, nome_pai, nome_mae")
        .eq("rgpm", rg)
        .single();
      if (error) return;
      const d: any = data || {};
      setNome(String(d.nome_completo || "").toUpperCase());
      setGraduacao(String(d.graduacao || ""));
      setCpf(formatCpf(String(d.cpf || "")));
      setTelefone(formatTelefone(String(d.telefone || "")));
      setNaturalidade(String(d.naturalidade || "").toUpperCase());
      setPai(String(d.nome_pai || "").toUpperCase());
      setMae(String(d.nome_mae || "").toUpperCase());
    } catch {}
  };

  React.useEffect(() => {
    if (!openCreate && !openCreateUnit) return;
    (async () => {
      try {
        setCrLoading(true);
        const { data, error } = await supabase
          .from("unidades" as any)
          .select("id, cr, nome_oficial")
          .order("cr")
          .order("nome_oficial");
        if (error) throw error;
        const units = (data || [])
          .map((u: any) => ({ id: String(u.id || "").trim(), cr: String(u.cr || "").trim(), unidade: String(u.nome_oficial || "").trim() }))
          .filter(u => u.cr && u.unidade);
        setUnitOptions(units);
        const crs = Array.from(new Set(units.map(u => u.cr))).sort((a, b) => a.localeCompare(b));
        setCrList(crs);
      } catch (e) {
        console.error("Erro carregando CR/Unidades:", e);
      } finally {
        setCrLoading(false);
      }
    })();
  }, [openCreate, openCreateUnit]);

  const handleSubmitCreateUnit = async () => {
    const baseNome = uNome.trim();
    const baseAbbr = uAbbr.trim();
    const baseCr = uCr.trim();
    const baseCidade = uCidade.trim();
    if (!baseNome || !baseAbbr || !uTipo || !baseCr || !baseCidade) {
      toast({ title: "Dados obrigatórios", description: "Informe Nome oficial, Abreviação, Tipo, CR e Cidade." });
      return;
    }
    try {
      const tipoDb = ((): "BPM" | "CIPM" | "CPM" | "NPM" | "OUTRO" => {
        if (uTipo === "CIAPM") return "CIPM";
        if (uTipo === "SEDE") return "OUTRO";
        return uTipo as any;
      })();
      const payload: any = {
        nome_oficial: baseNome,
        abreviacao: baseAbbr,
        tipo: tipoDb,
        cr: baseCr,
        logradouro: uLogradouro.trim() || null,
        numero_endereco: uNumeroEndereco.trim() || null,
        complemento: uComplemento.trim() || null,
        bairro: uBairro.trim() || null,
        cidade: baseCidade,
        uf: "MT",
        cep: uCep.trim() || null,
        ativa: true,
        possui_forca_tatica: false
      };
      const { error } = await supabase
        .from("unidades" as any)
        .insert(payload);
      if (error) throw error;
      toast({ title: "Unidade criada", description: "Dados inseridos com sucesso." });
      setOpenCreateUnit(false);
      setUNome(""); setUAbbr(""); setUTipo("BPM"); setUCr(""); setULogradouro(""); setUNumeroEndereco(""); setUComplemento(""); setUBairro(""); setUCidade(""); setUCep("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao criar unidade", description: e?.message || String(e) });
    }
  };

  const loadProfiles = async () => {
    try {
      setProfilesLoading(true);
      const [militares, officers, logins] = await Promise.all([
        supabase.from("militares" as any).select("rgpm,email,nome_completo,prazo_utilizacao_ate"),
        supabase.from("police_officers").select("rgpm,nome_completo,graduacao"),
        supabase.from("usuarios_login" as any).select("rgpm,unidade,nivel_acesso,email"),
      ]);

      const mapMilitares = new Map<string, { nome?: string; email?: string; prazoUtilizacaoAte?: string }>();
      if (militares.data) {
        militares.data.forEach((r: any) => {
          const key = String(r.rgpm || "").trim();
          if (!key) return;
          mapMilitares.set(key, {
            nome: String(r.nome_completo || "").trim(),
            email: String(r.email || "").trim(),
            prazoUtilizacaoAte: String(r.prazo_utilizacao_ate || "").trim(),
          });
        });
      }

      const mapOfficers = new Map<string, { nome?: string; graduacao?: string }>();
      if (officers.data) {
        officers.data.forEach((r: any) => {
          const key = String(r.rgpm || "").trim();
          if (!key) return;
          mapOfficers.set(key, {
            nome: String(r.nome_completo || "").trim(),
            graduacao: String(r.graduacao || "").trim(),
          });
        });
      }

      const mapLogin = new Map<string, { unidade?: string; nivel?: string; email?: string }>();
      if (logins.data) {
        logins.data.forEach((r: any) => {
          const key = String(r.rgpm || "").trim();
          if (!key) return;
          mapLogin.set(key, {
            unidade: String(r.unidade || "").trim(),
            nivel: String(r.nivel_acesso || "").trim(),
            email: String(r.email || "").trim(),
          });
        });
      }

      const keys = Array.from(new Set([
        ...mapMilitares.keys(),
        ...mapLogin.keys(),
      ]));

      const rows: ManagedProfile[] = keys.map((rg) => {
        const militar = mapMilitares.get(rg);
        const officer = mapOfficers.get(rg);
        const login = mapLogin.get(rg);
        return {
          rgpm: rg,
          nome: militar?.nome || officer?.nome || "Sem nome cadastrado",
          email: militar?.email || login?.email || "",
          graduacao: officer?.graduacao || "",
          unidade: login?.unidade || "",
          nivel: login?.nivel || "Sem nível definido",
          prazoUtilizacaoAte: militar?.prazoUtilizacaoAte || "",
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

      setProfiles(rows);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao carregar perfis", description: e?.message || String(e) });
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleBlockProfile = async (targetRgpm: string) => {
    try {
      const { error } = await supabase
        .from("usuarios_login" as any)
        .update({ nivel_acesso: "Bloqueado" })
        .eq("rgpm", targetRgpm);
      if (error) throw error;
      if (storedRgpm === targetRgpm) handleLogout();
      toast({ title: "Perfil bloqueado" });
      await loadProfiles();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao bloquear", description: e?.message || String(e) });
    }
  };

  const handleDeleteProfile = async (targetRgpm: string) => {
    try {
      const [{ error: loginError }, { error: militarError }] = await Promise.all([
        supabase.from("usuarios_login" as any).delete().eq("rgpm", targetRgpm),
        supabase.from("militares" as any).delete().eq("rgpm", targetRgpm),
      ]);
      if (loginError) throw loginError;
      if (militarError) throw militarError;
      if (storedRgpm === targetRgpm) handleLogout();
      toast({ title: "Perfil excluído" });
      await loadProfiles();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: e?.message || String(e) });
    }
  };

  const handleEditProfile = (p: ManagedProfile) => {
    setRgpm(p.rgpm);
    setNome(p.nome);
    setGraduacao(p.graduacao || "");
    setUnidade(p.unidade || "");
    setNivelAcesso(p.nivel || "Operador");
    setProfilesTab("create");
  };

  const handleOpenUsageDeadline = (p: ManagedProfile) => {
    setUsageDeadlineRgpm(p.rgpm);
    setUsageDeadlineName(p.nome);
    setUsageDeadlineDate(p.prazoUtilizacaoAte || "");
    setOpenUsageDeadline(true);
  };

  const handleSaveUsageDeadline = async () => {
    if (!usageDeadlineRgpm) return;
    try {
      setSavingUsageDeadline(true);
      const definedAtNow = new Date().toISOString();
      let latestDeadline = String(usageDeadlineDate || "").trim();
      let latestDefinedAt = usageDeadlineDate ? definedAtNow : "";
      const preferred = await supabase
        .from("militares" as any)
        .update({
          prazo_utilizacao_ate: usageDeadlineDate || null,
          prazo_utilizacao_definido_em: usageDeadlineDate ? definedAtNow : null,
        })
        .eq("rgpm", usageDeadlineRgpm)
        .select("prazo_utilizacao_ate,prazo_utilizacao_definido_em")
        .single();
      if (preferred.error) {
        if (!isMissingUsageDefinedAtColumnError(preferred.error)) throw preferred.error;
        const fallback = await supabase
          .from("militares" as any)
          .update({
            prazo_utilizacao_ate: usageDeadlineDate || null,
          })
          .eq("rgpm", usageDeadlineRgpm)
          .select("prazo_utilizacao_ate")
          .single();
        if (fallback.error) throw fallback.error;
        latestDeadline = String((fallback.data as any)?.prazo_utilizacao_ate || usageDeadlineDate || "").trim();
      } else {
        latestDeadline = String((preferred.data as any)?.prazo_utilizacao_ate || usageDeadlineDate || "").trim();
        latestDefinedAt = String((preferred.data as any)?.prazo_utilizacao_definido_em || (usageDeadlineDate ? definedAtNow : "")).trim();
      }
      if (usageDeadlineRgpm === storedRgpm) {
        if (latestDeadline) {
          sessionStorage.setItem("prazo_utilizacao_ate", latestDeadline);
        } else {
          sessionStorage.removeItem("prazo_utilizacao_ate");
        }
        if (latestDefinedAt) {
          sessionStorage.setItem("prazo_utilizacao_definido_em", latestDefinedAt);
        } else {
          sessionStorage.removeItem("prazo_utilizacao_definido_em");
        }
        setCurrentUsageDeadline(latestDeadline);
        setCurrentUsageDefinedAt(latestDefinedAt);
        if (latestDeadline && latestDefinedAt) {
          localStorage.setItem(
            "last_usage_renewal_alert",
            getUsageRenewalAlertKey(usageDeadlineRgpm, latestDeadline, latestDefinedAt)
          );
        }
      }
      if (latestDeadline) {
        emitUsageRenewalAlert(latestDeadline, latestDefinedAt, usageDeadlineRgpm, { force: true });
      } else {
        toast({
          title: "Prazo removido",
          description: "O perfil voltou a ter acesso sem data limite.",
        });
      }
      setOpenUsageDeadline(false);
      await loadProfiles();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao salvar prazo", description: e?.message || String(e) });
    } finally {
      setSavingUsageDeadline(false);
    }
  };

  const openProfilesDialog = async (tab: "create" | "list") => {
    setProfilesTab(tab);
    setOpenCreate(true);
    if (tab === "list") {
      await loadProfiles();
    }
  };

  const filteredProfiles = React.useMemo(() => {
    const q = profilesSearch.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => (
      p.rgpm.toLowerCase().includes(q) ||
      p.nome.toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q)
    ));
  }, [profiles, profilesSearch]);

  const handleAddCr = async () => {
    const val = newCr.trim();
    if (!val) {
      toast({ title: "Informe o CR", description: "Ex: 2º CR" });
      return;
    }
    if (crList.includes(val)) {
      toast({ title: "CR já existe", description: "Selecione-o na lista." });
      return;
    }
    try {
      setIsAddingCr(true);
      const payload: any = {
        nome_oficial: `${val} Comando Regional - Sede`,
        abreviacao: null,
        tipo: "OUTRO",
        cr: val,
        logradouro: null,
        numero_endereco: null,
        complemento: null,
        bairro: null,
        cidade: "",
        uf: "MT",
        cep: null,
        ativa: true,
        possui_forca_tatica: false
      };
      const { error } = await supabase
        .from("unidades" as any)
        .insert(payload);
      if (error) throw error;
      setCrList(prev => Array.from(new Set([...prev, val])).sort((a, b) => a.localeCompare(b)));
      setUCr(val);
      setNewCr("");
      setAddingCr(false);
      toast({ title: "CR adicionado", description: "O novo CR foi salvo e está disponível." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao adicionar CR", description: e?.message || String(e) });
    } finally {
      setIsAddingCr(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("rgpm");
      sessionStorage.removeItem("rgpm");
      localStorage.removeItem("nivel_acesso");
      sessionStorage.removeItem("nivel_acesso");
      sessionStorage.removeItem("prazo_utilizacao_ate");
      sessionStorage.removeItem("prazo_utilizacao_definido_em");
      setCurrentUsageDeadline("");
      setCurrentUsageDefinedAt("");
    } finally {
      navigate("/login");
    }
  };

  React.useEffect(() => {
    let timer: any;
    const checkAccess = async () => {
      const current = (localStorage.getItem("rgpm") || sessionStorage.getItem("rgpm") || "").trim();
      if (!current) return;
      try {
        const [{ data: loginData }, militaryInfo] = await Promise.all([
          supabase
            .from("usuarios_login" as any)
            .select("nivel_acesso")
            .eq("rgpm", current)
            .limit(1),
          fetchMilitaryUsageInfo(current),
        ]);
        const loginRow = loginData && loginData[0];
        const militaryRow = militaryInfo.row;
        const currentAccessLevel = String((loginRow as any)?.nivel_acesso || "").trim();
        const latestDeadline = String((militaryRow as any)?.prazo_utilizacao_ate || "").trim();
        const latestDefinedAt = militaryInfo.supportsDefinedAt
          ? String((militaryRow as any)?.prazo_utilizacao_definido_em || "").trim()
          : "";
        setCurrentUsageDeadline(latestDeadline);
        setCurrentUsageDefinedAt(latestDefinedAt);
        if (latestDeadline) {
          sessionStorage.setItem("prazo_utilizacao_ate", latestDeadline);
        } else {
          sessionStorage.removeItem("prazo_utilizacao_ate");
        }
        if (latestDefinedAt) {
          sessionStorage.setItem("prazo_utilizacao_definido_em", latestDefinedAt);
        } else {
          sessionStorage.removeItem("prazo_utilizacao_definido_em");
        }
        if (requiresUsageDeadline(currentAccessLevel) && latestDeadline) {
          emitUsageRenewalAlert(latestDeadline, latestDefinedAt, current);
        }
        if (
          loginRow &&
          (
            currentAccessLevel === "Bloqueado" ||
            (requiresUsageDeadline(currentAccessLevel) && !latestDeadline) ||
            isUsageExpired(latestDeadline)
          )
        ) {
          if (currentAccessLevel === "Bloqueado") {
            toast({ variant: "destructive", title: "Acesso bloqueado", description: "Contate o administrador." });
          } else if (requiresUsageDeadline(currentAccessLevel) && !latestDeadline) {
            toast({ variant: "destructive", title: "Acesso sem prazo", description: "Contate o administrador." });
          } else if (isUsageExpired(latestDeadline)) {
            toast({ variant: "destructive", title: "Senha incorreta", description: "Contate o administrador." });
          }
          handleLogout();
        }
      } catch {}
    };
    checkAccess();
    timer = setInterval(checkAccess, 10000);
    return () => { if (timer) clearInterval(timer); };
  }, [emitUsageRenewalAlert, fetchMilitaryUsageInfo]);

  const resetChangePasswordForm = React.useCallback(() => {
    passwordCheckRequestRef.current += 1;
    setOldPassword("");
    setNewPassword("");
    setIsCheckingCurrentPassword(false);
    setIsCurrentPasswordValid(false);
  }, []);

  const verifyCurrentPassword = React.useCallback(async (passwordValue: string) => {
    const candidate = passwordValue.trim();
    if (!candidate || !storedRgpm) {
      setIsCurrentPasswordValid(false);
      return false;
    }

    const requestId = ++passwordCheckRequestRef.current;
    setIsCheckingCurrentPassword(true);
    try {
      const [{ data: militaryUser, error: militaryError }, { data: loginUser, error: loginError }] = await Promise.all([
        supabase
          .from("militares" as any)
          .select("senha")
          .eq("rgpm", storedRgpm)
          .maybeSingle(),
        supabase
          .from("usuarios_login" as any)
          .select("senha")
          .eq("rgpm", storedRgpm)
          .maybeSingle(),
      ]);

      if (militaryError) throw militaryError;
      if (loginError) throw loginError;

      const savedMilitaryPassword = String((militaryUser as any)?.senha || "").trim();
      const savedLoginPassword = String((loginUser as any)?.senha || "").trim();
      const referencePassword = savedMilitaryPassword || savedLoginPassword;
      const isValid = !!referencePassword && referencePassword === candidate;

      if (requestId === passwordCheckRequestRef.current) {
        setIsCurrentPasswordValid(isValid);
        if (!isValid) setNewPassword("");
      }

      return isValid;
    } catch (e) {
      if (requestId === passwordCheckRequestRef.current) {
        setIsCurrentPasswordValid(false);
        setNewPassword("");
      }
      throw e;
    } finally {
      if (requestId === passwordCheckRequestRef.current) {
        setIsCheckingCurrentPassword(false);
      }
    }
  }, [storedRgpm]);

  React.useEffect(() => {
    if (!openChangePassword) {
      resetChangePasswordForm();
      return;
    }

    const candidate = oldPassword.trim();
    setNewPassword("");
    setIsCurrentPasswordValid(false);

    if (!candidate || !storedRgpm) {
      setIsCheckingCurrentPassword(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void verifyCurrentPassword(candidate).catch(() => {
        toast({
          variant: "destructive",
          title: "Erro ao validar senha",
          description: "Nao foi possivel validar a senha atual.",
        });
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [oldPassword, openChangePassword, resetChangePasswordForm, storedRgpm, toast, verifyCurrentPassword]);

  const handleSubmitChangePassword = async () => {
    const baseOld = oldPassword.trim();
    const baseNew = newPassword.trim();
    if (!baseOld || !baseNew) {
      toast({ title: "Dados obrigatórios", description: "Informe a senha atual e a nova senha." });
      return;
    }
    if (baseNew.length < 6) {
      toast({ title: "Senha muito curta", description: "A nova senha deve ter ao menos 6 caracteres." });
      return;
    }
    if (!storedRgpm) {
      toast({ variant: "destructive", title: "Sessão inválida", description: "Faça login novamente para alterar sua senha." });
      return;
    }
    try {
      const currentPasswordIsValid = await verifyCurrentPassword(baseOld);
      if (!currentPasswordIsValid) {
        toast({ variant: "destructive", title: "Senha incorreta", description: "A senha atual está incorreta." });
        return;
      }

      const [{ error: loginUpdateError }, { error: militaryUpdateError }] = await Promise.all([
        supabase
          .from("usuarios_login" as any)
          .update({ senha: baseNew })
          .eq("rgpm", storedRgpm),
        supabase
          .from("militares" as any)
          .update({ senha: baseNew })
          .eq("rgpm", storedRgpm),
      ]);

      if (loginUpdateError) throw loginUpdateError;
      if (militaryUpdateError) throw militaryUpdateError;

      toast({ title: "Senha alterada", description: "Sua senha foi atualizada com sucesso." });
      setOpenChangePassword(false);
      resetChangePasswordForm();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao alterar senha", description: e?.message || String(e) });
    }
  };

  const handleSubmitCreate = async () => {
    const baseNome = nome.trim();
    const baseRgpm = onlyDigits(rgpm).slice(0, 6);
    const baseCpf = onlyDigits(cpf).slice(0, 11);
    const baseTelefone = onlyDigits(telefone).slice(0, 11);
    if (!baseNome || !baseRgpm || !graduacao.trim()) {
      toast({ title: "Dados obrigatórios", description: "Informe Nome, RGPM e Graduação." });
      return;
    }
    try {
      const { error: e1 } = await supabase
        .from("police_officers")
        .upsert({
          rgpm: baseRgpm,
          nome_completo: baseNome,
          graduacao: graduacao.trim(),
          cpf: baseCpf,
          telefone: baseTelefone,
          naturalidade: naturalidade.trim().toUpperCase(),
          nome_pai: pai.trim().toUpperCase(),
          nome_mae: mae.trim().toUpperCase(),
        }, { onConflict: "rgpm" });
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("usuarios_login" as any)
        .upsert({
          rgpm: baseRgpm,
          senha: senha.trim(),
          cr: cr.trim(),
          unidade: unidade.trim(),
          nivel_acesso: nivelAcesso.trim(),
        }, { onConflict: "rgpm" });
      if (e2) throw e2;
      toast({ title: "Perfil criado", description: "Dados inseridos com sucesso." });
      setOpenCreate(false);
      setNivelAcesso("Operador");
      setCr(""); setUnidade(""); setRgpm(""); setGraduacao(""); setNome(""); setCpf(""); setTelefone(""); setNaturalidade(""); setPai(""); setMae(""); setSenha("");
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      if (msg.toLowerCase().includes("check constraint") && msg.includes("usuarios_login_nivel_acesso_check")) {
        try {
          const { error: e2b } = await supabase
            .from("usuarios_login" as any)
            .upsert({
              rgpm: onlyDigits(rgpm).slice(0,6),
              senha: senha.trim(),
              cr: cr.trim(),
              unidade: unidade.trim(),
              nivel_acesso: "Operacional",
            }, { onConflict: "rgpm" });
          if (e2b) throw e2b;
          toast({ title: "Perfil criado", description: "Banco não aceita o novo nível. Gravado como Operacional." });
          setOpenCreate(false);
          setNivelAcesso("Operador");
          setCr(""); setUnidade(""); setRgpm(""); setGraduacao(""); setNome(""); setCpf(""); setTelefone(""); setNaturalidade(""); setPai(""); setMae(""); setSenha("");
          return;
        } catch (e3: any) {
          toast({ variant: "destructive", title: "Erro ao criar perfil", description: e3?.message || String(e3) });
          return;
        }
      }
      toast({ variant: "destructive", title: "Erro ao criar perfil", description: msg });
    }
  };

          if (isLogin) return null;

          const leftPortal = createPortal(
            <div className="fixed top-2 left-2 sm:top-3 sm:left-4 z-[100] pointer-events-auto flex flex-col items-start gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpenMeusTcos(true)}
                className="h-9 gap-2 rounded-xl border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white/90 backdrop-blur-sm shadow-lg px-3 font-medium"
              >
                <Folder className="h-4 w-4" />
                <span className="hidden sm:inline">Meus TCO's</span>
              </Button>
            </div>,
            document.body
          );

          const tcoModal = (
            <Dialog open={openMeusTcos} onOpenChange={setOpenMeusTcos}>
              <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 border-none shadow-2xl">
                <div className="p-4 border-b bg-white flex justify-between items-center sticky top-0 z-10 shadow-sm">
                  <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                    <Folder className="h-5 w-5 text-blue-600" />
                    Meus TCO's
                  </DialogTitle>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
                  <TCOmeus
                    user={{
                      id: storedRgpm,
                      registration: storedRgpm,
                      userType: storedNivel
                    }}
                    toast={toast}
                    selectedTco={selectedTcoForMeus}
                    setSelectedTco={setSelectedTcoForMeus}
                  />
                </div>
              </DialogContent>
            </Dialog>
          );

          const rightPortal = createPortal(
            <div className="fixed top-2 right-2 sm:top-3 sm:right-4 z-[100] pointer-events-auto flex items-center gap-2">
              {storedNome && (
                <span className="hidden sm:inline-block text-white/90 text-xs font-medium backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 shadow-lg max-w-[200px] truncate">
                  {storedNome}
                </span>
              )}
              {storedRgpm && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Configurações" className="h-9 w-9 rounded-xl border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white/90 backdrop-blur-sm shadow-lg">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      resetChangePasswordForm();
                      setOpenChangePassword(true);
                    }}>
                      Alterar senha
                    </DropdownMenuItem>
                    {isAdmin && <DropdownMenuSeparator />}
                    {isAdmin && <DropdownMenuItem onClick={() => void openProfilesDialog("list")}>Ver perfis do sistema</DropdownMenuItem>}
                    {isAdmin && <DropdownMenuItem onClick={() => void openProfilesDialog("create")}>Criar perfil</DropdownMenuItem>}
                    {isAdmin && <DropdownMenuItem onClick={() => setOpenCreateUnit(true)}>Criar unidade</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout} 
                aria-label="Sair"
                className="h-9 w-9 rounded-xl border border-white/30 bg-white/10 text-white hover:bg-red-500/40 hover:text-white backdrop-blur-sm shadow-lg"
              >
                <LogOut className="h-5 w-5" />
              </Button>
              <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="w-[96vw] max-w-[1280px] h-[88vh] flex flex-col overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>Perfis do sistema</DialogTitle>
                    <DialogDescription>Consulte os perfis que acessam o sistema e gerencie os cadastros.</DialogDescription>
                  </DialogHeader>
                  <Tabs
                    value={profilesTab}
                    onValueChange={(v) => { setProfilesTab(v); if (v === "list") loadProfiles(); }}
                    className="flex min-h-0 flex-1 flex-col"
                  >
                    <TabsList className="w-fit">
                      <TabsTrigger value="create">Criar Perfil</TabsTrigger>
                      <TabsTrigger value="list">Perfis com Acesso</TabsTrigger>
                    </TabsList>
                    <TabsContent value="create" className="min-h-0 flex-1 overflow-hidden">
                      <div className="grid gap-4 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Nível de acesso</Label>
                            <select value={nivelAcesso} onChange={e => setNivelAcesso(e.target.value)} className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none">
                              <option value="Administrador">Administrador</option>
                              <option value="Padrão">Padrão</option>
                              <option value="Operador">Operador</option>
                            </select>
                          </div>
                          <div>
                            <Label>CR</Label>
                            <Select value={cr || undefined} onValueChange={(val) => setCr(val)}>
                              <SelectTrigger>
                                <SelectValue placeholder={crLoading ? "Carregando..." : "Selecione o CR"} />
                              </SelectTrigger>
                              <SelectContent>
                                {crList.map((c) => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Unidade</Label>
                            <Select value={unidade || undefined} onValueChange={(val) => setUnidade(val)}>
                              <SelectTrigger>
                                <SelectValue placeholder={crLoading ? "Carregando..." : "Selecione a Unidade"} />
                              </SelectTrigger>
                              <SelectContent>
                                {(unitOptions.filter(u => !cr || u.cr === cr)).map((opt) => (
                                  <SelectItem key={opt.id} value={opt.unidade}>
                                    {opt.unidade}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>RGPM</Label>
                            <Input value={rgpm} onChange={e => setRgpm(e.target.value)} onBlur={e => { const d = onlyDigits(e.target.value); if (d.length === 6) fetchOfficerByRgpm(d); }} />
                          </div>
                          <div>
                            <Label>Graduação</Label>
                            <Select value={graduacao || undefined} onValueChange={(val) => setGraduacao(val)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a graduação" />
                              </SelectTrigger>
                              <SelectContent>
                                {graduacoes.map((g) => (
                                  <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label>Nome</Label>
                            <Input className="uppercase" value={nome} onChange={e => setNome(e.target.value.toUpperCase())} />
                          </div>
                          <div>
                            <Label>CPF</Label>
                            <Input value={cpf} onChange={e => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" maxLength={14} />
                          </div>
                          <div>
                            <Label>Telefone (DDD)</Label>
                            <Input value={telefone} onChange={e => setTelefone(formatTelefone(e.target.value))} placeholder="(00) 00000-0000" inputMode="tel" maxLength={15} />
                          </div>
                          <div>
                            <Label>Naturalidade (Cidade/UF)</Label>
                            <Input className="uppercase" value={naturalidade} onChange={e => setNaturalidade(e.target.value.toUpperCase())} />
                          </div>
                          <div>
                            <Label>Nome do Pai</Label>
                            <Input className="uppercase" value={pai} onChange={e => setPai(e.target.value.toUpperCase())} />
                          </div>
                          <div>
                            <Label>Nome da Mãe</Label>
                            <Input className="uppercase" value={mae} onChange={e => setMae(e.target.value.toUpperCase())} />
                          </div>
                          <div>
                            <Label>Senha de acesso</Label>
                            <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="list" className="min-h-0 flex-1 overflow-hidden">
                      <div className="flex h-full min-h-0 flex-col gap-3">
                        <div className="text-sm text-muted-foreground">
                          {profilesLoading ? "Carregando perfis..." : `${filteredProfiles.length} perfil(is) localizado(s).`}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            placeholder="Buscar por nome, email ou RGPM"
                            value={profilesSearch}
                            onChange={e => setProfilesSearch(e.target.value)}
                            className="sm:flex-1"
                          />
                          <Button className="sm:self-start" variant="outline" onClick={loadProfiles} disabled={profilesLoading}>Atualizar</Button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                          <table className="min-w-[1080px] w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-background shadow-sm">
                              <tr className="border-b">
                                <th className="p-3 text-left font-semibold whitespace-nowrap">RGPM</th>
                                <th className="p-3 text-left font-semibold whitespace-nowrap">Nome</th>
                                <th className="p-3 text-left font-semibold whitespace-nowrap">Email</th>
                                <th className="p-3 text-left font-semibold whitespace-nowrap">Graduação</th>
                                <th className="p-3 text-left font-semibold whitespace-nowrap">Unidade</th>
                                <th className="p-3 text-left font-semibold whitespace-nowrap">Nível</th>
                                <th className="p-3 text-left font-semibold whitespace-nowrap">Prazo de uso</th>
                                <th className="sticky right-0 bg-background p-3 text-left font-semibold whitespace-nowrap">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredProfiles.map(p => (
                                <tr key={p.rgpm} className="border-t">
                                  <td className="p-3 align-top whitespace-nowrap">{p.rgpm}</td>
                                  <td className="p-3 align-top min-w-[220px] break-words">{p.nome}</td>
                                  <td className="p-3 align-top min-w-[240px] break-all">{p.email || '-'}</td>
                                  <td className="p-3 align-top whitespace-nowrap">{p.graduacao || '-'}</td>
                                  <td className="p-3 align-top min-w-[180px] break-words">{p.unidade || '-'}</td>
                                  <td className="p-3 align-top min-w-[140px] break-words">{p.nivel || '-'}</td>
                                  <td className="p-3 align-top whitespace-nowrap">
                                    <span className={isUsageExpired(p.prazoUtilizacaoAte) ? "font-medium text-red-600" : ""}>
                                      {p.prazoUtilizacaoAte ? formatUsageDate(p.prazoUtilizacaoAte) : "-"}
                                    </span>
                                  </td>
                                  <td className="sticky right-0 bg-background p-3 align-top">
                                    <div className="flex min-w-[72px] justify-end">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" aria-label={`Ações do perfil ${p.nome}`}>
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                          <DropdownMenuItem onClick={() => handleEditProfile(p)} disabled={!isAdmin}>Editar</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleOpenUsageDeadline(p)} disabled={!isAdmin}>Definir prazo de uso</DropdownMenuItem>
                                          {p.prazoUtilizacaoAte && (
                                            <DropdownMenuItem onClick={() => {
                                              setUsageDeadlineRgpm(p.rgpm);
                                              setUsageDeadlineName(p.nome);
                                              setUsageDeadlineDate("");
                                              setOpenUsageDeadline(true);
                                            }} disabled={!isAdmin}>
                                              Remover prazo de uso
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => handleBlockProfile(p.rgpm)} disabled={!isAdmin} className="text-red-600 focus:text-red-600">Bloquear</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleDeleteProfile(p.rgpm)} disabled={!isAdmin} className="text-red-600 focus:text-red-600">Excluir</DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {profilesLoading && <div className="p-3 text-center text-muted-foreground">Carregando...</div>}
                          {!profilesLoading && filteredProfiles.length === 0 && <div className="p-3 text-center text-muted-foreground">Nenhum perfil com acesso foi encontrado.</div>}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  {profilesTab === "create" && (
                    <DialogFooter>
                      <Button onClick={handleSubmitCreate}>Salvar</Button>
                    </DialogFooter>
                  )}
                </DialogContent>
              </Dialog>
              <Dialog open={openChangePassword} onOpenChange={(open) => {
                setOpenChangePassword(open);
                if (!open) resetChangePasswordForm();
              }}>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader>
                    <DialogTitle>Alterar senha</DialogTitle>
                    <DialogDescription>Informe sua senha atual e a nova senha.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <Label>Senha atual</Label>
                      <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                      <div className="mt-1 text-xs text-muted-foreground">
                        {isCheckingCurrentPassword
                          ? "Validando senha atual..."
                          : oldPassword.trim()
                            ? (isCurrentPasswordValid
                                ? "Senha atual confirmada."
                                : "Digite a senha atual corretamente para liberar a nova senha.")
                            : "Informe a senha atual para liberar a nova senha."}
                      </div>
                    </div>
                    <div>
                      <Label>Nova senha</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        disabled={!isCurrentPasswordValid || isCheckingCurrentPassword}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleSubmitChangePassword}
                      disabled={isCheckingCurrentPassword || !isCurrentPasswordValid || !newPassword.trim()}
                    >
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={openUsageDeadline} onOpenChange={setOpenUsageDeadline}>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader>
                    <DialogTitle>Prazo de utilização</DialogTitle>
                    <DialogDescription>
                      Defina até quando o perfil de {usageDeadlineName || "usuário"} poderá acessar o sistema.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <Label>RGPM</Label>
                      <Input value={usageDeadlineRgpm} readOnly />
                    </div>
                    <div>
                      <Label>Data limite</Label>
                      <Input type="date" value={usageDeadlineDate} onChange={e => setUsageDeadlineDate(e.target.value)} />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Deixe em branco para remover o prazo e manter o acesso contínuo.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setUsageDeadlineDate("")}>Limpar</Button>
                    <Button onClick={handleSaveUsageDeadline} disabled={savingUsageDeadline}>
                      {savingUsageDeadline ? "Salvando..." : "Salvar prazo"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={openUsageValidityNotice} onOpenChange={setOpenUsageValidityNotice}>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader>
                    <DialogTitle>Validade do acesso</DialogTitle>
                    <DialogDescription>
                      {usageValidityNotice.renewalDays === null
                        ? `Seu acesso está válido até ${formatUsageDate(usageValidityNotice.deadline)}.`
                        : `O provedor e o banco foram renovados por ${usageValidityNotice.renewalDays} ${usageValidityNotice.renewalDays === 1 ? "dia" : "dias"}.`}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button onClick={() => setOpenUsageValidityNotice(false)}>Ok</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={openCreateUnit} onOpenChange={setOpenCreateUnit}>
                <DialogContent className="sm:max-w-[700px] rounded-2xl shadow-xl border border-border p-5 sm:p-6">
                  <DialogHeader className="border-b border-border pb-4 mb-4">
                    <DialogTitle>Criar unidade</DialogTitle>
                    <DialogDescription>Preencha os dados da unidade.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>CR</Label>
                        <div className="flex items-center gap-2">
                          <Select value={uCr || undefined} onValueChange={val => setUCr(val)}>
                            <SelectTrigger>
                              <SelectValue placeholder={crLoading ? "Carregando..." : "Selecione o CR"} />
                            </SelectTrigger>
                            <SelectContent>
                              {crList.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setAddingCr(v => {
                                const next = !v;
                                if (next) setTimeout(() => document.getElementById('new-cr-input')?.focus(), 0);
                                return next;
                              });
                            }}
                            aria-label="Adicionar CR"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {addingCr && (
                        <div className="col-span-2">
                          <div className="mt-2 flex items-center gap-2">
                            <Input id="new-cr-input" value={newCr} onChange={e => setNewCr(e.target.value)} placeholder="1º CR" />
                            <Button type="button" onClick={handleAddCr} disabled={isAddingCr} className="bg-blue-800 hover:bg-blue-700 text-white">Adicionar</Button>
                          </div>
                        </div>
                      )}
                      <div className="col-span-2">
                        <Label>Nome oficial</Label>
                        <Input value={uNome} onChange={e => setUNome(e.target.value)} />
                      </div>
                      <div>
                        <Label>Abreviação</Label>
                        <Input value={uAbbr} onChange={e => setUAbbr(e.target.value)} placeholder="Ex: 4º BPM" />
                      </div>
                      <div>
                        <Label>Tipo</Label>
                        <Select value={uTipo} onValueChange={v => setUTipo(v as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BPM">BPM</SelectItem>
                            <SelectItem value="CIPM">CIPM</SelectItem>
                            <SelectItem value="NPM">NPM</SelectItem>
                            <SelectItem value="CIAPM">CIAPM</SelectItem>
                            <SelectItem value="SEDE">SEDE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Logradouro</Label>
                        <Input value={uLogradouro} onChange={e => setULogradouro(e.target.value)} />
                      </div>
                      <div>
                        <Label>Número do endereço</Label>
                        <Input value={uNumeroEndereco} onChange={e => setUNumeroEndereco(e.target.value)} />
                      </div>
                      <div>
                        <Label>Complemento</Label>
                        <Input value={uComplemento} onChange={e => setUComplemento(e.target.value)} />
                      </div>
                      <div>
                        <Label>Bairro</Label>
                        <Input value={uBairro} onChange={e => setUBairro(e.target.value)} />
                      </div>
                      <div>
                        <Label>Cidade</Label>
                        <Input value={uCidade} onChange={e => setUCidade(e.target.value)} />
                      </div>
                      <div>
                        <Label>CEP</Label>
                        <Input value={uCep} onChange={e => setUCep(formatCep(e.target.value))} placeholder="00000-000" inputMode="numeric" maxLength={9} />
                      </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSubmitCreateUnit} className="bg-blue-800 hover:bg-blue-700 text-white shadow-md">Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>,
            document.body
          );

  return (
    <>
      {leftPortal}
      {tcoModal}
      {rightPortal}
    </>
  );
};



