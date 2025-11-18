import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface GeneralInformationTabProps {
  natureza: string;
  tipificacao: string;
  setTipificacao: (value: string) => void;
  isCustomNatureza: boolean;
  customNatureza: string;
  dataFato: string;
  setDataFato: (value: string) => void;
  horaFato: string;
  setHoraFato: (value: string) => void;
  dataInicioRegistro: string;
  setDataInicioRegistro: (value: string) => void;
  horaInicioRegistro: string;
  setHoraInicioRegistro: (value: string) => void;
  dataTerminoRegistro: string;
  setDataTerminoRegistro: (value: string) => void;
  horaTerminoRegistro: string;
  setHoraTerminoRegistro: (value: string) => void;
  localFato: string;
  setLocalFato: (value: string) => void;
  endereco: string;
  setEndereco: (value: string) => void;
  municipio: string;
  setMunicipio: (value: string) => void;
  comunicante: string;
  setComunicante: (value: string) => void;
  guarnicao: string;
  setGuarnicao: (value: string) => void;
  operacao: string;
  setOperacao: (value: string) => void;
  // << NOTA: As props do condutor permanecem, mas os campos serão ocultos >>
  condutorNome: string;
  condutorPosto: string;
  condutorRg: string;
}

// Mapeamento de naturezas para tipificações
const naturezaTipificacoes: Record<string, string> = {
  "Ameaça": "ART. 147 DO CÓDIGO PENAL",
  "Vias de Fato": "ART. 21 DA LEI DE CONTRAVENÇÕES PENAIS",
  "Lesão Corporal": "ART. 129 DO CÓDIGO PENAL",
  "Dano": "ART. 163 DO CÓDIGO PENAL",
  "Injúria": "ART. 140 DO CÓDIGO PENAL",
  "Difamação": "ART. 139 DO CÓDIGO PENAL",
  "Calúnia": "ART. 138 DO CÓDIGO PENAL",
  "Perturbação do Sossego": "ART. 42 DA LEI DE CONTRAVENÇÕES PENAIS",
  "Porte de drogas para consumo": "ART. 28 DA LEI Nº 11.343/2006 (LEI DE DROGAS)",
  "Conduzir veículo sem CNH gerando perigo de dano": "ART. 309 DO CÓDIGO DE TRÂNSITO BRASILEIRO",
  "Entregar veículo automotor a pessoa não habilitada": "ART. 310 DO CÓDIGO DE TRÂNSITO BRASILEIRO",
  "Trafegar em velocidade incompatível com segurança": "ART. 311 DO CÓDIGO DE TRÂNSITO BRASILEIRO",
  "Omissão de socorro": "ART. 135 DO CÓDIGO PENAL",
  "Rixa": "ART. 137 DO CÓDIGO PENAL",
  "Invasão de domicílio": "ART. 150 DO CÓDIGO PENAL",
  "Fraude em comércio": "ART. 176 DO CÓDIGO PENAL",
  "Ato obsceno": "ART. 233 DO CÓDIGO PENAL",
  "Falsa identidade": "ART. 307 DO CÓDIGO PENAL",
  "Resistência": "ART. 329 DO CÓDIGO PENAL",
  "Desobediência": "ART. 330 DO CÓDIGO PENAL",
  "Desacato": "ART. 331 DO CÓDIGO PENAL",
  "Exercício arbitrário das próprias razões": "ART. 345 DO CÓDIGO PENAL"
};
const LOCAL_CATEGORIAS = [
  "Via pública",
  "Residência",
  "Estabelecimento comercial",
  "Escola",
  "Praça/Parque",
  "Rodovia/Estrada",
  "Interior de veículo",
  "Área rural",
  "Condomínio",
  "Evento/Festa",
  "Outros",
];
const LOCAL_SUBTIPOS: Record<string, string[]> = {
  "Via pública": ["Rua", "Avenida", "Travessa", "Alameda", "Praça", "Estrada", "Rodovia"],
  "Residência": ["Casa", "Apartamento", "Kitnet", "Garagem", "Quintal"],
  "Estabelecimento comercial": ["Loja", "Mercado/Supermercado", "Farmácia", "Posto de combustível", "Restaurante", "Bar"],
  "Escola": ["Sala de aula", "Pátio", "Entrada", "Quadra"],
  "Praça/Parque": ["Praça", "Parque"],
  "Rodovia/Estrada": ["Rodovia", "Estrada vicinal"],
  "Interior de veículo": ["Carro", "Moto", "Ônibus", "Caminhão"],
  "Área rural": ["Sítio", "Fazenda", "Chácara"],
  "Condomínio": ["Área comum", "Portaria", "Garagem"],
  "Evento/Festa": ["Residencial", "Pública"],
  "Outros": [],
};
const GeneralInformationTab: React.FC<GeneralInformationTabProps> = ({
  natureza,
  tipificacao,
  setTipificacao,
  isCustomNatureza,
  customNatureza,
  dataFato,
  setDataFato,
  horaFato,
  setHoraFato,
  dataInicioRegistro,
  setDataInicioRegistro,
  horaInicioRegistro,
  setHoraInicioRegistro,
  dataTerminoRegistro,
  setDataTerminoRegistro,
  horaTerminoRegistro,
  setHoraTerminoRegistro,
  localFato,
  setLocalFato,
  endereco,
  setEndereco,
  municipio,
  setMunicipio,
  comunicante,
  setComunicante,
  guarnicao,
  setGuarnicao,
  operacao,
  setOperacao,
  condutorNome,
  condutorPosto,
  condutorRg
}) => {
  // Campo livre: remover estados internos do seletor anterior
  // (sem estados auxiliares; o valor é controlado diretamente por localFato)

  const [cep, setCep] = useState<string>("");
  const [cepStatus, setCepStatus] = useState<string>("");

  const buscarEndereco = async () => {
    const nums = cep.replace(/\D/g, "");
    if (nums.length !== 8) {
      setCepStatus("Informe 8 dígitos.");
      return;
    }
    try {
      setCepStatus("Buscando...");
      const resp = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
      const data = await resp.json();
      if (data?.erro) {
        setCepStatus("CEP não encontrado.");
        return;
      }
      const enderecoCompleto = [data.logradouro, data.bairro].filter(Boolean).join(", ");
      const cepMask = cep;
      if (enderecoCompleto) setEndereco(`${enderecoCompleto}${cepMask ? `, CEP ${cepMask}` : ""}`);
      if (data.localidade) setMunicipio(data.localidade);
      setCepStatus(`CEP: ${data.cep} • ${data.logradouro} • ${data.bairro}`);
    } catch {
      setCepStatus("Erro ao buscar CEP.");
    }
  };

  const getTipificacaoCompleta = () => {
    if (!natureza) return "";
    if (isCustomNatureza) {
      return tipificacao || "[TIPIFICAÇÃO LEGAL A SER INSERIDA]";
    }
    const naturezas = natureza.split(" + ");
    const tipificacoes = naturezas.map(nat => {
      return naturezaTipificacoes[nat.trim()] || "[TIPIFICAÇÃO NÃO MAPEADA]";
    });
    if (tipificacoes.length === 1) {
      return tipificacoes[0];
    } else if (tipificacoes.length === 2) {
      return tipificacoes.join(" E ");
    } else if (tipificacoes.length > 2) {
      const ultimoItem = tipificacoes.pop();
      return tipificacoes.join(", ") + " E " + ultimoItem;
    }
    return "";
  };

  // Atualizar tipificação automaticamente quando natureza mudar
  useEffect(() => {
    if (!isCustomNatureza && natureza) {
      const naturezas = natureza.split(" + ");
      const tipificacoes = naturezas.map(nat => {
        return naturezaTipificacoes[nat.trim()] || "[TIPIFICAÇÃO NÃO MAPEADA]";
      });
      
      let tipificacaoGerada = "";
      if (tipificacoes.length === 1) {
        tipificacaoGerada = tipificacoes[0];
      } else if (tipificacoes.length === 2) {
        tipificacaoGerada = tipificacoes.join(" E ");
      } else if (tipificacoes.length > 2) {
        const ultimoItem = tipificacoes.pop();
        tipificacaoGerada = tipificacoes.join(", ") + " E " + ultimoItem;
      }
      
      if (tipificacaoGerada && tipificacaoGerada !== tipificacao) {
        setTipificacao(tipificacaoGerada);
      }
    }
  }, [natureza, isCustomNatureza, tipificacao, setTipificacao]);

  return (
    <div>
      <div className="form-grid">
        

        <div className="two-columns">
          <div className="form-group">
            <label>Data do Fato <span className="required">*</span></label>
            <Input type="text" inputMode="numeric" placeholder="dd/mm/aaaa" value={dataFato} onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0,8);
              const dd = v.slice(0,2);
              const mm = v.slice(2,4);
              const yyyy = v.slice(4,8);
              const formatted = [dd, mm, yyyy].filter(Boolean).join('/');
              setDataFato(formatted);
            }} />
          </div>
          <div className="form-group">
            <label>Hora do Fato <span className="required">*</span></label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="hh:mm"
              value={horaFato}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0,4);
                const hh = v.slice(0,2);
                const mm = v.slice(2,4);
                const formatted = [hh, mm].filter(Boolean).join(':');
                setHoraFato(formatted);
              }}
              onBlur={e => {
                const m = e.target.value.match(/^(\d{2}):(\d{2})$/);
                if (!m) return;
                let h = parseInt(m[1], 10);
                let mi = parseInt(m[2], 10);
                if (isNaN(h) || isNaN(mi)) return;
                if (h > 23) h = 23;
                if (mi > 59) mi = 59;
                const s = `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`;
                setHoraFato(s);
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Local do Fato <span className="required">*</span></label>
          <Input className="input-hint" placeholder="Ex.: Rua, Casa, Loja, Escola..." value={localFato} onChange={e => setLocalFato(e.target.value)} />
          <small className="field-hint">Informe o tipo de local (ex: rua, casa, loja). Não é endereço.</small>
        </div>

        <div className="two-columns cep-address">
          <div className="form-group">
            <label>Buscar por CEP</label>
            <div className="input-row">
              <Input
                className="cep-input"
                placeholder="Ex: 78118-007"
                inputMode="numeric"
                value={cep}
                onChange={e => {
                  const nums = e.target.value.replace(/\D/g, '').slice(0,8);
                  const masked = nums.length > 5 ? `${nums.slice(0,5)}-${nums.slice(5)}` : nums;
                  setCep(masked);
                }}
                onKeyDown={e => { if (e.key === 'Enter') buscarEndereco(); }}
              />
              <button type="button" className="icon-button" onClick={buscarEndereco} aria-label="Buscar CEP"><i className="fas fa-search"></i></button>
            </div>
            {cepStatus && <small className="field-hint">{cepStatus}</small>}
          </div>

          <div className="form-group">
            <label>Endereço Completo <span className="required">*</span></label>
            <Input className="address-input" placeholder="Rua, número, bairro..." value={endereco} onChange={e => setEndereco(e.target.value)} />
          </div>
        </div>

        <div className="four-columns">
          <div className="form-group">
            <label>Município</label>
            <Input readOnly value={municipio} />
          </div>
          <div className="form-group">
            <label>Placa da VTR <span className="required">*</span></label>
            <Input placeholder="Ex: ABC1D23" maxLength={7} value={guarnicao} onChange={e => setGuarnicao(e.target.value.toUpperCase())} />
            <small className="field-hint">Digite apenas a placa da viatura (ex: ABC1D23).</small>
          </div>
          <div className="form-group">
            <label>Comunicante <span className="required">*</span></label>
            <select className="select-full" value={comunicante} onChange={e => setComunicante(e.target.value)}>
              <option value="">Selecione o comunicante</option>
              <option value="COPOM">COPOM</option>
              <option value="CIOSP">CIOSP</option>
              <option value="Adjunto">Adjunto</option>
              <option value="Oficial de Área">Oficial de Área</option>
              <option value="Patrulhamento">Patrulhamento</option>
              <option value="Populares">Populares</option>
              <option value="Guarda">Guarda</option>
            </select>
          </div>
          <div className="form-group">
            <label>Operação (Opcional)</label>
            <Input placeholder="Ex: Operação Saturação, Operação Cidade Segura..." value={operacao} onChange={e => setOperacao(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralInformationTab;
