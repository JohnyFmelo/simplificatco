import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadTcoDocx } from "@/lib/WordTCO";

interface FotoItem {
  id: string;
  url: string;
  storagePath: string;
  name: string;
}

interface ArquivosTabProps {
  fotos: FotoItem[];
  onAddFotos: (files: File[]) => void;
  onRemoveFoto: (id: string) => void;
  cr: string;
  unidade: string;
  // Novas props para geração do DOCX
  tcoNumber: string;
  natureza: string;
  autoresNomes: string[];
  condutor?: { nome: string; posto: string; rg: string };
  localRegistro: string;
  municipio: string;
}

const ArquivosTab: React.FC<ArquivosTabProps> = ({ fotos, onAddFotos, onRemoveFoto, cr, unidade, tcoNumber, natureza, autoresNomes, condutor, localRegistro, municipio }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onAddFotos(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (id: string) => onRemoveFoto(id);
  const handleDownloadWord = () => {
    downloadTcoDocx({
      unidade,
      cr,
      tcoNumber,
      natureza,
      autoresNomes,
      condutor,
      localRegistro,
      municipio,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Arquivos e Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white"
              />
              <span className="text-sm text-muted-foreground">Máx. 5 fotos</span>
              <Button variant="outline" onClick={handleDownloadWord}>Baixar TCO</Button>
            </div>

            {fotos.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Fotos anexadas: {fotos.length}/5</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {fotos.map((foto) => (
                    <div key={foto.id} className="group relative border rounded-md overflow-hidden">
                      {/* Preview */}
                      <img
                        src={foto.url}
                        alt={foto.name}
                        className="h-32 w-full object-cover"
                      />
                      {/* Actions */}
                      <div className="absolute inset-0 hidden group-hover:flex items-end justify-end p-2">
                        <Button variant="destructive" size="sm" onClick={() => handleRemove(foto.id)}>Remover</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArquivosTab;