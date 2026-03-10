import React, { useCallback, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, FileText, MoreHorizontal, RefreshCw, Trash2, FileEdit, Users } from "lucide-react";
import { format } from "date-fns";
import { useToast as useShadcnToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PdfToWordConversionDialog from "./PdfToWordConversionDialog";
import { r2ListTcos, r2GetDownloadUrl, r2DeleteTco } from "@/lib/r2Storage";

export interface TCOmeusProps {
  user: {
    id: string;
    registration?: string;
    userType?: string;
  };
  toast: ReturnType<typeof useShadcnToast>["toast"];
  setSelectedTco: (tco: TcoData | null) => void;
  selectedTco: TcoData | null;
}

export interface TcoData {
  id: string;
  tcoNumber: string;
  createdAt: Date;
  natureza: string;
  fileKey: string;
  docxKey?: string;
  fileName: string;
  userId: string;
  condutor?: { nome: string; graduacao?: string; rgpm?: string };
  equipe?: { nome: string; graduacao?: string; rgpm?: string }[];
}

export const extractTcoDisplayNumber = (fullTcoNumber: string | undefined | null): string => {
  if (!fullTcoNumber) return "-";
  let numberPart = "";
  const match = fullTcoNumber.match(/^TCO[-_]([^_-]+)/i);
  if (match && match[1]) numberPart = match[1];
  else if (fullTcoNumber.toUpperCase().startsWith("TCO-")) numberPart = fullTcoNumber.substring(4);
  else return fullTcoNumber;
  if (numberPart) {
    const num = parseInt(numberPart, 10);
    if (!isNaN(num)) return String(num).padStart(2, "0");
    return numberPart;
  }
  return "-";
};

const TCOmeus: React.FC<TCOmeusProps> = ({ user, toast, setSelectedTco, selectedTco }) => {
  const [tcoList, setTcoList] = useState<TcoData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tcoToDelete, setTcoToDelete] = useState<TcoData | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletionMessage, setDeletionMessage] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState<string | null>(null);
  const [isConversionDialogOpen, setIsConversionDialogOpen] = useState(false);
  const [pendingTcoForConversion, setPendingTcoForConversion] = useState<TcoData | null>(null);

  const fetchAllTcos = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await r2ListTcos(user.id);
      const mapped: TcoData[] = items.map((item: any) => ({
        id: item.docxKey || item.tcoNumber || crypto.randomUUID(),
        tcoNumber: item.tcoNumber || "TCO-??",
        createdAt: new Date(item.savedAt || Date.now()),
        natureza: item.natureza || "Não especificada",
        fileKey: item.docxKey || "",
        docxKey: item.docxKey || "",
        fileName: (item.docxKey || "").split("/").pop() || "arquivo.docx",
        userId: user.id,
        condutor: item.condutor || undefined,
        equipe: item.equipe || undefined,
      }));
      mapped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setTcoList(mapped);
    } catch (error) {
      console.error("Erro ao buscar TCOs:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar os TCOs." });
    } finally {
      setIsLoading(false);
    }
  }, [user.id, toast]);

  useEffect(() => {
    fetchAllTcos();
    const interval = setInterval(fetchAllTcos, 30000);
    return () => clearInterval(interval);
  }, [fetchAllTcos]);

  const confirmDelete = (tco: TcoData) => {
    if (tco.userId !== user.id && user.userType !== "admin") {
      toast({ variant: "destructive", title: "Acesso Negado", description: "Você só pode excluir seus próprios TCOs." });
      return;
    }
    setTcoToDelete(tco);
    setDeletionMessage(null);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTco = async () => {
    if (!tcoToDelete) return;
    setIsDeleting(true);
    setDeletionMessage("Excluindo...");
    try {
      await r2DeleteTco(tcoToDelete.fileKey);
      setTcoList((prev) => prev.filter((item) => item.id !== tcoToDelete.id));
      if (selectedTco?.id === tcoToDelete.id) setSelectedTco(null);
      toast({ title: "TCO Excluído", description: "O TCO foi removido com sucesso." });
    } catch (error) {
      console.error("Erro ao excluir TCO:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao excluir o TCO." });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setTcoToDelete(null);
      setDeletionMessage(null);
    }
  };

  const handleViewPdf = async (tco: TcoData) => {
    try {
      const url = await r2GetDownloadUrl(tco.fileKey);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Erro ao visualizar:", error);
      toast({ variant: "destructive", title: "Erro ao Visualizar", description: "Falha ao preparar o arquivo." });
    }
  };

  const handleDownloadPdf = async (tco: TcoData) => {
    try {
      const url = await r2GetDownloadUrl(tco.fileKey);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Download falhou");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = tco.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
      setPendingTcoForConversion(tco);
      setIsConversionDialogOpen(true);
    } catch (error) {
      console.error("Erro ao baixar:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao baixar o arquivo." });
    }
  };

  const handleConvertToWord = async (tco: TcoData) => {
    window.open("https://www.ilovepdf.com/pt/pdf_para_word", "_blank");
    toast({ title: "Redirecionamento", description: "Você foi redirecionado para o iLovePDF." });
  };

  const handleCloseConversionDialog = () => {
    setIsConversionDialogOpen(false);
    setPendingTcoForConversion(null);
  };

  const handleConfirmConversion = () => {
    if (pendingTcoForConversion) {
      window.open("https://www.ilovepdf.com/pt/pdf_para_word", "_blank");
    }
    handleCloseConversionDialog();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 flex-grow overflow-hidden flex flex-col py-0 px-[6px] my-[12px]">
      {isLoading && tcoList.length === 0 ? (
        <div className="space-y-4 animate-pulse p-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-lg w-full"></div>
          ))}
        </div>
      ) : tcoList.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 flex-grow bg-gray-50 rounded-lg">
          <FileText className="h-16 w-16 text-gray-400 mb-6" strokeWidth={1} />
          <p className="text-xl font-semibold text-center mb-2">Nenhum TCO encontrado</p>
          <p className="text-center text-sm text-gray-400 max-w-xs">
            Os TCOs registrados no sistema aparecerão listados aqui.
          </p>
        </div>
      ) : (
        <div className="flex-grow overflow-hidden flex flex-col px-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto flex-grow rounded-lg border border-gray-200">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-100 transition-colors">
                  <TableHead className="w-[100px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Natureza</TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tcoList.map((tco) => {
                  const canDelete = tco.userId === user.id || user.userType === "admin";
                  const isCurrentlyConverting = isConverting === tco.id;
                  return (
                    <TableRow
                      key={tco.id}
                      aria-selected={selectedTco?.id === tco.id}
                      className={`cursor-pointer transition-colors duration-150 ease-in-out hover:bg-slate-50 ${selectedTco?.id === tco.id ? "bg-primary/10 hover:bg-primary/20" : ""}`}
                      onClick={() => setSelectedTco(tco)}
                    >
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-sm font-medium bg-blue-50 text-blue-700 border-blue-300">
                          {extractTcoDisplayNumber(tco.tcoNumber)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {tco.createdAt ? format(tco.createdAt, "dd/MM/yyyy - HH:mm") : "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={tco.natureza || "Não especificada"}>
                        {tco.natureza || "Não especificada"}
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} className="h-8 w-8 rounded-full data-[state=open]:bg-slate-100">
                              <MoreHorizontal className="h-5 w-5 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 p-1" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => handleViewPdf(tco)} className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-slate-100 rounded-md">
                              <Eye className="h-4 w-4 text-blue-500" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadPdf(tco)} className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-slate-100 rounded-md">
                              <Download className="h-4 w-4 text-green-500" /> Baixar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleConvertToWord(tco)} disabled={isCurrentlyConverting} className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-slate-100 rounded-md">
                              {isCurrentlyConverting ? <RefreshCw className="h-4 w-4 text-orange-500 animate-spin" /> : <FileEdit className="h-4 w-4 text-orange-500" />}
                              {isCurrentlyConverting ? "Convertendo..." : "Converter p/ Word"}
                            </DropdownMenuItem>
                            {canDelete && (
                              <DropdownMenuItem onClick={() => confirmDelete(tco)} className="flex items-center gap-2 p-2 text-sm cursor-pointer text-red-600 hover:bg-red-50 rounded-md mt-1">
                                <Trash2 className="h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 flex-grow overflow-y-auto p-1">
            {tcoList.map((tco) => {
              const canDelete = tco.userId === user.id || user.userType === "admin";
              const isCurrentlyConverting = isConverting === tco.id;
              return (
                <div
                  key={`card-${tco.id}`}
                  onClick={() => setSelectedTco(tco)}
                  className={`bg-white p-4 rounded-lg border border-gray-200 shadow-sm cursor-pointer transition-all duration-150 ease-in-out ${selectedTco?.id === tco.id ? "ring-2 ring-primary ring-offset-1" : "hover:shadow-md"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-base font-semibold bg-blue-50 text-blue-700 border-blue-300 px-2.5 py-1">
                      TCO {extractTcoDisplayNumber(tco.tcoNumber)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} className="h-8 w-8 -mr-2 -mt-1">
                          <MoreHorizontal className="h-5 w-5 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 p-1" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => handleViewPdf(tco)} className="flex items-center gap-2 p-2 text-sm cursor-pointer">
                          <Eye className="h-4 w-4 text-blue-500" /> Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadPdf(tco)} className="flex items-center gap-2 p-2 text-sm cursor-pointer">
                          <Download className="h-4 w-4 text-green-500" /> Baixar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleConvertToWord(tco)} disabled={isCurrentlyConverting} className="flex items-center gap-2 p-2 text-sm cursor-pointer">
                          {isCurrentlyConverting ? <RefreshCw className="h-4 w-4 text-orange-500 animate-spin" /> : <FileEdit className="h-4 w-4 text-orange-500" />}
                          {isCurrentlyConverting ? "Convertendo..." : "Converter p/ Word"}
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem onClick={() => confirmDelete(tco)} className="flex items-center gap-2 p-2 text-sm cursor-pointer text-red-600">
                            <Trash2 className="h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    {tco.createdAt ? format(tco.createdAt, "dd/MM/yyyy 'às' HH:mm") : "-"}
                  </p>
                  <p className="text-sm font-medium text-gray-800 mb-2 truncate">{tco.natureza || "Não especificada"}</p>
                  {tco.userId === user.id && <Badge variant="secondary" className="text-xs">Seu TCO</Badge>}
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-gray-600 text-sm text-right pr-1 py-0 my-[14px]">
            Total: <span className="font-semibold">{tcoList.length}</span> {tcoList.length === 1 ? "TCO" : "TCOs"}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 pt-2">
              Tem certeza que deseja excluir este TCO? Esta ação não pode ser desfeita.
              {deletionMessage && (
                <div className="mt-3 p-3 bg-blue-50 text-blue-700 rounded-md text-sm border border-blue-200">
                  {deletionMessage}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4 flex-col sm:flex-row">
            <AlertDialogCancel disabled={isDeleting} className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTco} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto">
              {isDeleting ? (
                <div className="flex items-center gap-2 justify-center">
                  <RefreshCw className="animate-spin h-4 w-4" />
                  <span>Excluindo...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <Trash2 className="h-4 w-4" />
                  <span>Confirmar Exclusão</span>
                </div>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF to Word Conversion Dialog */}
      <PdfToWordConversionDialog isOpen={isConversionDialogOpen} onClose={handleCloseConversionDialog} onConfirm={handleConfirmConversion} />
    </div>
  );
};

export default TCOmeus;
