import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
            <Input
              id="juizadoData"
              type="date"
              lang="pt-BR"
              value={juizadoEspecialData}
              onChange={(e) => setJuizadoEspecialData(e.target.value)}
            />
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