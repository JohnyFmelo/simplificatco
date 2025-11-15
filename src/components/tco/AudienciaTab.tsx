import React from "react";

interface AudienciaTabProps {
  audienciaData: string;
  setAudienciaData: (val: string) => void;
  audienciaHora: string;
  setAudienciaHora: (val: string) => void;
}

const AudienciaTab: React.FC<AudienciaTabProps> = ({ audienciaData, setAudienciaData, audienciaHora, setAudienciaHora }) => {
  return (
    <div>
      <div className="two-columns">
        <div className="form-group">
          <label htmlFor="audienciaData">Data</label>
          <input id="audienciaData" type="date" placeholder="dd/mm/aaaa" value={audienciaData} onChange={(e) => setAudienciaData(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="audienciaHora">Hora</label>
          <input id="audienciaHora" type="time" placeholder="--:--" value={audienciaHora} onChange={(e) => setAudienciaHora(e.target.value)} />
        </div>
      </div>
    </div>
  );
};

export default AudienciaTab;