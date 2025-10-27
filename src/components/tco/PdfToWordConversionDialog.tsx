import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
interface PdfToWordConversionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}
const PdfToWordConversionDialog: React.FC<PdfToWordConversionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[450px] w-[90%] rounded-xl bg-white p-8 shadow-2xl border-0 animate-in zoom-in-95 duration-300">
        {/* Close button */}
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center space-y-6">
          {/* Conversion Icons */}
          <div className="flex items-center justify-center gap-4">
            <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg bg-gradient-to-br from-red-500 to-red-700">
              PDF
            </div>
            <div className="text-green-500 text-3xl font-bold animate-pulse">
              →
            </div>
            <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg bg-gradient-to-br from-blue-600 to-blue-800">
              DOC
            </div>
          </div>

          {/* Title */}
          <div className="text-xl font-semibold text-gray-800 mb-3">
            Converter para Word?
          </div>

          {/* Description */}
          <div className="text-gray-600 leading-relaxed mb-6">Deseja usar o ilovePDF para converter seu arquivo baixado em Word?</div>

          {/* Buttons */}
          <div className="flex gap-3 w-full mt-5">
            <button onClick={onConfirm} className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-5 rounded-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/30">
              Sim, Converter
            </button>
            <button onClick={onClose} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold py-3 px-5 rounded-lg border-2 border-gray-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200/50">
              Não, Obrigado
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};
export default PdfToWordConversionDialog;