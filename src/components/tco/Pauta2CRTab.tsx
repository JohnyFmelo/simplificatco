import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { format, parseISO, addMinutes, isBefore, isAfter, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { obterFeriadosIntervalo, FeriadoVigente, TipoFeriado } from "@/lib/feriadosBrasil";
import { SQL_PAUTA_2CR_COMPLETO, erroPauta2crAusente, copiarTexto } from "@/lib/pauta2crSql";

type PautaSlotStatus = "DISPONIVEL" | "ALOCADO" | "BLOQUEADO";

interface PautaSlot {
  id: string;
  data_audiencia: string;
  horario: string;
  status: PautaSlotStatus;
  numero_tco_alocado: string | null;
  rgpm_condutor: string | null;
  graduacao_condutor: string | null;
  nome_guerra_condutor: string | null;
  natureza: string | null;
  unidade: string | null;
  created_at: string;
  updated_at: string;
}

type TipoFeriadoCad = "FERIADO_NACIONAL_MANUAL" | "FERIADO_LOCAL" | "PONTO_FACULTATIVO" | "EMENDA";

interface FeriadoCadastrado {
  id: string;
  data: string;
  tipo: TipoFeriadoCad;
  nome: string;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABEL: Record<PautaSlotStatus, string> = {
  DISPONIVEL: "Disponível",
  ALOCADO: "Alocado",
  BLOQUEADO: "Bloqueado",
};

const STATUS_VARIANT: Record<PautaSlotStatus, "default" | "secondary" | "outline" | "destructive"> = {
  DISPONIVEL: "default",
  ALOCADO: "secondary",
  BLOQUEADO: "outline",
};

const TIPO_FERIADO_LABEL: Record<string, string> = {
  FERIADO_NACIONAL: "Feriado Nacional",
  FERIADO_NACIONAL_MANUAL: "Feriado Nacional (manual)",
  FERIADO_MOVEL: "Feriado Móvel",
  FERIADO_ESTADUAL_MT: "Feriado Estadual — MT",
  FERIADO_LOCAL: "Feriado Local (2º CR)",
  PONTO_FACULTATIVO: "Ponto Facultativo",
  EMENDA: "Emenda de Feriado",
};

const TIPO_FERIADO_COR: Record<string, string> = {
  FERIADO_NACIONAL: "bg-red-500",
  FERIADO_NACIONAL_MANUAL: "bg-red-400",
  FERIADO_MOVEL: "bg-orange-500",
  FERIADO_ESTADUAL_MT: "bg-amber-500",
  FERIADO_LOCAL: "bg-violet-500",
  PONTO_FACULTATIVO: "bg-yellow-500",
  EMENDA: "bg-sky-500",
};

const WEEKDAYS_BR = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda-feira", short: "Seg" },
  { value: 2, label: "Terça-feira", short: "Ter" },
  { value: 3, label: "Quarta-feira", short: "Qua" },
  { value: 4, label: "Quinta-feira", short: "Qui" },
  { value: 5, label: "Sexta-feira", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
];

const toISODateOnly = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseDateOnlyInput = (v: string): Date | null => {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
};

const parseHHMM = (v: string): { h: number; m: number } | null => {
  const m = v.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return { h, m };
};

const formatoBr = (iso: string) => {
  const [a, mm, dd] = iso.split("-").map(Number);
  return `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${a}`;
};

const Pauta2CRTab: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const { toast } = useToast();
  const [slots, setSlots] = useState<PautaSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ===== Feriados / CRUD =====
  const [feriadosLocais, setFeriadosLocais] = useState<FeriadoCadastrado[]>([]);
  const [loadingFeriados, setLoadingFeriados] = useState(false);
  const [showFeriadoDialog, setShowFeriadoDialog] = useState(false);
  const [editFeriadoId, setEditFeriadoId] = useState<string | null>(null);
  const [fdData, setFdData] = useState("");
  const [fdTipo, setFdTipo] = useState<TipoFeriadoCad>("FERIADO_LOCAL");
  const [fdNome, setFdNome] = useState("");
  const [fdDesc, setFdDesc] = useState("");

  const fetchFeriadosLocais = useCallback(async () => {
    try {
      setLoadingFeriados(true);
      const { data, error } = await supabase
        .from("pautas_2cr_feriados")
        .select("*")
        .order("data", { ascending: true });
      if (error) throw error;
      setFeriadosLocais((data as FeriadoCadastrado[]) || []);
    } catch (e: any) {
      setFeriadosLocais([]);
      const msg = e?.message;
      const ausente = erroPauta2crAusente(msg, e?.details, e?.hint);
      if (ausente) {
        toastPauta2crErro(e, "Configuração faltando", "Tabela de feriados não encontrada");
      } else {
          console.warn("Feriados locais:", msg || "tabela não encontrada");
      }
    } finally {
      setLoadingFeriados(false);
    }
  }, [toastPauta2crErro]);

  const abrirNovoFeriado = () => {
    setEditFeriadoId(null);
    setFdData(toISODateOnly(new Date()));
    setFdTipo("FERIADO_LOCAL");
    setFdNome("");
    setFdDesc("");
    setShowFeriadoDialog(true);
  };

  const toastPauta2crErro = useCallback(
    (
      e: any,
      title: string,
      fallbackDescription?: string,
    ) => {
      const msg = e?.message;
      const detalhes = e?.details;
      const hint = e?.hint;
      const ausente = erroPauta2crAusente(msg, detalhes, hint);

      const description = ausente
        ? "As tabelas da Pauta 2º CR ainda não foram criadas no Supabase. Clique no botão para copiar o SQL completo, cole no Supabase → SQL Editor e execute. Depois retorne aqui."
        : msg || fallbackDescription || "Falha na operação.";

      toast({
        variant: "destructive",
        title,
        description,
        duration: 12000,
        action: ausente
          ? {
              label: "Copiar SQL (tabelas + RPC)",
              onClick: async () => {
                const ok = await copiarTexto(SQL_PAUTA_2CR_COMPLETO);
                if (ok) {
                  toast({
                    title: "SQL copiado!",
                    description: "Abra o Supabase → SQL Editor, cole e execute. Depois clique em Atualizar aqui na aba.",
                  });
                } else {
                  toast({ variant: "destructive", title: "Erro ao copiar. Copie manualmente src/lib/pauta2crSql.ts" });
                }
              },
            }
          : undefined,
      });
    },
    [toast],
  );

  const abrirEditarFeriado = (f: FeriadoCadastrado) => {
    setEditFeriadoId(f.id);
    setFdData(f.data);
    setFdTipo(f.tipo);
    setFdNome(f.nome);
    setFdDesc(f.descricao || "");
    setShowFeriadoDialog(true);
  };

  const salvarFeriado = async () => {
    if (!isAdmin) return;
    if (!fdData || !fdNome.trim()) {
      toast({ variant: "destructive", title: "Preencha a data e o nome do feriado / ponto facultativo." });
      return;
    }
    try {
      const payload = {
        data: fdData,
        tipo: fdTipo,
        nome: fdNome.trim(),
        descricao: fdDesc.trim() || null,
      };
      let err: any = null;
      if (editFeriadoId) {
        const { error } = await supabase.from("pautas_2cr_feriados").update(payload).eq("id", editFeriadoId);
        err = error;
      } else {
        const { error } = await supabase.from("pautas_2cr_feriados").insert(payload, { defaultToNull: true });
        err = error;
      }
      if (err) throw err;
      toast({ title: editFeriadoId ? "Feriado atualizado." : "Feriado adicionado." });
      setShowFeriadoDialog(false);
      void fetchFeriadosLocais();
    } catch (e: any) {
      toastPauta2crErro(e, "Erro ao salvar", "Verifique a tabela pautas_2cr_feriados.");
    }
  };

  const excluirFeriado = async (f: FeriadoCadastrado) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from("pautas_2cr_feriados").delete().eq("id", f.id);
      if (error) throw error;
      toast({ title: "Feriado excluído." });
      setFeriadosLocais(prev => prev.filter(p => p.id !== f.id));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e?.message || "Falha ao excluir." });
    }
  };

  // ===== Filtros da pauta =====
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>(() => toISODateOnly(new Date()));
  const [filtroDataFim, setFiltroDataFim] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    return toISODateOnly(d);
  });
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | PautaSlotStatus>("TODOS");

  // ===== Modal criar em massa =====
  const [cmDataInicio, setCmDataInicio] = useState("");
  const [cmDataFim, setCmDataFim] = useState("");
  const [cmHorarioInicio, setCmHorarioInicio] = useState("08:00");
  const [cmHorarioFim, setCmHorarioFim] = useState("17:00");
  const [cmIntervaloMin, setCmIntervaloMin] = useState<number>(30);
  const [cmDiasSelecionados, setCmDiasSelecionados] = useState<number[]>([1, 2, 3, 4, 5]); // seg-sex
  const [cmIgnorarFeriados, setCmIgnorarFeriados] = useState(true);
  const [cmCreating, setCmCreating] = useState(false);

  const fetchSlots = useCallback(async () => {
    try {
      setLoading(true);
      const dtI = parseDateOnlyInput(filtroDataInicio);
      const dtF = parseDateOnlyInput(filtroDataFim);
      let q = supabase.from("pautas_2cr_slots").select("*");
      if (dtI) q = q.gte("data_audiencia", toISODateOnly(startOfDay(dtI)));
      if (dtF) q = q.lte("data_audiencia", toISODateOnly(endOfDay(dtF)));
      q = q.order("data_audiencia", { ascending: true }).order("horario", { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data as PautaSlot[]) || [];
      if (filtroStatus !== "TODOS") rows = rows.filter(r => r.status === filtroStatus);
      setSlots(rows);
    } catch (e: any) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Erro ao carregar pauta",
        description: e?.message || "Verifique se a tabela pautas_2cr_slots foi criada no Supabase.",
      });
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [filtroDataInicio, filtroDataFim, filtroStatus, toast]);

  useEffect(() => {
    void fetchSlots();
    void fetchFeriadosLocais();
  }, [fetchSlots, fetchFeriadosLocais]);

  // Preview de slots e datas puladas para o modal de geração
  const preview = useMemo(() => {
    const dtI = parseDateOnlyInput(cmDataInicio);
    const dtF = parseDateOnlyInput(cmDataFim);
    const hI = parseHHMM(cmHorarioInicio);
    const hF = parseHHMM(cmHorarioFim);
    const intervalo = Number(cmIntervaloMin) || 30;
    if (!dtI || !dtF || !hI || !hF || isAfter(dtI, dtF) || intervalo < 5 || cmDiasSelecionados.length === 0) {
      return { diasConsiderados: 0, slotsGerar: 0, feriados: [] as FeriadoVigente[], skipDias: [] as { data: string; dia: string; motivos: FeriadoVigente[] }[] };
    }
    const feriadosCalc = cmIgnorarFeriados ? obterFeriadosIntervalo(dtI, dtF) : [];
    const mapFeriados: Record<string, FeriadoVigente> = {};
    for (const f of feriadosCalc) mapFeriados[f.data] = f;
    // sobrescreve por cadastrado (se existir)
    for (const f of feriadosLocais) {
      const iso = f.data;
      const dentroPeriodo =
        iso >= toISODateOnly(startOfDay(dtI)) && iso <= toISODateOnly(endOfDay(dtF));
      if (!dentroPeriodo) continue;
      if (cmIgnorarFeriados) {
        const cad: FeriadoVigente = {
          data: iso,
          nome: f.nome,
          tipo: f.tipo as TipoFeriado,
          origem: "CADASTRO_LOCAL",
          descricao: f.descricao || undefined,
        };
        const ja = mapFeriados[iso];
        if (!ja || ja.tipo === "EMENDA" || ja.tipo === "PONTO_FACULTATIVO") mapFeriados[iso] = cad;
      }
    }
    const skipDias: { data: string; dia: string; motivos: FeriadoVigente[] }[] = [];
    let diasConsiderados = 0;
    let slotsGerar = 0;
    const cursor = new Date(dtI.getFullYear(), dtI.getMonth(), dtI.getDate());
    while (!isAfter(cursor, dtF)) {
      const dow = cursor.getDay();
      const iso = toISODateOnly(cursor);
      let isFeriado = false;
      const motivos: FeriadoVigente[] = [];
      if (mapFeriados[iso]) {
        isFeriado = true;
        motivos.push(mapFeriados[iso]);
      }
      const isDwOk = cmDiasSelecionados.includes(dow);
      const considerar = isDwOk && !(cmIgnorarFeriados && isFeriado);
      if (isDwOk || isFeriado) {
        if (!considerar) {
          const d = WEEKDAYS_BR.find(w => w.value === dow)?.label || "";
          skipDias.push({ data: iso, dia: d, motivos });
        } else {
          diasConsiderados++;
          let cursorH = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hI.h, hI.m);
          const fimH = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hF.h, hF.m);
          while (!isAfter(cursorH, fimH)) {
            slotsGerar++;
            cursorH = addMinutes(cursorH, intervalo);
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    const feriadosTodos = Object.values(mapFeriados);
    return {
      diasConsiderados,
      slotsGerar,
      feriados: feriadosTodos.sort((a, b) => a.data.localeCompare(b.data)),
      skipDias: skipDias.sort((a, b) => a.data.localeCompare(b.data)),
    };
  }, [cmDataInicio, cmDataFim, cmHorarioInicio, cmHorarioFim, cmIntervaloMin, cmDiasSelecionados, cmIgnorarFeriados, feriadosLocais]);

  const resumo = useMemo(() => {
    const total = slots.length;
    const disp = slots.filter(s => s.status === "DISPONIVEL").length;
    const aloc = slots.filter(s => s.status === "ALOCADO").length;
    const bloq = slots.filter(s => s.status === "BLOQUEADO").length;
    const diasUnicos = new Set(slots.map(s => s.data_audiencia)).size;
    // Feriados no período do filtro
    const dtI = parseDateOnlyInput(filtroDataInicio);
    const dtF = parseDateOnlyInput(filtroDataFim);
    let feriadosPeriodo: FeriadoVigente[] = [];
    if (dtI && dtF) feriadosPeriodo = obterFeriadosIntervalo(dtI, dtF);
    // Sobrescreve com cadastrado
    const mapa: Record<string, FeriadoVigente> = {};
    for (const f of feriadosPeriodo) mapa[f.data] = f;
    for (const f of feriadosLocais) {
      const iso = f.data;
      if (!dtI || !dtF) continue;
      const dentro = iso >= toISODateOnly(startOfDay(dtI)) && iso <= toISODateOnly(endOfDay(dtF));
      if (!dentro) continue;
      const cad: FeriadoVigente = {
        data: iso,
        nome: f.nome,
        tipo: f.tipo as TipoFeriado,
        origem: "CADASTRO_LOCAL",
        descricao: f.descricao || undefined,
      };
      mapa[iso] = cad;
    }
    return { total, disp, aloc, bloq, diasUnicos, feriadosPeriodo: Object.values(mapa).sort((a, b) => a.data.localeCompare(b.data)) };
  }, [slots, filtroDataInicio, filtroDataFim, feriadosLocais]);

  const grouped = useMemo(() => {
    const m: Record<string, PautaSlot[]> = {};
    for (const s of slots) {
      if (!m[s.data_audiencia]) m[s.data_audiencia] = [];
      m[s.data_audiencia].push(s);
    }
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  const badgeFeriadoIso = (iso: string) => resumo.feriadosPeriodo.find(f => f.data === iso);

  const toggleSlotStatus = async (slot: PautaSlot, novoStatus: PautaSlotStatus) => {
    if (!isAdmin) return;
    if (slot.status === "ALOCADO" && novoStatus !== "ALOCADO") {
      toast({
        variant: "destructive",
        title: "Slot já alocado",
        description: "Para desalocar, use a tela de consulta do TCO ou contate o administrador do banco.",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from("pautas_2cr_slots")
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq("id", slot.id);
      if (error) throw error;
      setSlots(prev => prev.map(p => p.id === slot.id ? { ...p, status: novoStatus } : p));
      toast({ title: "Atualizado", description: `Slot ${format(parseISO(`${slot.data_audiencia}T00:00:00`), "dd/MM/yyyy")} às ${slot.horario.slice(0, 5)} → ${STATUS_LABEL[novoStatus]}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e?.message || "Falha ao atualizar." });
    }
  };

  const deleteSlot = async (slot: PautaSlot) => {
    if (!isAdmin) return;
    if (slot.status === "ALOCADO") {
      toast({ variant: "destructive", title: "Slot alocado", description: "Não é possível excluir um slot já utilizado em um TCO." });
      return;
    }
    try {
      const { error } = await supabase.from("pautas_2cr_slots").delete().eq("id", slot.id);
      if (error) throw error;
      setSlots(prev => prev.filter(p => p.id !== slot.id));
      toast({ title: "Excluído", description: "Slot removido da pauta." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e?.message || "Falha ao excluir." });
    }
  };

  const resetCreateForm = () => {
    setCmDataInicio(toISODateOnly(new Date()));
    const d = new Date();
    d.setDate(d.getDate() + 45);
    setCmDataFim(toISODateOnly(d));
    setCmHorarioInicio("08:00");
    setCmHorarioFim("17:00");
    setCmIntervaloMin(30);
    setCmDiasSelecionados([1, 2, 3, 4, 5]);
    setCmIgnorarFeriados(true);
  };

  const criarSlotsEmMassa = async () => {
    if (!isAdmin) return;
    const dtI = parseDateOnlyInput(cmDataInicio);
    const dtF = parseDateOnlyInput(cmDataFim);
    const hI = parseHHMM(cmHorarioInicio);
    const hF = parseHHMM(cmHorarioFim);
    const intervalo = Number(cmIntervaloMin) || 30;
    if (!dtI || !dtF) { toast({ variant: "destructive", title: "Datas inválidas" }); return; }
    if (!hI || !hF) { toast({ variant: "destructive", title: "Horários inválidos" }); return; }
    if (isAfter(dtI, dtF)) { toast({ variant: "destructive", title: "Datas inválidas", description: "Data inicial deve ser anterior ou igual à final." }); return; }
    if (isBefore(new Date(2000, 0, 1, hF.h, hF.m), new Date(2000, 0, 1, hI.h, hI.m))) { toast({ variant: "destructive", title: "Horários inválidos", description: "Horário final deve ser posterior ao inicial." }); return; }
    if (intervalo < 5) { toast({ variant: "destructive", title: "Intervalo muito pequeno", description: "Mínimo 5 minutos." }); return; }

    // monta mapa de feriados (calculados + cadastrados locais no período)
    const mapaFeriados: Record<string, FeriadoVigente> = {};
    if (cmIgnorarFeriados) {
      for (const f of obterFeriadosIntervalo(dtI, dtF)) mapaFeriados[f.data] = f;
    }
    if (cmIgnorarFeriados) {
      for (const f of feriadosLocais) {
        const iso = f.data;
        const dentro = iso >= toISODateOnly(startOfDay(dtI)) && iso <= toISODateOnly(endOfDay(dtF));
        if (!dentro) continue;
        const cad: FeriadoVigente = {
          data: iso,
          nome: f.nome,
          tipo: f.tipo as TipoFeriado,
          origem: "CADASTRO_LOCAL",
          descricao: f.descricao || undefined,
        };
        const ja = mapaFeriados[iso];
        if (!ja || ja.tipo === "EMENDA" || ja.tipo === "PONTO_FACULTATIVO") mapaFeriados[iso] = cad;
      }
    }

    try {
      setCmCreating(true);
      const rows: Omit<PautaSlot, "id" | "created_at" | "updated_at">[] = [];
      const cursor = new Date(dtI.getFullYear(), dtI.getMonth(), dtI.getDate());
      while (!isAfter(cursor, dtF)) {
        const dow = cursor.getDay();
        const iso = toISODateOnly(cursor);
        const isFeriado = !!mapaFeriados[iso];
        const isDwOk = cmDiasSelecionados.includes(dow);
        if (isDwOk && !(cmIgnorarFeriados && isFeriado)) {
          let cursorH = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hI.h, hI.m);
          const fimH = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hF.h, hF.m);
          while (!isAfter(cursorH, fimH)) {
            rows.push({
              data_audiencia: iso,
              horario: `${String(cursorH.getHours()).padStart(2, "0")}:${String(cursorH.getMinutes()).padStart(2, "0")}:00`,
              status: "DISPONIVEL",
              numero_tco_alocado: null,
              rgpm_condutor: null,
              graduacao_condutor: null,
              nome_guerra_condutor: null,
              natureza: null,
              unidade: null,
            });
            cursorH = addMinutes(cursorH, intervalo);
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      if (rows.length === 0) {
        toast({ title: "Nenhum slot gerado", description: "Verifique dias da semana selecionados, feriados no período e o intervalo de datas." });
        return;
      }
      if (rows.length > 5000) {
        toast({ variant: "destructive", title: "Muitos slots", description: `${rows.length} slots gerados. Reduza o período/dias para criar no máximo 5000 de uma vez.` });
        return;
      }
      // Inserção em lotes: Supabase em versões antigas pode reclamar de payloads gigantes
      const BATCH = 800;
      for (let i = 0; i < rows.length; i += BATCH) {
        const lote = rows.slice(i, i + BATCH);
        const { error } = await supabase.from("pautas_2cr_slots").insert(lote as any, { defaultToNull: true });
        if (error) throw error;
      }
      toast({ title: "Slots gerados", description: `${rows.length} horários foram adicionados à pauta. ${preview.skipDias.length ? `Pulamos ${preview.skipDias.length} dia(s) por ser(em) feriado(s).` : ""}` });
      setShowCreateModal(false);
      resetCreateForm();
      void fetchSlots();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao gerar pauta", description: e?.message || "Falha na inserção em massa." });
    } finally {
      setCmCreating(false);
    }
  };

  const limparSlotsDisponiveis = async () => {
    if (!isAdmin) return;
    const dtI = parseDateOnlyInput(filtroDataInicio);
    const dtF = parseDateOnlyInput(filtroDataFim);
    if (!dtI || !dtF) { toast({ variant: "destructive", title: "Informe datas de início e fim no filtro." }); return; }
    const ok = window.confirm(`⚠️  Isso excluirá TODOS os slots com status "Disponível" entre ${format(dtI, "dd/MM/yyyy")} e ${format(dtF, "dd/MM/yyyy")}. Continuar?`);
    if (!ok) return;
    try {
      const { error } = await supabase
        .from("pautas_2cr_slots")
        .delete()
        .gte("data_audiencia", toISODateOnly(dtI))
        .lte("data_audiencia", toISODateOnly(dtF))
        .eq("status", "DISPONIVEL");
      if (error) throw error;
      toast({ title: "Slots disponíveis removidos do período." });
      void fetchSlots();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e?.message || "Falha ao limpar." });
    }
  };

  const diaLabel = (iso: string) => {
    const d = parseISO(`${iso}T00:00:00`);
    const wd = WEEKDAYS_BR.find(w => w.value === d.getDay())?.label || "";
    const bf = badgeFeriadoIso(iso);
    return {
      header: `${format(d, "dd/MM/yyyy", { locale: ptBR })} · ${wd}`,
      feriado: bf,
    };
  };

  return (
    <div className="space-y-4">
      {/* ===== Card 1: Pauta ===== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <i className="fas fa-calendar-day text-blue-800"></i>
                Planilha de Pautas — 2º Comando Regional
              </CardTitle>
              <CardDescription>
                Gerencie os horários de audiência disponíveis para alocação automática de Nº TCO.
              </CardDescription>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => { resetCreateForm(); setShowCreateModal(true); }} className="bg-blue-800 hover:bg-blue-900">
                  <i className="fas fa-plus mr-2"></i> Gerar Pauta em Massa
                </Button>
                <Button variant="outline" onClick={abrirNovoFeriado}>
                  <i className="fas fa-calendar-plus mr-2"></i> + Feriado / Ponto Facultativo
                </Button>
                <Button variant="outline" onClick={limparSlotsDisponiveis} className="text-red-700 hover:text-red-800">
                  <i className="fas fa-broom mr-2"></i> Limpar Disponíveis
                </Button>
                <Button variant="secondary" onClick={() => { void fetchSlots(); void fetchFeriadosLocais(); }}>
                  <i className="fas fa-sync-alt mr-2"></i> Atualizar
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-4">
            <div className="rounded-md bg-slate-50 border p-3">
              <div className="text-xs text-slate-500">Dias únicos (filtro)</div>
              <div className="text-2xl font-bold text-slate-800">{resumo.diasUnicos}</div>
            </div>
            <div className="rounded-md bg-slate-50 border p-3">
              <div className="text-xs text-slate-500">Total de horários</div>
              <div className="text-2xl font-bold text-slate-800">{resumo.total}</div>
            </div>
            <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3">
              <div className="text-xs text-emerald-700">Disponíveis</div>
              <div className="text-2xl font-bold text-emerald-700">{resumo.disp}</div>
            </div>
            <div className="rounded-md bg-indigo-50 border border-indigo-100 p-3">
              <div className="text-xs text-indigo-700">Alocados</div>
              <div className="text-2xl font-bold text-indigo-700">{resumo.aloc}</div>
            </div>
            <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
              <div className="text-xs text-gray-600">Bloqueados</div>
              <div className="text-2xl font-bold text-gray-700">{resumo.bloq}</div>
            </div>
            <div className="rounded-md bg-red-50 border border-red-100 p-3">
              <div className="text-xs text-red-700 flex items-center gap-1"><i className="fas fa-umbrella-beach"></i> Feriados no Período</div>
              <div className="text-2xl font-bold text-red-700">{resumo.feriadosPeriodo.length}</div>
            </div>
          </div>

          {resumo.feriadosPeriodo.length > 0 && (
            <div className="mt-4 rounded-md border border-red-100 bg-red-50/50 p-3">
              <div className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                <i className="fas fa-umbrella-beach"></i> Feriados / Pontos Facultativos detectados no período do filtro
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-auto pr-1">
                {resumo.feriadosPeriodo.map(f => (
                  <Badge key={`${f.data}-${f.origem}`} className="text-xs bg-white border">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 ${TIPO_FERIADO_COR[f.tipo] || "bg-gray-400"}`}></span>
                    <span className="font-mono text-slate-700">{formatoBr(f.data)}</span>
                    <span className="text-slate-500 mx-1.5">·</span>
                    <span>{f.nome}</span>
                    <span className="text-slate-500 mx-1.5">·</span>
                    <span className="text-slate-600 text-[10px] uppercase tracking-wide">{TIPO_FERIADO_LABEL[f.tipo] || f.tipo}</span>
                    {f.origem === "CADASTRO_LOCAL" && (
                      <span className="ml-1.5 text-[10px] bg-violet-100 text-violet-800 rounded px-1.5">LOCAL</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div>
              <Label htmlFor="filtro-dti">Período — Data Início</Label>
              <Input id="filtro-dti" type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="filtro-dtf">Período — Data Fim</Label>
              <Input id="filtro-dtf" type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="filtro-st">Status</Label>
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
                <SelectTrigger id="filtro-st">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                  <SelectItem value="ALOCADO">Alocado</SelectItem>
                  <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[58vh] w-full rounded-md border p-2">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <i className="fas fa-spinner fa-spin mr-2"></i> Carregando pauta...
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2 text-center">
                <i className="fas fa-calendar-xmark text-5xl text-slate-300 mb-2"></i>
                <div className="text-lg font-semibold">Nenhum horário na pauta para o período selecionado.</div>
                <div className="max-w-xl">
                  Clique em <b>Gerar Pauta em Massa</b> para cadastrar os dias e horários de audiência do 2º CR.
                  Sem horários cadastrados, o botão <b>🎯 Gerar Nº TCO</b> retornará "Não há vagas livres".
                </div>
              </div>
            ) : (
              <div className="space-y-5 pr-3">
                {grouped.map(([data, lista]) => {
                  const info = diaLabel(data);
                  return (
                    <div key={data}>
                      <div className="sticky top-0 bg-slate-100 px-3 py-2 rounded-md mb-2 -mx-1 flex flex-wrap items-center gap-2 justify-between">
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          <i className="fas fa-calendar text-blue-800"></i>
                          {info.header}
                          {info.feriado && (
                            <Badge className="bg-white border text-slate-700">
                              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${TIPO_FERIADO_COR[info.feriado.tipo] || "bg-gray-400"}`}></span>
                              <span className="font-bold">{TIPO_FERIADO_LABEL[info.feriado.tipo] || info.feriado.tipo}</span>
                              <span className="mx-1.5 text-slate-400">·</span>
                              <span>{info.feriado.nome}</span>
                              {info.feriado.origem === "CADASTRO_LOCAL" && (
                                <span className="ml-1.5 text-[10px] bg-violet-100 text-violet-800 rounded px-1.5">LOCAL</span>
                              )}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-600">
                          {lista.filter(s => s.status === "DISPONIVEL").length} de {lista.length} disponíveis
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {lista.map(s => (
                          <div key={s.id} className="rounded-md border bg-white p-3 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-lg font-bold text-slate-900">{s.horario.slice(0, 5)}</div>
                                <Badge variant={STATUS_VARIANT[s.status] as any} className="mt-1">
                                  {STATUS_LABEL[s.status]}
                                </Badge>
                              </div>
                              {isAdmin && (
                                <div className="flex items-center gap-1">
                                  {s.status === "DISPONIVEL" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Marcar como bloqueado"
                                      className="h-8 px-2 text-gray-600 hover:text-orange-700"
                                      onClick={() => toggleSlotStatus(s, "BLOQUEADO")}
                                    >
                                      <i className="fas fa-ban"></i>
                                    </Button>
                                  )}
                                  {s.status === "BLOQUEADO" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Desbloquear"
                                      className="h-8 px-2 text-gray-600 hover:text-emerald-700"
                                      onClick={() => toggleSlotStatus(s, "DISPONIVEL")}
                                    >
                                      <i className="fas fa-check"></i>
                                    </Button>
                                  )}
                                  {s.status !== "ALOCADO" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Excluir horário"
                                      className="h-8 px-2 text-gray-600 hover:text-red-700"
                                      onClick={() => deleteSlot(s)}
                                    >
                                      <i className="fas fa-trash"></i>
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                            {s.status === "ALOCADO" && (
                              <div className="mt-2 text-xs text-slate-600 space-y-1 border-t pt-2">
                                <div>
                                  <b>Nº TCO:</b> <span className="font-mono text-slate-900">{s.numero_tco_alocado || "—"}</span>
                                </div>
                                {s.graduacao_condutor || s.nome_guerra_condutor ? (
                                  <div>
                                    <b>Condutor:</b>{" "}
                                    <span className="text-slate-900">
                                      {[s.graduacao_condutor, s.nome_guerra_condutor].filter(Boolean).join(" ")}
                                      {s.rgpm_condutor ? ` (RGPM ${s.rgpm_condutor})` : ""}
                                    </span>
                                  </div>
                                ) : null}
                                {s.unidade ? (
                                  <div><b>Unidade:</b> <span className="text-slate-900">{s.unidade}</span></div>
                                ) : null}
                                {s.natureza ? (
                                  <div><b>Natureza:</b> <span className="text-slate-900">{s.natureza}</span></div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ===== Card 2: Feriados / Pontos Facultativos cadastrados ===== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <i className="fas fa-umbrella-beach text-red-700"></i>
                Feriados Locais e Pontos Facultativos (2º CR)
              </CardTitle>
              <CardDescription>
                Cadastre feriados municipais/regionais, pontos facultativos por portaria ou emendas de feriados específicas do 2º CR que não entram no cálculo nacional.
              </CardDescription>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button onClick={abrirNovoFeriado} variant="outline">
                  <i className="fas fa-plus mr-2"></i> Incluir Feriado / Ponto
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[36vh] w-full rounded-md border p-2">
            {loadingFeriados ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <i className="fas fa-spinner fa-spin mr-2"></i> Carregando...
              </div>
            ) : feriadosLocais.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-center gap-2">
                <i className="fas fa-calendar-day text-4xl text-slate-300 mb-1"></i>
                <div><b>Nenhum feriado local cadastrado ainda.</b></div>
                <div className="max-w-md text-sm">
                  Os feriados nacionais e estaduais de MT são calculados automaticamente. Use essa lista para cadastrar a festa da padroeira do município, portarias de ponto facultativo e emendas de datas específicas do 2º CR.
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs uppercase tracking-wide sticky top-0 bg-white">
                  <tr>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-left px-3 py-2">Tipo</th>
                    <th className="text-left px-3 py-2">Nome</th>
                    <th className="text-left px-3 py-2">Descrição</th>
                    {isAdmin && <th className="text-right px-3 py-2">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {feriadosLocais.map(f => (
                    <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <span className="font-mono font-semibold text-slate-800">{formatoBr(f.data)}</span>
                        <span className="ml-2 text-xs text-slate-500">
                          ({WEEKDAYS_BR.find(w => w.value === new Date(`${f.data}T00:00:00`).getDay())?.short})
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${TIPO_FERIADO_COR[f.tipo] || "bg-gray-400"}`}></span>
                          <span>{TIPO_FERIADO_LABEL[f.tipo] || f.tipo}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{f.nome}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[300px] truncate">{f.descricao || "—"}</td>
                      {isAdmin && (
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-700 hover:text-blue-800" onClick={() => abrirEditarFeriado(f)}>
                            <i className="fas fa-pencil-alt"></i>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-red-700 hover:text-red-800" onClick={() => excluirFeriado(f)}>
                            <i className="fas fa-trash"></i>
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ===== Dialog: Novo/Editar Feriado ===== */}
      <Dialog open={showFeriadoDialog} onOpenChange={(o) => !o && setShowFeriadoDialog(false)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {editFeriadoId ? "✏️ Editar Data Especial" : "➕ Incluir Feriado / Ponto Facultativo"}
            </DialogTitle>
            <DialogDescription>
              Use esse cadastro para datas que o cálculo nacional/estadual não detectou automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div>
              <Label htmlFor="fd-data">Data</Label>
              <Input id="fd-data" type="date" value={fdData} onChange={e => setFdData(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fd-tipo">Tipo</Label>
              <Select value={fdTipo} onValueChange={(v) => setFdTipo(v as any)}>
                <SelectTrigger id="fd-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FERIADO_LOCAL">Feriado Local (município/unidade)</SelectItem>
                  <SelectItem value="FERIADO_NACIONAL_MANUAL">Feriado Nacional (manual)</SelectItem>
                  <SelectItem value="PONTO_FACULTATIVO">Ponto Facultativo (portaria)</SelectItem>
                  <SelectItem value="EMENDA">Emenda de Feriado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="fd-nome">Nome / Motivo</Label>
              <Input id="fd-nome" value={fdNome} placeholder="Ex: Nossa Senhora da Guia — Várzea Grande/MT" onChange={e => setFdNome(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="fd-desc">Descrição / Observação (opcional)</Label>
              <Input id="fd-desc" value={fdDesc} placeholder="Ex: Suspende pauta; determinação da chefia do 2º CR, portaria Nº 123/2026." onChange={e => setFdDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button className="bg-blue-800 hover:bg-blue-900" onClick={salvarFeriado}>
              <i className="fas fa-save mr-2"></i> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog: Gerar Pauta em Massa ===== */}
      <Dialog open={showCreateModal} onOpenChange={(open) => { if (!open) { setShowCreateModal(false); resetCreateForm(); } else { setShowCreateModal(true); } }}>
        <DialogContent className="sm:max-w-[920px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>⚙️ Gerar Pauta em Massa — 2º CR</DialogTitle>
            <DialogDescription>
              Gere automaticamente múltiplos horários de audiência para o período, intervalo e dias de semana selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="md:col-span-2 p-3 rounded-md bg-blue-50/60 border border-blue-100 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <Switch id="cm-ignora-feriados" checked={cmIgnorarFeriados} onCheckedChange={(c) => setCmIgnorarFeriados(Boolean(c))} />
                <Label htmlFor="cm-ignora-feriados" className="cursor-pointer">
                  <b className="text-blue-900">Ignorar feriados nacionais, estaduais, locais e pontos facultativos</b>
                  <span className="block text-xs text-blue-800/80">Quando LIGADO, o sistema NÃO gera slots em dias considerados feriado/pontos facultativos. Desligue apenas em portaria excepcional de atendimento especial.</span>
                </Label>
              </div>
            </div>

            <div>
              <Label htmlFor="cm-dti">Data inicial</Label>
              <Input id="cm-dti" type="date" value={cmDataInicio} onChange={e => setCmDataInicio(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cm-dtf">Data final</Label>
              <Input id="cm-dtf" type="date" value={cmDataFim} onChange={e => setCmDataFim(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cm-hi">Horário de início (1º horário do dia)</Label>
              <Input id="cm-hi" type="time" value={cmHorarioInicio} onChange={e => setCmHorarioInicio(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cm-hf">Horário final (último horário do dia)</Label>
              <Input id="cm-hf" type="time" value={cmHorarioFim} onChange={e => setCmHorarioFim(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cm-int">Intervalo entre horários (minutos)</Label>
              <Select value={String(cmIntervaloMin)} onValueChange={(v) => setCmIntervaloMin(Number(v))}>
                <SelectTrigger id="cm-int"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 minutos</SelectItem>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="20">20 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">60 minutos (1 hora)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Dias da semana para incluir</Label>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mt-2">
                {WEEKDAYS_BR.map(wd => (
                  <label key={wd.value} className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-slate-50">
                    <Checkbox
                      checked={cmDiasSelecionados.includes(wd.value)}
                      onCheckedChange={(c) => {
                        const b = Boolean(c);
                        setCmDiasSelecionados(prev => b ? [...prev, wd.value] : prev.filter(v => v !== wd.value));
                      }}
                    />
                    <span className="text-sm">{wd.short}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="md:col-span-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-md bg-slate-50 border p-3">
                  <div className="text-xs text-slate-500">Dias válidos selecionados</div>
                  <div className="text-2xl font-bold text-slate-800">{preview.diasConsiderados}</div>
                </div>
                <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3">
                  <div className="text-xs text-emerald-700">Slots a serem gerados</div>
                  <div className="text-2xl font-bold text-emerald-700">{preview.slotsGerar.toLocaleString("pt-BR")}</div>
                </div>
                <div className="rounded-md bg-red-50 border border-red-100 p-3">
                  <div className="text-xs text-red-700">Dias pulados (feriados etc.)</div>
                  <div className="text-2xl font-bold text-red-700">{preview.skipDias.length}</div>
                </div>
                <div className="rounded-md bg-amber-50 border border-amber-100 p-3">
                  <div className="text-xs text-amber-700">Feriados no período</div>
                  <div className="text-2xl font-bold text-amber-700">{preview.feriados.length}</div>
                </div>
              </div>
            </div>

            <Separator className="md:col-span-2 my-2" />

            {/* Lista dias pulados */}
            <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="border rounded-md p-3">
                <div className="font-semibold text-xs uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-2">
                  <i className="fas fa-calendar-xmark text-red-600"></i>
                  Dias que SERÃO PULADOS
                  {!cmIgnorarFeriados && (
                    <Badge variant="outline" className="text-[10px] ml-1 border-amber-300 text-amber-700">
                      Lista está vazia (ignora feriados = DESLIGADO)
                    </Badge>
                  )}
                </div>
                <ScrollArea className="h-48">
                  {preview.skipDias.length === 0 ? (
                    <div className="text-sm text-slate-500 py-6 text-center">
                      {cmIgnorarFeriados ? "Nenhum dia será pulado — todos os dias selecionados e dentro do período são úteis e sem feriados." : "Opção desligada: nenhum dia será pulado por ser feriado."}
                    </div>
                  ) : (
                    <ul className="space-y-2 pr-2">
                      {preview.skipDias.map(sd => (
                        <li key={sd.data} className="flex items-start justify-between gap-3 rounded border border-red-100 bg-red-50/60 p-2">
                          <div>
                            <div className="font-mono font-semibold text-slate-800">{formatoBr(sd.data)}</div>
                            <div className="text-xs text-slate-600">{sd.dia}</div>
                          </div>
                          <div className="text-right max-w-[65%]">
                            {sd.motivos.length === 0 ? (
                              <Badge variant="outline" className="bg-white border-slate-300 text-slate-700 text-[10px]">Dia fora da seleção de dias da semana</Badge>
                            ) : (
                              sd.motivos.map(mo => (
                                <div key={mo.nome} className="text-xs text-slate-700 mb-0.5 text-right">
                                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${TIPO_FERIADO_COR[mo.tipo] || "bg-gray-400"}`}></span>
                                  {TIPO_FERIADO_LABEL[mo.tipo] || mo.tipo} · {mo.nome}
                                  {mo.origem === "CADASTRO_LOCAL" && (
                                    <span className="ml-1 text-[10px] bg-violet-100 text-violet-800 rounded px-1.5 align-middle">LOCAL</span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </div>

              {/* Lista feriados */}
              <div className="border rounded-md p-3">
                <div className="font-semibold text-xs uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-2">
                  <i className="fas fa-list-check text-amber-600"></i>
                  Calendário de Feriados — Período selecionado
                </div>
                <ScrollArea className="h-48">
                  {preview.feriados.length === 0 ? (
                    <div className="text-sm text-slate-500 py-6 text-center">Nenhum feriado ou ponto facultativo detectado no intervalo informado.</div>
                  ) : (
                    <ul className="space-y-1.5 pr-2">
                      {preview.feriados.map(f => (
                        <li key={`${f.data}-${f.nome}`} className="flex items-start justify-between gap-3 rounded border border-amber-100 bg-amber-50/50 p-2">
                          <div className="min-w-[110px]">
                            <div className="font-mono font-semibold text-slate-800">{formatoBr(f.data)}</div>
                            <div className="inline-flex items-center gap-1.5 mt-0.5 text-xs">
                              <span className={`inline-block w-2 h-2 rounded-full ${TIPO_FERIADO_COR[f.tipo] || "bg-gray-400"}`}></span>
                              <span className="text-slate-600">{TIPO_FERIADO_LABEL[f.tipo] || f.tipo}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-800">{f.nome}</div>
                            {f.descricao && <div className="text-xs text-slate-600">{f.descricao}</div>}
                            {f.origem === "CADASTRO_LOCAL" && (
                              <Badge className="mt-1 text-[10px] bg-violet-100 text-violet-800 border-violet-200">CADASTRADO MANUALMENTE</Badge>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between mt-3">
            <Button variant="ghost" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>
              Cancelar
            </Button>
            <Button
              className="bg-blue-800 hover:bg-blue-900"
              onClick={criarSlotsEmMassa}
              disabled={cmCreating || preview.slotsGerar === 0}
            >
              {cmCreating ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i> Gerando...</>
              ) : (
                <><i className="fas fa-bolt mr-2"></i> Confirmar e Gerar {preview.slotsGerar > 0 ? `(${preview.slotsGerar.toLocaleString("pt-BR")} horários)` : ""}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pauta2CRTab;
