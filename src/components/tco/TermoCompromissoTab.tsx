import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TermoCompromissoTabProps {
  juizadoEspecialData: string;
  setJuizadoEspecialData: (value: string) => void;
  juizadoEspecialHora: string;
  setJuizadoEspecialHora: (value: string) => void;
}

const TermoCompromissoTab: React.FC<TermoCompromissoTabProps> = ({
  juizadoEspecialData,
  setJuizadoEspecialData,
  juizadoEspecialHora,
  setJuizadoEspecialHora,
}) => {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => {
    const m = juizadoEspecialData && juizadoEspecialData.match?.(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const dd = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10) - 1;
      const yyyy = parseInt(m[3], 10);
      return new Date(yyyy, mm, dd);
    }
    return undefined;
  }, [juizadoEspecialData]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Termo de Compromisso</CardTitle>
        <CardDescription>Apresentação em Juizado Especial VG</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="juizadoData">Data</Label>
            <div className="input-row">
              <Input
                id="juizadoData"
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={juizadoEspecialData}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0,8);
                  const dd = v.slice(0,2);
                  const mm = v.slice(2,4);
                  const yyyy = v.slice(4,8);
                  const formatted = [dd, mm, yyyy].filter(Boolean).join('/');
                  setJuizadoEspecialData(formatted);
                }}
              />
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="icon-button" aria-label="Abrir calendário"><i className="fas fa-calendar-alt"></i></button>
                </PopoverTrigger>
                <PopoverContent align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      if (d) {
                        setJuizadoEspecialData(format(d, 'dd/MM/yyyy', { locale: ptBR }));
                        setOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="juizadoHora">Hora</Label>
            <Input
              id="juizadoHora"
              type="time"
              lang="pt-BR"
              value={juizadoEspecialHora}
              onChange={(e) => setJuizadoEspecialHora(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TermoCompromissoTab;