import React, { useMemo, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";

interface AudienciaTabProps {
  audienciaData: string;
  setAudienciaData: (val: string) => void;
  audienciaHora: string;
  setAudienciaHora: (val: string) => void;
}

const AudienciaTab: React.FC<AudienciaTabProps> = ({ audienciaData, setAudienciaData, audienciaHora, setAudienciaHora }) => {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => {
    const m = audienciaData && audienciaData.match?.(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const dd = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10) - 1;
      const yyyy = parseInt(m[3], 10);
      return new Date(yyyy, mm, dd);
    }
    return undefined;
  }, [audienciaData]);
  return (
    <div>
      <div className="two-columns">
        <div className="form-group">
          <label htmlFor="audienciaData">Data</label>
          <div className="input-row">
            <Input
              id="audienciaData"
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              value={audienciaData}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0,8);
                const dd = v.slice(0,2);
                const mm = v.slice(2,4);
                const yyyy = v.slice(4,8);
                const formatted = [dd, mm, yyyy].filter(Boolean).join('/');
                setAudienciaData(formatted);
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
                      setAudienciaData(format(d, 'dd/MM/yyyy', { locale: ptBR }));
                      setOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="audienciaHora">Hora</label>
          <Input
            id="audienciaHora"
            type="text"
            inputMode="numeric"
            placeholder="hh:mm"
            value={audienciaHora}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0,4);
              const hh = v.slice(0,2);
              const mm = v.slice(2,4);
              const formatted = [hh, mm].filter(Boolean).join(':');
              setAudienciaHora(formatted);
            }}
            onBlur={(e) => {
              const m = e.target.value.match(/^(\d{2}):(\d{2})$/);
              if (!m) return;
              let h = parseInt(m[1], 10);
              let mi = parseInt(m[2], 10);
              if (isNaN(h) || isNaN(mi)) return;
              if (h > 23) h = 23;
              if (mi > 59) mi = 59;
              const s = `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`;
              setAudienciaHora(s);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AudienciaTab;