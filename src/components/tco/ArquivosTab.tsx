import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const ArquivosTab: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Arquivos</CardTitle>
        <CardDescription>Anexe documentos, imagens ou vídeos relacionados ao TCO.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="files" className="text-sm font-medium">Selecionar arquivos</label>
          <Input id="files" type="file" multiple className="mt-2" />
          <p className="text-xs text-muted-foreground mt-1">Suporte básico de seleção de arquivos. A integração com armazenamento será adicionada posteriormente.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArquivosTab;