
import React, { useState } from "react";
import { PlusCircle, Trash2, User, Users } from "lucide-react";
import PersonalInfoFields from "./PersonalInfoFields";
import { Label } from "@/components/ui/label";

interface PersonalInfo {
  nome: string;
  sexo: string;
  estadoCivil: string;
  profissao: string;
  endereco: string;
  dataNascimento: string;
  naturalidade: string;
  filiacaoMae: string;
  filiacaoPai: string;
  rg: string;
  cpf: string;
  celular: string;
  email: string;
  laudoPericial: string;
  relato?: string; // Added for victim and witness testimony
  representacao?: string; // Added for victim representation
}

interface PessoasEnvolvidasTabProps {
  vitimas: PersonalInfo[];
  handleVitimaChange: (index: number, field: string, value: string) => void;
  handleAddVitima: () => void;
  handleRemoveVitima: (index: number) => void;
  testemunhas: PersonalInfo[];
  handleTestemunhaChange: (index: number, field: string, value: string) => void;
  handleAddTestemunha: () => void;
  handleRemoveTestemunha: (index: number) => void;
  autores: PersonalInfo[];
  handleAutorDetalhadoChange: (index: number, field: string, value: string) => void;
  handleAddAutor: () => void;
  handleRemoveAutor: (index: number) => void;
  natureza: string;
}

const PessoasEnvolvidasTab: React.FC<PessoasEnvolvidasTabProps> = ({
  vitimas,
  handleVitimaChange,
  handleAddVitima,
  handleRemoveVitima,
  testemunhas,
  handleTestemunhaChange,
  handleAddTestemunha,
  handleRemoveTestemunha,
  autores,
  handleAutorDetalhadoChange,
  handleAddAutor,
  handleRemoveAutor,
  natureza
}) => {
  // Check if it's a drug consumption case
  const isDrugCase = natureza === "Porte de drogas para consumo";
  const [active, setActive] = useState<'autor' | 'vitimas' | 'testemunhas'>('autor');
  return (
    <div>
      <h2 className="section-title">Pessoas Envolvidas</h2>
      <p className="section-subtitle">Autores, Vítimas e Testemunhas</p>

      <div className={`subtabs ${isDrugCase ? 'two' : 'three'}`}>
        <div className={active === 'autor' ? 'subtab active' : 'subtab'} onClick={() => setActive('autor')}>
          <User className="mr-2 h-4 w-4" /> Autores
        </div>
        {!isDrugCase && (
          <div className={active === 'vitimas' ? 'subtab active' : 'subtab'} onClick={() => setActive('vitimas')}>
            <User className="mr-2 h-4 w-4" /> Vítimas
          </div>
        )}
        <div className={active === 'testemunhas' ? 'subtab active' : 'subtab'} onClick={() => setActive('testemunhas')}>
          <Users className="mr-2 h-4 w-4" /> Testemunhas
        </div>
      </div>

      {active === 'autor' && (
        <div className="form-grid">
          {autores.map((autor, index) => (
            <div key={`autor_${index}`} className="form-group">
              <label>{index === 0 ? 'Autor Principal' : `Autor ${index + 1}`}</label>
              <PersonalInfoFields data={autor} onChangeHandler={handleAutorDetalhadoChange} prefix={`autor_${index}_`} index={index} isAuthor={true} />
              {autores.length > 1 && (
                <div className="form-group" style={{alignItems:'flex-end'}}>
                  <button type="button" className="add-button" onClick={() => handleRemoveAutor(index)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remover
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="form-group" style={{alignItems:'flex-end'}}>
            <button type="button" className="add-button" onClick={handleAddAutor}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar mais Autores
            </button>
          </div>
        </div>
      )}

      {!isDrugCase && active === 'vitimas' && (
        <div className="form-grid">
          {vitimas.map((vitima, index) => (
            <div key={`vitima_${index}`} className="form-group">
              <label>{vitimas.length > 1 ? `Vítima ${index + 1}` : 'Vítima'}</label>
              <PersonalInfoFields data={vitima} onChangeHandler={handleVitimaChange} prefix={`vitima_${index}_`} index={index} isVictim={true} />
              {vitimas.length > 1 && (
                <div className="form-group" style={{alignItems:'flex-end'}}>
                  <button type="button" className="add-button" onClick={() => handleRemoveVitima(index)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remover
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="form-group" style={{alignItems:'flex-end'}}>
            <button type="button" className="add-button" onClick={handleAddVitima}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar mais Vítimas
            </button>
          </div>
        </div>
      )}

      {active === 'testemunhas' && (
        <div className="form-grid">
          {testemunhas.map((testemunha, index) => (
            <div key={`testemunha_${index}`} className="form-group">
              <label>{testemunhas.length > 1 ? `Testemunha ${index + 1}` : 'Testemunha'}</label>
              <PersonalInfoFields data={testemunha} onChangeHandler={handleTestemunhaChange} prefix={`testemunha_${index}_`} index={index} isWitness={true} />
              {testemunhas.length > 1 && (
                <div className="form-group" style={{alignItems:'flex-end'}}>
                  <button type="button" className="add-button" onClick={() => handleRemoveTestemunha(index)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remover
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="form-group" style={{alignItems:'flex-end'}}>
            <button type="button" className="add-button" onClick={handleAddTestemunha}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar mais Testemunhas
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PessoasEnvolvidasTab;
