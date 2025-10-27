import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

// << CORREÇÃO: Interface para uma única droga. Deve ser a mesma usada no TCOForm. >>
interface Droga {
  id: string;
  quantidade: string;
  substancia: string;
  cor: string;
  odor: string;
  indicios: string;
  isUnknownMaterial: boolean;
  customMaterialDesc: string;
}

// << CORREÇÃO: As props foram completamente redefinidas para um modelo controlado. >>
interface DrugVerificationTabProps {
  // Estado do formulário para adicionar uma NOVA droga
  novaDroga: Omit<Droga, 'id'>;
  // Função para atualizar o formulário de nova droga no componente pai
  onNovaDrogaChange: (field: keyof Omit<Droga, 'id'>, value: string | boolean) => void;
  // Função para adicionar a nova droga à lista no componente pai
  onAdicionarDroga: () => void;
  // A lista de drogas já adicionadas, vinda do componente pai
  drogasAdicionadas: Droga[];
  // Função para remover uma droga da lista no componente pai
  onRemoverDroga: (id: string) => void;
  // Estado para o número do lacre, que é único para todas as drogas
  lacreNumero: string;
  setLacreNumero: (value: string) => void;
  // Estado para o número de requisição
  numeroRequisicao: string;
  setNumeroRequisicao: (value: string) => void;
}

const DrugVerificationTab: React.FC<DrugVerificationTabProps> = ({
  novaDroga,
  onNovaDrogaChange,
  onAdicionarDroga,
  drogasAdicionadas,
  onRemoverDroga,
  lacreNumero,
  setLacreNumero,
  numeroRequisicao,
  setNumeroRequisicao,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Constatação Preliminar de Droga</CardTitle>
        <CardDescription>
          Adicione um ou mais tipos de substâncias apreendidas. O número do lacre é único para o conjunto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* --- FORMULÁRIO PARA ADICIONAR UMA NOVA DROGA --- */}
        <div className="border border-dashed rounded-lg p-4 space-y-4">
          <h4 className="font-semibold text-lg">Adicionar Nova Substância</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nova-quantidade">Porção (quantidade) *</Label>
              <Input
                id="nova-quantidade"
                placeholder="Ex: 1 porção"
                value={novaDroga.quantidade}
                onChange={e => onNovaDrogaChange('quantidade', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nova-substancia">Tipo de Substância *</Label>
              <Select
                value={novaDroga.substancia}
                onValueChange={(value) => onNovaDrogaChange('substancia', value)}
              >
                <SelectTrigger id="nova-substancia">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vegetal">Vegetal</SelectItem>
                  <SelectItem value="Artificial">Artificial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nova-cor">Cor *</Label>
              <Select
                value={novaDroga.cor}
                onValueChange={(value) => onNovaDrogaChange('cor', value)}
              >
                <SelectTrigger id="nova-cor">
                  <SelectValue placeholder="Selecione a cor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Verde">Verde</SelectItem>
                  <SelectItem value="Amarelada">Amarelada</SelectItem>
                  <SelectItem value="Branca">Branca</SelectItem>
                  <SelectItem value="Outra">Outra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nova-odor">Odor *</Label>
              <Select
                value={novaDroga.odor}
                onValueChange={(value) => onNovaDrogaChange('odor', value)}
              >
                <SelectTrigger id="nova-odor">
                  <SelectValue placeholder="Selecione o odor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Característico">Característico</SelectItem>
                  <SelectItem value="Forte">Forte</SelectItem>
                  <SelectItem value="Suave">Suave</SelectItem>
                  <SelectItem value="Inodoro">Inodoro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="nova-indicios">Indícios (Preenchido automaticamente)</Label>
            <Input
              id="nova-indicios"
              value={novaDroga.indicios}
              readOnly
              className="bg-gray-100"
            />
          </div>

          {novaDroga.isUnknownMaterial && (
            <div>
              <Label htmlFor="nova-customMaterialDesc">Descrição do Material Não Identificado*</Label>
              <Textarea
                id="nova-customMaterialDesc"
                placeholder="Descreva o material encontrado, pois não corresponde a um tipo padrão."
                value={novaDroga.customMaterialDesc}
                onChange={e => onNovaDrogaChange('customMaterialDesc', e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={onAdicionarDroga}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar à Lista
            </Button>
          </div>
        </div>
        
        {/* --- LISTA DE DROGAS JÁ ADICIONADAS --- */}
        {drogasAdicionadas.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-lg border-t pt-4">Substâncias na Apreensão</h4>
            {drogasAdicionadas.map((drug, index) => (
              <div key={drug.id} className="border rounded-lg p-3 bg-gray-50 flex items-center justify-between gap-4">
                <div className="flex-grow">
                  <p className="font-medium">
                    <span className="text-blue-600 font-bold">{index + 1}.</span> {drug.indicios}
                  </p>
                  <p className="text-sm text-gray-600 ml-5">
                    ({drug.quantidade} de substância {drug.substancia.toLowerCase()} de cor {drug.cor.toLowerCase()})
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoverDroga(drug.id)}
                  className="text-red-500 hover:bg-red-100 hover:text-red-600 flex-shrink-0"
                  aria-label={`Remover ${drug.indicios}`}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* --- CAMPO DO NÚMERO DE REQUISIÇÃO --- */}
        <div className="border-t pt-6">
          <Label htmlFor="numeroRequisicao" className="text-base font-semibold">Número de Requisição *</Label>
          <Input
            id="numeroRequisicao"
            placeholder="Somente o n° Ex: 119"
            value={numeroRequisicao}
            onChange={e => setNumeroRequisicao(e.target.value)}
            className="mt-2 text-lg"
          />
        </div>

        {/* --- CAMPO DO NÚMERO DO LACRE --- */}
        <div className="border-t pt-6">
          <Label htmlFor="lacreNumero" className="text-base font-semibold">Número do Lacre (único para todas as drogas) *</Label>
          <Input
            id="lacreNumero"
            placeholder="Informe o número do lacre (ex: 12345678)"
            value={lacreNumero}
            onChange={e => setLacreNumero(e.target.value)}
            className="mt-2 text-lg"
          />
        </div>

      </CardContent>
    </Card>
  );
};

export default DrugVerificationTab;
