import React, { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
  autoresDetalhados?: Array<{ nome: string; relato?: string }>;
  relatoPolicial?: string;
  conclusaoPolicial?: string;
  providencias?: string;
  documentosAnexos?: string;
  condutor?: { nome: string; posto: string; rg: string };
  localRegistro: string;
  municipio: string;
  tipificacao?: string;
  dataFato?: string;
  horaFato?: string;
  dataInicioRegistro?: string;
  horaInicioRegistro?: string;
  dataTerminoRegistro?: string;
  horaTerminoRegistro?: string;
  localFato?: string;
  endereco?: string;
  comunicante?: string;
  testemunhas?: Array<{ nome: string; sexo: string; estadoCivil: string; profissao: string; endereco: string; dataNascimento: string; naturalidade: string; filiacaoMae: string; filiacaoPai: string; rg: string; cpf: string; celular: string; email: string; semCpf?: string; }>;
  vitimas?: Array<{ nome: string; sexo: string; estadoCivil: string; profissao: string; endereco: string; dataNascimento: string; naturalidade: string; filiacaoMae: string; filiacaoPai: string; rg: string; cpf: string; celular: string; email: string; semCpf?: string; }>;
}

const ArquivosTab: React.FC<ArquivosTabProps> = ({ fotos, onAddFotos, onRemoveFoto }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [captionsById, setCaptionsById] = useState<Record<string, string>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImgSrc, setLightboxImgSrc] = useState("");
  const [lightboxCaption, setLightboxCaption] = useState("");

  const MAX_PHOTOS = 20;
  const MAX_SIZE = 5 * 1024 * 1024;
  const canAddMore = useMemo(() => fotos.length < MAX_PHOTOS, [fotos.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const withinLimit = files.filter(f => f.size <= MAX_SIZE && f.type.startsWith("image/"));
    const overSize = files.filter(f => f.size > MAX_SIZE);
    if (overSize.length) {
      toast({ variant: "destructive", title: "Arquivo grande", description: `Algumas fotos excedem 5MB e foram ignoradas.` });
    }
    const capacidade = MAX_PHOTOS - fotos.length;
    if (capacidade <= 0) {
      toast({ variant: "default", title: "Limite atingido", description: `Máximo de ${MAX_PHOTOS} fotos.` });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const selecionadas = withinLimit.slice(0, capacidade);
    setProgress(25);
    onAddFotos(selecionadas);
    setTimeout(() => setProgress(100), 200);
    setTimeout(() => setProgress(0), 800);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (id: string) => onRemoveFoto(id);

  const onOpenLightbox = (id: string, src: string) => {
    setLightboxImgSrc(src);
    setLightboxCaption(captionsById[id] || "Sem legenda");
    setLightboxOpen(true);
  };

  const onCloseLightbox = () => setLightboxOpen(false);

  const onDropFiles: React.DragEventHandler<HTMLLabelElement> = (ev) => {
    ev.preventDefault();
    setDragOver(false);
    const files = Array.from(ev.dataTransfer.files || []);
    if (!files.length) return;
    const withinLimit = files.filter(f => f.size <= MAX_SIZE && f.type.startsWith("image/"));
    const capacidade = MAX_PHOTOS - fotos.length;
    if (capacidade <= 0) {
      toast({ variant: "default", title: "Limite atingido", description: `Máximo de ${MAX_PHOTOS} fotos.` });
      return;
    }
    const selecionadas = withinLimit.slice(0, capacidade);
    setProgress(25);
    onAddFotos(selecionadas);
    setTimeout(() => setProgress(100), 200);
    setTimeout(() => setProgress(0), 800);
  };

  return (
    <div>
      <h2 className="section-title">Fotos da Ocorrência</h2>
      <p className="section-subtitle">Anexe imagens do local, objetos ou envolvidos</p>

        <label htmlFor="file-input-fotos" className={`upload-zone${dragOver ? " dragover" : ""}`} onClick={() => inputRef.current?.click()} onDragEnter={ev => { ev.preventDefault(); setDragOver(true); }} onDragOver={ev => { ev.preventDefault(); setDragOver(true); }} onDragLeave={ev => { ev.preventDefault(); setDragOver(false); }} onDrop={onDropFiles}>
          <div className="upload-icon">
            <i className="fas fa-camera"></i>
          </div>
          <div className="upload-title">Arraste as fotos aqui ou clique para selecionar</div>
          <div className="upload-info">Formatos: JPG, PNG, WEBP • Máx. 5MB por foto</div>
          <div className="upload-progress" style={{ width: `${progress}%` }} />
        </label>
        <input ref={inputRef} id="file-input-fotos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileChange} style={{ display: "none" }} />

        <div className="photo-stats">
          <span id="photo-count">{fotos.length} foto(s) adicionada(s)</span>
        </div>

        <div className="gallery" id="gallery">
          {fotos.map((foto) => (
            <div className="photo-card" key={foto.id} data-id={foto.id}>
              <img src={foto.url} className="photo-img" alt={foto.name} onClick={() => onOpenLightbox(foto.id, foto.url)} />
              <div className="photo-body">
                <div className="photo-label">Legenda *</div>
                <input type="text" className="photo-caption" placeholder="Ex: Local do fato, objeto apreendido..." value={captionsById[foto.id] || ""} onChange={e => setCaptionsById(prev => ({ ...prev, [foto.id]: e.target.value }))} />
              </div>
              <div className="photo-footer">
                <button className="btn-remove" title="Remover" onClick={() => handleRemove(foto.id)}>
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          ))}
        </div>

      {lightboxOpen && (
        <div className="lightbox active" onClick={e => { if (e.currentTarget === e.target) onCloseLightbox(); }}>
          <button className="lightbox-close" onClick={onCloseLightbox}>×</button>
          <div className="lightbox-content">
            <img src={lightboxImgSrc} alt="Foto ampliada" className="lightbox-img" />
            <div className="lightbox-caption">{lightboxCaption}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArquivosTab;