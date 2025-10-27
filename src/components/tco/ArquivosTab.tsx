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
}

const ArquivosTab: React.FC<ArquivosTabProps> = ({ fotos, onAddFotos, onRemoveFoto, cr, unidade }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    onAddFotos(files);
    // Clear input value to allow re-selecting the same file later
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (id: string) => onRemoveFoto(id);
  const handleDownloadWord = () => {
    // ...existing code ...
    downloadTcoDocx(unidade, cr);
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
                      <div className="absolute inset-x-0 bottom-0 flex justify-between p-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={foto.url} target="_blank" rel="noreferrer" className="text-xs text-white underline">Abrir</a>
                        <Button variant="destructive" size="xs" onClick={() => handleRemove(foto.id)}>Excluir</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fotos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma foto anexada ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArquivosTab;