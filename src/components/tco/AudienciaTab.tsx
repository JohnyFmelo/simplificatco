import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface AudienciaTabProps {
  audienciaData: string;
  setAudienciaData: (val: string) => void;
  audienciaHora: string;
  setAudienciaHora: (val: string) => void;
}

const AudienciaTab: React.FC<AudienciaTabProps> = ({ audienciaData, setAudienciaData, audienciaHora, setAudienciaHora }) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dados da Audiência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="audienciaData">Data</Label>
              <Input
                id="audienciaData"
                type="date"
                placeholder="dd/mm/aaaa"
                value={audienciaData}
                onChange={(e) => setAudienciaData(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="audienciaHora">Hora</Label>
              <Input
                id="audienciaHora"
                type="time"
                placeholder="--:--"
                value={audienciaHora}
                onChange={(e) => setAudienciaHora(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AudienciaTab;