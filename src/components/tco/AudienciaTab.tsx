import React, { useMemo, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";

interface AudienciaTabProps {
  tcoNumber: string;
  setTcoNumber: (val: string) => void;
  audienciaData: string;
  setAudienciaData: (val: string) => void;
  audienciaHora: string;
  setAudienciaHora: (val: string) => void;
  setStartTimestamp?: () => void;
  readonlyCampos: boolean;
}

const AudienciaTab: React.FC<AudienciaTabProps> = ({
  tcoNumber,
  setTcoNumber,
  audienciaData,
  setAudienciaData,
  audienciaHora,
  setAudienciaHora,
  setStartTimestamp,
  readonlyCampos,
}) => {
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
      <div className="three-columns">
        <div className="form-group">
          <label htmlFor="audienciaTcoNumber">N° do TCO <span className="text-red-500">*</span></label>
          <Input
            id="audienciaTcoNumber"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder={readonlyCampos ? "" : "Número do TCO"}
            value={tcoNumber}
            readOnly={readonlyCampos}
            disabled={readonlyCampos}
            className={readonlyCampos ? "bg-gray-100 text-gray-800 font-semibold cursor-not-allowed" : ""}
            onChange={(e) => {
              if (readonlyCampos) return;
              const value = e.target.value.replace(/\D/g, '');
              setTcoNumber(value);
              if (value.length > 0 && setStartTimestamp) {
                setStartTimestamp();
              }
            }}
          />
        </div>
        <div className="form-group">
          <label htmlFor="audienciaData">Data da Audiência <span className="text-red-500">*</span></label>
          <div className="input-row">
            <Input
              id="audienciaData"
              type="text"
              inputMode="numeric"
              placeholder={readonlyCampos ? "" : "dd/mm/aaaa"}
              value={audienciaData}
              readOnly={readonlyCampos}
              disabled={readonlyCampos}
              className={readonlyCampos ? "bg-gray-100 text-gray-800 font-semibold cursor-not-allowed" : ""}
              onChange={(e) => {
                if (readonlyCampos) return;
                const v = e.target.value.replace(/\D/g, '').slice(0,8);
                const dd = v.slice(0,2);
                const mm = v.slice(2,4);
                const yyyy = v.slice(4,8);
                const formatted = [dd, mm, yyyy].filter(Boolean).join('/');
                setAudienciaData(formatted);
              }}
            />
            <Popover open={readonlyCampos ? false : open} onOpenChange={(next) => !readonlyCampos && setOpen(next)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`icon-button ${readonlyCampos ? "cursor-not-allowed opacity-50 pointer-events-none" : ""}`}
                  aria-label="Abrir calendário"
                  disabled={readonlyCampos}
                  tabIndex={readonlyCampos ? -1 : 0}
                >
                  <i className={`fas fa-calendar-alt ${readonlyCampos ? "text-gray-400" : ""}`}></i>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  disabled={readonlyCampos}
                  onSelect={(d) => {
                    if (readonlyCampos) return;
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
          <label htmlFor="audienciaHora">Horário da Audiência <span className="text-red-500">*</span></label>
          <Input
            id="audienciaHora"
            type="text"
            inputMode="numeric"
            placeholder={readonlyCampos ? "" : "hh:mm"}
            value={audienciaHora}
            readOnly={readonlyCampos}
            disabled={readonlyCampos}
            className={readonlyCampos ? "bg-gray-100 text-gray-800 font-semibold cursor-not-allowed" : ""}
            onChange={(e) => {
              if (readonlyCampos) return;
              const v = e.target.value.replace(/\D/g, '').slice(0,4);
              const hh = v.slice(0,2);
              const mm = v.slice(2,4);
              const formatted = [hh, mm].filter(Boolean).join(':');
              setAudienciaHora(formatted);
            }}
            onBlur={(e) => {
              if (readonlyCampos) return;
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
