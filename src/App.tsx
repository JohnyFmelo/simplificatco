import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPortal } from "react-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <HeaderActions />
        <InactivityGuard />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

const HeaderActions = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === "/login";
  const { toast } = useToast();
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openCreateUnit, setOpenCreateUnit] = React.useState(false);
  const [openViewProfiles, setOpenViewProfiles] = React.useState(false);
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
  const storedNivel = (localStorage.getItem("nivel_acesso") || sessionStorage.getItem("nivel_acesso") || "").trim();
  const isAdmin = storedNivel === "Administrador";
  const isStandard = storedNivel === "Padrão";
  const storedRgpm = (localStorage.getItem("rgpm") || sessionStorage.getItem("rgpm") || "").trim();
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
  const [profiles, setProfiles] = React.useState<{ rgpm: string; nome: string; graduacao?: string; unidade?: string; nivel?: string }[]>([]);
  const [profilesLoading, setProfilesLoading] = React.useState(false);
  const [profilesSearch, setProfilesSearch] = React.useState("");
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
        const { data } = await supabase
          .from("usuarios_login" as any)
          .select("nivel_acesso")
          .eq("rgpm", current)
          .limit(1);
        const row = data && data[0];
        if (!row || String(row.nivel_acesso).trim() === "Bloqueado") {
          handleLogout();
        }
      } catch {}
    };
    checkAccess();
    timer = setInterval(checkAccess, 10000);
    return () => { if (timer) clearInterval(timer); };
  }, []);

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
      // First, verify the current password
      const { data: currentUser, error: selectError } = await supabase
        .from("usuarios_login" as any)
        .select("senha, rgpm")
        .eq("rgpm", storedRgpm)
        .maybeSingle();
      
      if (selectError) throw selectError;
      
      if (!currentUser || (currentUser as any).senha?.trim() !== baseOld) {
        toast({ variant: "destructive", title: "Senha incorreta", description: "A senha atual está incorreta." });
        return;
      }
      
      // Now update the password
      const { error: updateError } = await supabase
        .from("usuarios_login" as any)
        .update({ senha: baseNew })
        .eq("rgpm", storedRgpm);
        
      if (updateError) throw updateError;
      
      toast({ title: "Senha alterada", description: "Sua senha foi atualizada com sucesso." });
      setOpenChangePassword(false);
      setOldPassword("");
      setNewPassword("");
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
          nivel_acesso: (nivelAcesso.trim() === "Administrador" ? "Administrador" : "Operacional"),
        }, { onConflict: "rgpm" });
      if (e2) throw e2;
      toast({ title: "Perfil criado", description: "Dados inseridos com sucesso." });
      setOpenCreate(false);
      setNivelAcesso("Operador");
      setCr(""); setUnidade(""); setRgpm(""); setGraduacao(""); setNome(""); setCpf(""); setTelefone(""); setNaturalidade(""); setPai(""); setMae(""); setSenha("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao criar perfil", description: e?.message || String(e) });
    }
  };

          if (isLogin) return null;
          return createPortal(
            <div className="fixed top-2 right-2 sm:top-3 sm:right-4 z-[100] pointer-events-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Configurações" className="h-9 w-9 rounded-xl border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white/90 backdrop-blur-sm shadow-lg">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(isAdmin || isStandard) && <DropdownMenuItem onClick={() => setOpenCreate(true)}>Criar perfil</DropdownMenuItem>}
                  {(isAdmin || isStandard) && <DropdownMenuItem onClick={() => { setOpenViewProfiles(true); loadProfiles(); }}>Ver perfis</DropdownMenuItem>}
                  {isAdmin && <DropdownMenuItem onClick={() => setOpenCreateUnit(true)}>Criar unidade</DropdownMenuItem>}
                  <DropdownMenuItem onClick={() => setOpenChangePassword(true)}>Alterar senha</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>Sair</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="sm:max-w-[700px]">
                  <DialogHeader>
                    <DialogTitle>Criar perfil</DialogTitle>
                    <DialogDescription>Preencha os dados do policial e acesso.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 max-h-[70vh] overflow-y-auto">
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
                  <DialogFooter>
                    <Button onClick={handleSubmitCreate}>Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={openViewProfiles} onOpenChange={setOpenViewProfiles}>
                <DialogContent className="sm:max-w-[800px]">
                  <DialogHeader>
                    <DialogTitle>Perfis</DialogTitle>
                    <DialogDescription>Lista de perfis cadastrados.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input placeholder="Buscar por nome ou RGPM" value={profilesSearch} onChange={e => setProfilesSearch(e.target.value)} />
                      <Button variant="outline" onClick={loadProfiles} disabled={profilesLoading}>Atualizar</Button>
                    </div>
                    <div className="overflow-auto max-h-[50vh]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left p-2">RGPM</th>
                            <th className="text-left p-2">Nome</th>
                            <th className="text-left p-2">Graduação</th>
                            <th className="text-left p-2">Unidade</th>
                            <th className="text-left p-2">Nível</th>
                            <th className="text-left p-2">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(profiles.filter(p => {
                            const q = profilesSearch.trim().toLowerCase();
                            if (!q) return true;
                            return p.rgpm.toLowerCase().includes(q) || p.nome.toLowerCase().includes(q);
                          })).map(p => (
                            <tr key={p.rgpm} className="border-t">
                              <td className="p-2">{p.rgpm}</td>
                              <td className="p-2">{p.nome}</td>
                              <td className="p-2">{p.graduacao || '-'}</td>
                              <td className="p-2">{p.unidade || '-'}</td>
                              <td className="p-2">{p.nivel || '-'}</td>
                              <td className="p-2 flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleEditProfile(p)} disabled={!isAdmin}>Editar</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleBlockProfile(p.rgpm)} disabled={!isAdmin}>Bloquear</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteProfile(p.rgpm)} disabled={!isAdmin}>Excluir</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {profilesLoading && <div className="p-3 text-center text-muted-foreground">Carregando...</div>}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={openChangePassword} onOpenChange={setOpenChangePassword}>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader>
                    <DialogTitle>Alterar senha</DialogTitle>
                    <DialogDescription>Informe sua senha atual e a nova senha.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <Label>Senha atual</Label>
                      <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                    </div>
                    <div>
                      <Label>Nova senha</Label>
                      <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSubmitChangePassword}>Salvar</Button>
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
};

const InactivityGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  React.useEffect(() => {
    let timer: number | undefined;
    const timeoutMs = 10 * 60 * 1000;
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "visibilitychange"];

    const reset = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        try {
          localStorage.removeItem("rgpm");
          sessionStorage.removeItem("rgpm");
          localStorage.removeItem("nivel_acesso");
          sessionStorage.removeItem("nivel_acesso");
        } finally {
          navigate("/login");
        }
      }, timeoutMs);
    };

    if (!isLogin) {
      events.forEach((e) => window.addEventListener(e, reset));
      reset();
    }

    return () => {
      if (timer) window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [navigate, isLogin]);

  return null;
};
  const loadProfiles = async () => {
    try {
      setProfilesLoading(true);
      const [officers, logins] = await Promise.all([
        supabase.from("police_officers").select("rgpm,nome_completo,graduacao"),
        supabase.from("usuarios_login" as any).select("rgpm,unidade,nivel_acesso"),
      ]);
      const mapLogin = new Map<string, { unidade?: string; nivel?: string }>();
      if (logins.data) {
        logins.data.forEach((r: any) => {
          mapLogin.set(String(r.rgpm), { unidade: r.unidade, nivel: r.nivel_acesso });
        });
      }
      const rows: { rgpm: string; nome: string; graduacao?: string; unidade?: string; nivel?: string }[] = (officers.data || []).map((o: any) => {
        const l = mapLogin.get(String(o.rgpm));
        return { rgpm: String(o.rgpm), nome: String(o.nome_completo || ""), graduacao: o.graduacao, unidade: l?.unidade, nivel: l?.nivel };
      });
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
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from("usuarios_login" as any).delete().eq("rgpm", targetRgpm),
        supabase.from("police_officers").delete().eq("rgpm", targetRgpm),
      ]);
      if (e1) throw e1; if (e2) throw e2;
      if (storedRgpm === targetRgpm) handleLogout();
      toast({ title: "Perfil excluído" });
      await loadProfiles();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: e?.message || String(e) });
    }
  };

  const handleEditProfile = (p: { rgpm: string; nome: string; graduacao?: string; unidade?: string; nivel?: string }) => {
    setRgpm(p.rgpm);
    setNome(p.nome);
    setGraduacao(p.graduacao || "");
    setUnidade(p.unidade || "");
    setNivelAcesso(p.nivel || "Operador");
    setOpenCreate(true);
  };
